// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ShieldedPoolLite} from "../src/privacy/ShieldedPoolLite.sol";

contract ShieldedPoolTest is Test {
    ShieldedPoolLite pool;
    bytes32[] leaves; // offchain mirror of the tree, as a wallet or relayer would keep
    uint32 constant LEVELS = 20;

    address alice = makeAddr("alice");
    address payable fresh = payable(makeAddr("fresh-address"));
    address payable relayer = payable(makeAddr("relayer"));
    address payable mev = payable(makeAddr("mempool-watcher"));

    function setUp() public {
        pool = new ShieldedPoolLite();
        vm.deal(alice, 10 ether);
    }

    function _deposit(bytes32 nullifier, bytes32 secret) internal returns (uint32 index) {
        bytes32 c = pool.commitmentOf(nullifier, secret);
        index = uint32(leaves.length);
        leaves.push(c);
        vm.prank(alice);
        pool.deposit{value: 0.1 ether}(c);
    }

    /// Build the Merkle path for leaf `index` from the offchain mirror.
    function _path(uint32 index) internal view returns (bytes32[LEVELS] memory path, bytes32 root) {
        bytes32[] memory level = leaves;
        uint32 i = index;
        for (uint32 h = 0; h < LEVELS; h++) {
            uint256 sib = i ^ 1;
            path[h] = sib < level.length ? level[sib] : pool.zeros(h);
            bytes32[] memory next = new bytes32[]((level.length + 1) / 2);
            for (uint256 k = 0; k < next.length; k++) {
                bytes32 l = level[2 * k];
                bytes32 r = 2 * k + 1 < level.length ? level[2 * k + 1] : pool.zeros(h);
                next[k] = pool.hashPair(l, r);
            }
            if (next.length == 0) next = new bytes32[](1);
            level = next;
            i /= 2;
        }
        root = level[0];
    }

    function test_offchainMirrorMatchesOnchainRoot() public {
        for (uint256 k; k < 5; k++) _deposit(bytes32(k + 1), bytes32(k + 100));
        (, bytes32 root) = _path(0);
        assertEq(root, pool.getLastRoot());
    }

    function test_depositThenWithdrawToFreshAddressWithRelayerFee() public {
        _deposit("n1", "s1");
        _deposit("n2", "s2");
        (bytes32[LEVELS] memory path, bytes32 root) = _path(0);
        vm.prank(relayer); // the relayer pays gas, so `fresh` never needs ETH (no funding link)
        pool.withdraw("n1", "s1", 0, path, root, fresh, relayer, 0.002 ether);
        assertEq(fresh.balance, 0.098 ether);
        assertEq(relayer.balance, 0.002 ether);
    }

    function test_doubleSpendRejected() public {
        _deposit("n1", "s1");
        (bytes32[LEVELS] memory path, bytes32 root) = _path(0);
        pool.withdraw("n1", "s1", 0, path, root, fresh, relayer, 0);
        vm.expectRevert(bytes("ALREADY_SPENT"));
        pool.withdraw("n1", "s1", 0, path, root, fresh, relayer, 0);
    }

    function test_wrongSecretRejected() public {
        _deposit("n1", "s1");
        (bytes32[LEVELS] memory path, bytes32 root) = _path(0);
        vm.expectRevert(bytes("INVALID_PROOF"));
        pool.withdraw("n1", "WRONG", 0, path, root, fresh, relayer, 0);
    }

    function test_unknownRootRejected() public {
        _deposit("n1", "s1");
        (bytes32[LEVELS] memory path,) = _path(0);
        vm.expectRevert(bytes("UNKNOWN_ROOT"));
        pool.withdraw("n1", "s1", 0, path, keccak256("made up"), fresh, relayer, 0);
    }

    function test_oldRootsExpireAfterHistoryWindow() public {
        _deposit("n0", "s0");
        (bytes32[LEVELS] memory oldPath, bytes32 oldRoot) = _path(0);
        for (uint256 k = 1; k <= 30; k++) _deposit(bytes32(k), bytes32(k * 7));
        assertFalse(pool.isKnownRoot(oldRoot));
        vm.expectRevert(bytes("UNKNOWN_ROOT"));
        pool.withdraw("n0", "s0", 0, oldPath, oldRoot, fresh, relayer, 0);
        // a fresh path against the latest root still works
        (bytes32[LEVELS] memory path, bytes32 root) = _path(0);
        pool.withdraw("n0", "s0", 0, path, root, fresh, relayer, 0);
    }

    function test_wrongDenominationRejected() public {
        vm.prank(alice);
        vm.expectRevert(bytes("WRONG_AMOUNT"));
        pool.deposit{value: 1 ether}(keccak256("c"));
    }

    /// Why the ZK version exists: the lite withdraw reveals the secret in calldata, so anyone who sees the
    /// pending transaction can resubmit it with their own recipient and higher gas.
    function test_liteVersionCanBeFrontRun() public {
        _deposit("n1", "s1");
        (bytes32[LEVELS] memory path, bytes32 root) = _path(0);
        vm.prank(mev); // copies alice's pending calldata, swaps in its own address
        pool.withdraw("n1", "s1", 0, path, root, mev, mev, 0);
        assertEq(mev.balance, 0.1 ether);
        vm.expectRevert(bytes("ALREADY_SPENT")); // alice's real transaction lands second
        pool.withdraw("n1", "s1", 0, path, root, fresh, relayer, 0);
    }

    /// Fuzz: every one of N deposits can be withdrawn once, in any order, against the latest root.
    function testFuzz_everyDepositWithdrawableOnce(uint8 n, uint8 pick) public {
        uint256 count = bound(n, 1, 12);
        for (uint256 k; k < count; k++) _deposit(bytes32(k + 1), keccak256(abi.encode(k)));
        uint32 idx = uint32(bound(pick, 0, count - 1));
        (bytes32[LEVELS] memory path, bytes32 root) = _path(idx);
        pool.withdraw(bytes32(uint256(idx) + 1), keccak256(abi.encode(uint256(idx))), idx, path, root, fresh, relayer, 0);
        assertEq(fresh.balance, 0.1 ether);
        assertEq(address(pool).balance, (count - 1) * 0.1 ether);
    }
}
