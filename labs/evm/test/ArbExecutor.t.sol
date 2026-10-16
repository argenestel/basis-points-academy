// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArbExecutor} from "../src/mev/ArbExecutor.sol";
import {Pair} from "../src/amm/Pair.sol";
import {MockToken} from "../src/common/ERC20.sol";

contract ArbExecutorTest is Test {
    MockToken usd;
    MockToken eth;
    Pair cheap; // ETH at ~1,900
    Pair rich; // ETH at ~2,100
    ArbExecutor exec;

    function _seed(Pair p, uint256 e, uint256 u) internal {
        eth.mint(address(this), e);
        usd.mint(address(this), u);
        eth.transfer(address(p), e);
        usd.transfer(address(p), u);
        p.mint(address(this));
    }

    function setUp() public {
        usd = new MockToken("USD", "USD", 18);
        eth = new MockToken("ETH", "ETH", 18);
        cheap = new Pair(address(eth), address(usd));
        rich = new Pair(address(eth), address(usd));
        _seed(cheap, 1_000e18, 1_900_000e18);
        _seed(rich, 1_000e18, 2_100_000e18);
        exec = new ArbExecutor();
        usd.mint(address(exec), 200_000e18); // the searcher's capital
    }

    function test_arbIsProfitableAndClosesTheGap() public {
        uint256 profit = exec.arb(address(cheap), address(rich), address(usd), 50_000e18, 1e18);
        assertGt(profit, 0);
        assertEq(usd.balanceOf(address(exec)), 200_000e18 + profit);
        (uint112 c0, uint112 c1) = cheap.getReserves();
        (uint112 r0, uint112 r1) = rich.getReserves();
        uint256 pCheap = (uint256(c1) * 1e18) / c0;
        uint256 pRich = (uint256(r1) * 1e18) / r0;
        uint256 gap = pRich > pCheap ? pRich - pCheap : pCheap - pRich;
        assertLt(gap, 200e18, "price gap narrowed from $200");
    }

    function test_revertsWhenGapIsGone() public {
        exec.arb(address(cheap), address(rich), address(usd), 50_000e18, 0);
        vm.expectRevert(bytes("NOT_PROFITABLE"));
        exec.arb(address(cheap), address(rich), address(usd), 50_000e18, 1e18); // same trade again: no edge left
    }

    function test_wrongDirectionLoses() public {
        vm.expectRevert(bytes("NOT_PROFITABLE"));
        exec.arb(address(rich), address(cheap), address(usd), 10_000e18, 0); // buy high, sell low
    }

    function test_onlyOwner() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(bytes("ONLY_OWNER"));
        exec.arb(address(cheap), address(rich), address(usd), 1e18, 0);
    }
}
