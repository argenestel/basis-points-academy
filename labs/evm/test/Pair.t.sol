// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pair} from "../src/amm/Pair.sol";
import {MockToken} from "../src/common/ERC20.sol";

contract PairTest is Test {
    MockToken a;
    MockToken b;
    Pair pair;
    address lp = makeAddr("lp");
    address trader = makeAddr("trader");

    function setUp() public {
        a = new MockToken("Token A", "A", 18);
        b = new MockToken("Token B", "B", 18);
        pair = new Pair(address(a), address(b));
    }

    function _addLiquidity(address who, uint256 amtA, uint256 amtB) internal returns (uint256 liq) {
        a.mint(who, amtA);
        b.mint(who, amtB);
        vm.startPrank(who);
        a.transfer(address(pair), amtA);
        b.transfer(address(pair), amtB);
        liq = pair.mint(who);
        vm.stopPrank();
    }

    function _swapAforB(address who, uint256 amtIn) internal returns (uint256 out) {
        (uint112 r0, uint112 r1) = pair.getReserves();
        out = pair.getAmountOut(amtIn, r0, r1);
        a.mint(who, amtIn);
        vm.startPrank(who);
        a.transfer(address(pair), amtIn);
        pair.swap(0, out, who);
        vm.stopPrank();
    }

    function test_firstDepositMintsSqrtMinusMinimum() public {
        uint256 liq = _addLiquidity(lp, 100e18, 400e18);
        assertEq(liq, 200e18 - pair.MINIMUM_LIQUIDITY());
        assertEq(pair.balanceOf(address(0xdead)), pair.MINIMUM_LIQUIDITY());
    }

    function test_swapMatchesFormula() public {
        _addLiquidity(lp, 100e18, 300_000e18);
        uint256 out = _swapAforB(trader, 1e18);
        // dy = 300000 * 0.997 / (100 + 0.997) ≈ 2961.47 (about 1.3% worse than the 3000 mid price)
        assertApproxEqRel(out, 2961.47e18, 1e14);
        assertEq(b.balanceOf(trader), out);
    }

    function test_revertWhenTakingTooMuch() public {
        _addLiquidity(lp, 100e18, 100e18);
        a.mint(trader, 1e18);
        vm.startPrank(trader);
        a.transfer(address(pair), 1e18);
        vm.expectRevert(bytes("K"));
        pair.swap(0, 0.999e18, trader); // more than getAmountOut allows
        vm.stopPrank();
    }

    function test_burnReturnsProRata() public {
        uint256 liq = _addLiquidity(lp, 10e18, 10e18);
        vm.startPrank(lp);
        pair.transfer(address(pair), liq);
        (uint256 out0, uint256 out1) = pair.burn(lp);
        vm.stopPrank();
        assertLe(out0, 10e18);
        assertLe(out1, 10e18);
        assertApproxEqAbs(out0, 10e18, 1e3);
    }

    /// k (reserve product) must never decrease after a swap: fees only make it grow.
    function testFuzz_kNeverDecreases(uint96 r0, uint96 r1, uint96 amtIn) public {
        uint256 x = bound(r0, 1e15, 1e27);
        uint256 y = bound(r1, 1e15, 1e27);
        _addLiquidity(lp, x, y);
        (uint112 before0, uint112 before1) = pair.getReserves();
        uint256 kBefore = uint256(before0) * before1;

        uint256 dx = bound(amtIn, 1e9, x);
        uint256 out = pair.getAmountOut(dx, before0, before1);
        vm.assume(out > 0);
        _swapAforB(trader, dx);

        (uint112 after0, uint112 after1) = pair.getReserves();
        assertGe(uint256(after0) * after1, kBefore);
    }

    /// Deposit then withdraw immediately must never return more than you put in.
    function testFuzz_noFreeValueOnRoundTrip(uint96 seed0, uint96 seed1, uint96 dep) public {
        _addLiquidity(lp, bound(seed0, 1e18, 1e26), bound(seed1, 1e18, 1e26));
        (uint112 r0, uint112 r1) = pair.getReserves();
        uint256 d0 = bound(dep, 1e12, 1e25);
        uint256 d1 = (d0 * r1) / r0 + 1;
        address user = makeAddr("user");
        uint256 liq = _addLiquidity(user, d0, d1);
        vm.startPrank(user);
        pair.transfer(address(pair), liq);
        (uint256 o0, uint256 o1) = pair.burn(user);
        vm.stopPrank();
        assertLe(o0, d0);
        assertLe(o1, d1);
    }
}
