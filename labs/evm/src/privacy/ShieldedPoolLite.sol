// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Shielded pool, transparent edition, course Unit 22
/// @notice The data structures of a Tornado-style shielded pool, without the zero-knowledge proof:
///   deposit:  commitment = H(nullifier, secret) goes into an incremental Merkle tree
///   withdraw: show the commitment is in a recent root and that H(nullifier) was never spent
/// In this "lite" version withdraw REVEALS nullifier, secret and leaf index, so anyone can link
/// deposit -> withdrawal, and a mempool watcher can copy the call and steal the funds (see tests).
/// The real design replaces those arguments with a SNARK whose public inputs are
/// (root, nullifierHash, recipient, relayer, fee): that hides the leaf AND binds the recipient.
/// Doing that with circom or Noir is this lab's main exercise.
contract ShieldedPoolLite {
    uint256 public constant DENOMINATION = 0.1 ether;
    uint32 public constant LEVELS = 20; // ~1M deposits
    uint32 public constant ROOT_HISTORY = 30; // recent roots stay valid while new deposits land

    bytes32[LEVELS + 1] public zeros; // zeros[i] = root of an empty subtree of height i
    bytes32[LEVELS] public filledSubtrees;
    bytes32[ROOT_HISTORY] public roots;
    uint32 public currentRootIndex;
    uint32 public nextIndex;

    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullifierSpent;

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address to, bytes32 nullifierHash, address indexed relayer, uint256 fee);

    constructor() {
        zeros[0] = keccak256("basis-points-academy/shielded-pool/zero-leaf");
        for (uint32 i = 1; i <= LEVELS; i++) {
            zeros[i] = hashPair(zeros[i - 1], zeros[i - 1]);
        }
        for (uint32 i = 0; i < LEVELS; i++) {
            filledSubtrees[i] = zeros[i];
        }
        roots[0] = zeros[LEVELS];
    }

    function hashPair(bytes32 left, bytes32 right) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(left, right));
    }

    function commitmentOf(bytes32 nullifier, bytes32 secret) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(nullifier, secret));
    }

    function nullifierHashOf(bytes32 nullifier) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(nullifier));
    }

    function getLastRoot() public view returns (bytes32) {
        return roots[currentRootIndex];
    }

    function isKnownRoot(bytes32 root) public view returns (bool) {
        if (root == bytes32(0)) return false;
        uint32 i = currentRootIndex;
        do {
            if (roots[i] == root) return true;
            i = i == 0 ? ROOT_HISTORY - 1 : i - 1;
        } while (i != currentRootIndex);
        return false;
    }

    function deposit(bytes32 commitment) external payable {
        require(msg.value == DENOMINATION, "WRONG_AMOUNT");
        require(!commitments[commitment], "DUPLICATE_COMMITMENT");
        uint32 index = _insert(commitment);
        commitments[commitment] = true;
        emit Deposit(commitment, index, block.timestamp);
    }

    /// @dev Lite version: proves membership by revealing everything. Don't do this with real money.
    function withdraw(
        bytes32 nullifier,
        bytes32 secret,
        uint32 leafIndex,
        bytes32[LEVELS] calldata path,
        bytes32 root,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) external {
        require(fee <= DENOMINATION, "FEE_TOO_HIGH");
        bytes32 nh = nullifierHashOf(nullifier);
        require(!nullifierSpent[nh], "ALREADY_SPENT");
        require(isKnownRoot(root), "UNKNOWN_ROOT");
        require(_verifyPath(commitmentOf(nullifier, secret), leafIndex, path, root), "INVALID_PROOF");

        nullifierSpent[nh] = true; // effects before interactions
        (bool ok,) = recipient.call{value: DENOMINATION - fee}("");
        require(ok, "PAY_RECIPIENT_FAILED");
        if (fee > 0) {
            (ok,) = relayer.call{value: fee}("");
            require(ok, "PAY_RELAYER_FAILED");
        }
        emit Withdrawal(recipient, nh, relayer, fee);
    }

    function _insert(bytes32 leaf) internal returns (uint32 index) {
        index = nextIndex;
        require(index < uint32(2) ** LEVELS, "TREE_FULL");
        uint32 i = index;
        bytes32 node = leaf;
        for (uint32 level = 0; level < LEVELS; level++) {
            if (i % 2 == 0) {
                filledSubtrees[level] = node;
                node = hashPair(node, zeros[level]);
            } else {
                node = hashPair(filledSubtrees[level], node);
            }
            i /= 2;
        }
        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY;
        roots[currentRootIndex] = node;
        nextIndex = index + 1;
    }

    function _verifyPath(bytes32 leaf, uint32 index, bytes32[LEVELS] calldata path, bytes32 root) internal pure returns (bool) {
        bytes32 node = leaf;
        for (uint32 level = 0; level < LEVELS; level++) {
            node = index % 2 == 0 ? hashPair(node, path[level]) : hashPair(path[level], node);
            index /= 2;
        }
        return node == root;
    }
}
