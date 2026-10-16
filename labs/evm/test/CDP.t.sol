// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CDPManager, StableCoin, StabilityPool} from "../src/cdp/CDP.sol";
import {MockOracle} from "../src/lending/LendingPool.sol";
import {MockToken} from "../src/common/ERC20.sol";

contract CDPTest is Test {
    MockToken weth;
    MockOracle oracle;
    CDPManager cdp;
    StableCoin usd;
    StabilityPool sp;
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address saver = makeAddr("saver");
    address keeper = makeAddr("keeper");

    function setUp() public {
        vm.warp(1_700_000_000);
        weth = new MockToken("Wrapped Ether", "WETH", 18);
        oracle = new MockOracle();
        oracle.set(2000e18);
        cdp = new CDPManager(address(weth), oracle, treasury);
        usd = cdp.stable();
        sp = cdp.pool();
    }

    function _open(address who, uint256 coll, uint256 borrow) internal {
        weth.mint(who, coll);
        vm.startPrank(who);
        weth.approve(address(cdp), coll);
        cdp.open(coll, borrow);
        vm.stopPrank();
    }

    function _fundPool(address who, uint256 amount) internal {
        // the saver opens a safe vault and deposits the minted bpUSD
        _open(who, 100e18, amount);
        vm.startPrank(who);
        usd.approve(address(sp), amount);
        sp.deposit(amount);
        vm.stopPrank();
    }

    function test_openMintsWithFeeAndSupplyEqualsDebt() public {
        _open(alice, 10e18, 10_000e18); // $20k collateral, $10k borrow -> CR ~199%
        (uint256 coll, uint256 debt) = cdp.vaults(alice);
        assertEq(coll, 10e18);
        assertEq(debt, 10_050e18);
        assertEq(usd.balanceOf(alice), 10_000e18);
        assertEq(usd.balanceOf(treasury), 50e18);
        assertEq(usd.totalSupply(), cdp.totalDebt());
    }

    function test_cannotOpenBelowMcr() public {
        weth.mint(alice, 1e18);
        vm.startPrank(alice);
        weth.approve(address(cdp), 1e18);
        vm.expectRevert(bytes("BELOW_MCR"));
        cdp.open(1e18, 1_900e18); // $2,000 collateral vs $1,909.5 debt -> 104.7%
        vm.stopPrank();
    }

    function test_closeReturnsCollateral() public {
        _open(alice, 10e18, 10_000e18);
        // alice needs the fee portion too: buy it from the treasury
        vm.prank(treasury);
        usd.transfer(alice, 50e18);
        vm.prank(alice);
        cdp.close();
        assertEq(weth.balanceOf(alice), 10e18);
        assertEq(usd.totalSupply(), 0);
        assertEq(cdp.totalDebt(), 0);
    }

    function test_liquidationPaysStabilityPoolInCollateral() public {
        _fundPool(saver, 20_000e18);
        _open(alice, 6e18, 10_000e18); // CR = 12,000 / 10,050 = 119%
        oracle.set(1800e18); // CR = 10,800 / 10,050 = 107% < 110%

        uint256 poolBefore = sp.totalStable();
        vm.prank(keeper);
        cdp.liquidate(alice);

        assertEq(sp.totalStable(), poolBefore - 10_050e18, "pool burned the debt");
        assertEq(sp.totalCollateral(), 6e18 - 0.03e18, "pool got collateral minus 0.5% reward");
        assertEq(weth.balanceOf(keeper), 0.03e18);
        (uint256 s, uint256 c) = sp.valueOf(saver);
        assertGt(s + (c * 1800e18) / 1e18, 20_000e18, "savers gained: collateral worth more than the debt they absorbed");
        assertEq(usd.totalSupply(), cdp.totalDebt());
    }

    function test_cannotLiquidateHealthy() public {
        _fundPool(saver, 20_000e18);
        _open(alice, 10e18, 10_000e18);
        vm.expectRevert(bytes("HEALTHY"));
        cdp.liquidate(alice);
    }

    function test_redemptionHitsTheRiskiestVaultAtOneDollar() public {
        _open(alice, 10e18, 15_000e18); // CR ~132%  (riskiest)
        _open(bob, 20e18, 10_000e18); // CR ~398%
        vm.prank(bob);
        usd.transfer(keeper, 5_000e18); // keeper bought bpUSD below $1 on a DEX...

        vm.prank(keeper);
        uint256 got = cdp.redeem(5_000e18); // ...and redeems it for $1 of collateral

        assertEq(got, (2.5e18 * 995) / 1000, "5,000 bpUSD / $2,000 = 2.5 WETH minus 0.5%");
        (uint256 aColl, uint256 aDebt) = cdp.vaults(alice);
        assertEq(aDebt, 15_075e18 - 5_000e18, "the riskiest vault's debt was reduced");
        assertEq(aColl, 10e18 - 2.5e18);
        (, uint256 bDebt) = cdp.vaults(bob);
        assertEq(bDebt, 10_050e18, "the safer vault was untouched");
        assertEq(usd.totalSupply(), cdp.totalDebt());
    }

    function test_redemptionClosesFullyRedeemedVaultAndReturnsSurplus() public {
        _open(alice, 1e18, 1_000e18); // debt 1,005, CR ~199%
        _open(bob, 50e18, 20_000e18);
        vm.prank(bob);
        usd.transfer(keeper, 1_005e18);
        vm.prank(keeper);
        cdp.redeem(1_005e18);
        (, uint256 aDebt) = cdp.vaults(alice);
        assertEq(aDebt, 0);
        assertEq(weth.balanceOf(alice), 1e18 - uint256(1_005e18 * 1e18) / 2000e18, "alice keeps her surplus collateral");
        assertEq(cdp.vaultCount(), 1);
    }

    function test_stalePriceBlocksEverything() public {
        _open(alice, 10e18, 10_000e18);
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(bytes("STALE_PRICE"));
        cdp.liquidate(alice);
    }
}

