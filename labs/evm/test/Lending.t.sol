// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LendingPool, MockOracle} from "../src/lending/LendingPool.sol";
import {MockToken} from "../src/common/ERC20.sol";

contract LendingTest is Test {
    MockToken usd;
    MockToken eth;
    MockOracle oracle;
    LendingPool pool;
    address supplier = makeAddr("supplier");
    address borrower = makeAddr("borrower");
    address liquidator = makeAddr("liquidator");

    function setUp() public {
        vm.warp(1_700_000_000);
        usd = new MockToken("USD", "USD", 18);
        eth = new MockToken("ETH", "ETH", 18);
        oracle = new MockOracle();
        oracle.set(2000e18); // 1 ETH = 2000 USD
        pool = new LendingPool(address(usd), address(eth), oracle);
    }

    function _supply(address who, uint256 amt) internal {
        usd.mint(who, amt);
        vm.startPrank(who);
        usd.approve(address(pool), amt);
        pool.supply(amt);
        vm.stopPrank();
    }

    function _collateralAndBorrow(address who, uint256 ethAmt, uint256 borrowAmt) internal {
        eth.mint(who, ethAmt);
        vm.startPrank(who);
        eth.approve(address(pool), ethAmt);
        pool.depositCollateral(ethAmt);
        pool.borrow(borrowAmt);
        vm.stopPrank();
    }

    function test_kinkedRateCurve() public view {
        assertEq(pool.borrowRate(0.5e18), 0.025e18); // 4% * 0.5/0.8
        assertEq(pool.borrowRate(0.8e18), 0.04e18); // at the kink
        assertEq(pool.borrowRate(0.9e18), 0.34e18); // 4% + 60% * 0.1/0.2
    }

    function test_interestAccruesAtUtilizationRate() public {
        _supply(supplier, 1_000_000e18);
        _collateralAndBorrow(borrower, 1000e18, 900_000e18); // U = 90% -> 34% APR
        vm.warp(block.timestamp + 365 days);
        oracle.set(2000e18);
        pool.accrue();
        assertApproxEqRel(pool.debtBalance(borrower), 1_206_000e18, 1e12);
        // suppliers earn interest minus the 10% reserve factor
        assertApproxEqRel(pool.supplyBalance(supplier), 1_000_000e18 + 306_000e18 * 9 / 10, 1e12);
        assertApproxEqRel(pool.reserves(), 30_600e18, 1e12);
    }

    function test_cannotBorrowPastLtv() public {
        _supply(supplier, 100_000e18);
        eth.mint(borrower, 10e18); // $20k collateral -> $16k max at 80% LTV
        vm.startPrank(borrower);
        eth.approve(address(pool), 10e18);
        pool.depositCollateral(10e18);
        vm.expectRevert(bytes("WOULD_EXCEED_LTV"));
        pool.borrow(16_001e18);
        pool.borrow(16_000e18);
        vm.stopPrank();
    }

    function test_stalePriceBlocksBorrowing() public {
        _supply(supplier, 100_000e18);
        eth.mint(borrower, 10e18);
        vm.startPrank(borrower);
        eth.approve(address(pool), 10e18);
        pool.depositCollateral(10e18);
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(bytes("STALE_PRICE"));
        pool.borrow(1_000e18);
        vm.stopPrank();
    }

    function test_liquidationAfterPriceDrop() public {
        _supply(supplier, 100_000e18);
        _collateralAndBorrow(borrower, 10e18, 16_000e18); // HF = 20000*0.85/16000 = 1.0625
        assertGt(pool.healthFactor(borrower), 1e18);

        oracle.set(1800e18); // HF = 18000*0.85/16000 = 0.956
        assertLt(pool.healthFactor(borrower), 1e18);

        usd.mint(liquidator, 8_000e18);
        vm.startPrank(liquidator);
        usd.approve(address(pool), type(uint256).max);
        uint256 seized = pool.liquidate(borrower, 100_000e18); // capped by the 50% close factor
        vm.stopPrank();

        // repaid 8000 USD -> seized 8000 * 1.05 / 1800 = 4.6667 ETH
        assertApproxEqRel(seized, 4.666666666666666e18, 1e12);
        assertApproxEqAbs(pool.debtBalance(borrower), 8_000e18, 1);
        assertGt(pool.healthFactor(borrower), 1e18); // healthier after liquidation
    }

    function test_cannotLiquidateHealthy() public {
        _supply(supplier, 100_000e18);
        _collateralAndBorrow(borrower, 10e18, 10_000e18);
        vm.expectRevert(bytes("HEALTHY"));
        pool.liquidate(borrower, 1e18);
    }

    /// Supplying then withdrawing your full balance never returns more than you put in.
    function testFuzz_supplyRoundTripNoProfit(uint128 amt) public {
        uint256 a = bound(amt, 1e6, 1e30);
        _supply(supplier, a);
        uint256 bal = pool.supplyBalance(supplier);
        assertLe(bal, a);
        vm.prank(supplier);
        pool.withdraw(bal);
        assertLe(usd.balanceOf(supplier), a);
    }

    /// Sum of individual debts stays within rounding of the pool's total debt as time passes.
    function testFuzz_debtAccountingConsistent(uint96 b1, uint96 b2, uint32 dt) public {
        _supply(supplier, 10_000_000e18);
        address alice = makeAddr("alice");
        address bob = makeAddr("bob");
        _collateralAndBorrow(alice, 10_000e18, bound(b1, 1e18, 5_000_000e18));
        vm.warp(block.timestamp + bound(dt, 1, 30 days));
        oracle.set(2000e18);
        _collateralAndBorrow(bob, 10_000e18, bound(b2, 1e18, 4_000_000e18));
        vm.warp(block.timestamp + bound(dt, 1, 30 days));
        oracle.set(2000e18);
        pool.accrue();
        uint256 sum = pool.debtBalance(alice) + pool.debtBalance(bob);
        assertApproxEqAbs(sum, pool.totalDebt(), 2);
    }
}
