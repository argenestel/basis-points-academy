// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BridgeVault, BridgeMinter} from "../src/bridge/Bridge.sol";
import {MockToken} from "../src/common/ERC20.sol";

/// Both "chains" live in one test EVM; chain ids are simulated with vm.chainId.
contract BridgeTest is Test {
    uint256 constant SRC_CHAIN = 1;
    uint256 constant DST_CHAIN = 42161;

    MockToken token;
    BridgeVault vault;
    BridgeMinter minter;
    address guardian = makeAddr("guardian");
    address alice = makeAddr("alice");
    uint256[] keys;
    address[] signers;

    function setUp() public {
        vm.chainId(SRC_CHAIN);
        token = new MockToken("USD", "USD", 18);
        vault = new BridgeVault(address(token), DST_CHAIN);

        // 3 signers sorted by address, threshold 2
        uint256[3] memory raw = [uint256(0xA11CE), 0xB0B, 0xCA401];
        for (uint256 i; i < 3; i++) {
            keys.push(raw[i]);
            signers.push(vm.addr(raw[i]));
        }
        _sortSigners();

        vm.chainId(DST_CHAIN);
        minter = new BridgeMinter(SRC_CHAIN, address(vault), signers, 2, 1_000_000e18, guardian);
    }

    function _sortSigners() internal {
        for (uint256 i; i < signers.length; i++) {
            for (uint256 j = i + 1; j < signers.length; j++) {
                if (signers[j] < signers[i]) {
                    (signers[i], signers[j]) = (signers[j], signers[i]);
                    (keys[i], keys[j]) = (keys[j], keys[i]);
                }
            }
        }
    }

    function _msg(uint256 nonce, uint256 amount) internal view returns (BridgeMinter.Message memory) {
        return BridgeMinter.Message({srcChainId: SRC_CHAIN, srcVault: address(vault), nonce: nonce, to: alice, amount: amount});
    }

    function _sign(BridgeMinter.Message memory m, uint256[] memory which) internal view returns (bytes[] memory sigs) {
        bytes32 d = minter.digest(m);
        sigs = new bytes[](which.length);
        for (uint256 i; i < which.length; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(keys[which[i]], d);
            sigs[i] = abi.encodePacked(r, s, v);
        }
    }

    function _idx(uint256 a, uint256 b) internal pure returns (uint256[] memory x) {
        x = new uint256[](2);
        x[0] = a;
        x[1] = b;
    }

    function test_lockEmitsAndMintsWithTwoSignatures() public {
        vm.chainId(SRC_CHAIN);
        token.mint(alice, 100e18);
        vm.startPrank(alice);
        token.approve(address(vault), 100e18);
        uint256 id = vault.lock(alice, 100e18);
        vm.stopPrank();
        assertEq(token.balanceOf(address(vault)), 100e18);

        vm.chainId(DST_CHAIN);
        BridgeMinter.Message memory m = _msg(id, 100e18);
        minter.mint(m, _sign(m, _idx(0, 2)));
        assertEq(minter.wrapped().balanceOf(alice), 100e18);
    }

    function test_replayRejected() public {
        BridgeMinter.Message memory m = _msg(0, 1e18);
        bytes[] memory sigs = _sign(m, _idx(0, 1));
        minter.mint(m, sigs);
        vm.expectRevert(bytes("REPLAY"));
        minter.mint(m, sigs);
    }

    function test_oneSignatureIsNotEnough() public {
        BridgeMinter.Message memory m = _msg(0, 1e18);
        uint256[] memory one = new uint256[](1);
        one[0] = 1;
        bytes[] memory sigs = _sign(m, one);
        vm.expectRevert(bytes("NOT_ENOUGH_SIGNATURES"));
        minter.mint(m, sigs);
    }

    /// The naive bug: counting the same signer twice. Sorted-unique ordering blocks it.
    function test_duplicateSignatureRejected() public {
        BridgeMinter.Message memory m = _msg(0, 1e18);
        bytes[] memory sigs = _sign(m, _idx(0, 0));
        vm.expectRevert(bytes("UNSORTED_OR_DUPLICATE"));
        minter.mint(m, sigs);
    }

    /// Signatures made for a deployment on another chain must not work here.
    function test_crossChainReplayRejected() public {
        BridgeMinter.Message memory m = _msg(0, 1e18);
        vm.chainId(10); // signers sign while "on" a different chain (different domain separator)
        bytes[] memory sigs = _sign(m, _idx(0, 1));
        vm.chainId(DST_CHAIN);
        // signatures recover to random non-signer addresses here, so the call must revert
        // (NOT_ENOUGH_SIGNATURES or UNSORTED_OR_DUPLICATE, depending on the recovered order)
        vm.expectRevert();
        minter.mint(m, sigs);
    }

    function test_wrongSourceRejected() public {
        BridgeMinter.Message memory m = _msg(0, 1e18);
        m.srcVault = address(0xBEEF);
        bytes[] memory sigs = _sign(m, _idx(0, 1));
        vm.expectRevert(bytes("WRONG_SOURCE"));
        minter.mint(m, sigs);
    }

    function test_rateLimitCapsLossesThenResets() public {
        BridgeMinter.Message memory m1 = _msg(0, 900_000e18);
        minter.mint(m1, _sign(m1, _idx(0, 1)));
        BridgeMinter.Message memory m2 = _msg(1, 200_000e18);
        bytes[] memory s2 = _sign(m2, _idx(0, 1));
        vm.expectRevert(bytes("RATE_LIMITED"));
        minter.mint(m2, s2);
        vm.warp(block.timestamp + 1 hours);
        minter.mint(m2, s2);
        assertEq(minter.wrapped().balanceOf(alice), 1_100_000e18);
    }

    function test_guardianCanPause() public {
        vm.prank(guardian);
        minter.setPaused(true);
        BridgeMinter.Message memory m = _msg(0, 1e18);
        bytes[] memory sigs = _sign(m, _idx(0, 1));
        vm.expectRevert(bytes("PAUSED"));
        minter.mint(m, sigs);
        vm.expectRevert(bytes("ONLY_GUARDIAN"));
        minter.setPaused(false);
    }

    /// Invariant you should monitor offchain: wrapped supply on B never exceeds amount locked on A.
    function testFuzz_mintedNeverExceedsLocked(uint64 amount) public {
        uint256 amt = bound(amount, 1, 1_000_000e18);
        vm.chainId(SRC_CHAIN);
        token.mint(alice, amt);
        vm.startPrank(alice);
        token.approve(address(vault), amt);
        uint256 id = vault.lock(alice, amt);
        vm.stopPrank();
        vm.chainId(DST_CHAIN);
        BridgeMinter.Message memory m = _msg(id, amt);
        minter.mint(m, _sign(m, _idx(1, 2)));
        assertLe(minter.wrapped().totalSupply(), token.balanceOf(address(vault)));
    }
}