/// Random actions by three users; after every call bpUSD supply must equal total debt and the manager must hold
/// exactly the collateral it accounts for.
contract CDPHandler is Test {
    CDPManager public cdp;
    MockToken public weth;
    MockOracle public oracle;
    address[3] public actors;

    constructor(CDPManager _cdp, MockToken _weth, MockOracle _oracle) {
        cdp = _cdp;
        weth = _weth;
        oracle = _oracle;
        actors = [makeAddr("a1"), makeAddr("a2"), makeAddr("a3")];
    }

    function open(uint256 who, uint256 coll, uint256 borrow) external {
        address a = actors[who % 3];
        (, uint256 d) = cdp.vaults(a);
        if (d > 0) return;
        coll = bound(coll, 1e18, 100e18);
        uint256 px = 2000e18;
        uint256 maxBorrow = (coll * px / 1e18) * 1e18 / 1.12e18;
        if (maxBorrow < 101e18) return;
        borrow = bound(borrow, 100e18, maxBorrow);
        oracle.set(px);
        weth.mint(a, coll);
        vm.startPrank(a);
        weth.approve(address(cdp), coll);
        cdp.open(coll, borrow);
        vm.stopPrank();
    }

    function redeem(uint256 who, uint256 amount) external {
        address a = actors[who % 3];
        StableCoin usd = cdp.stable();
        uint256 bal = usd.balanceOf(a);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        oracle.set(2000e18);
        vm.prank(a);
        try cdp.redeem(amount) {} catch {}
    }

    function close(uint256 who) external {
        address a = actors[who % 3];
        (, uint256 d) = cdp.vaults(a);
        StableCoin usd = cdp.stable();
        if (d == 0 || usd.balanceOf(a) < d) return;
        oracle.set(2000e18);
        vm.prank(a);
        cdp.close();
    }
}

contract CDPInvariantTest is Test {
    CDPManager cdp;
    MockToken weth;
    MockOracle oracle;
    CDPHandler handler;

    function setUp() public {
        vm.warp(1_700_000_000);
        weth = new MockToken("Wrapped Ether", "WETH", 18);
        oracle = new MockOracle();
        oracle.set(2000e18);
        cdp = new CDPManager(address(weth), oracle, makeAddr("treasury"));
        handler = new CDPHandler(cdp, weth, oracle);
        targetContract(address(handler));
    }

    function invariant_supplyEqualsTotalDebt() public view {
        assertEq(cdp.stable().totalSupply(), cdp.totalDebt());
    }

    function invariant_managerHoldsAccountedCollateral() public view {
        assertEq(weth.balanceOf(address(cdp)), cdp.totalColl());
    }
}
