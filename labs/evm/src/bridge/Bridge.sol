// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20, SafeTransfer} from "../common/ERC20.sol";

/// @title Source-chain vault, course Unit 12
/// @notice Users lock tokens here; relayers watch `Locked` and collect signer attestations for the destination chain.
contract BridgeVault {
    using SafeTransfer for address;

    address public immutable token;
    uint256 public immutable dstChainId;
    uint256 public nonce;

    event Locked(uint256 indexed nonce, address indexed from, address indexed to, uint256 amount, uint256 srcChainId, uint256 dstChainId);

    constructor(address _token, uint256 _dstChainId) {
        token = _token;
        dstChainId = _dstChainId;
    }

    function lock(address to, uint256 amount) external returns (uint256 id) {
        require(amount > 0 && to != address(0), "BAD_ARGS");
        token.safeTransferFrom(msg.sender, address(this), amount);
        id = nonce++;
        emit Locked(id, msg.sender, to, amount, block.chainid, dstChainId);
    }
}

/// @notice Wrapped representation on the destination chain. Only the minter can mint.
contract WrappedToken is ERC20 {
    address public immutable minter;

    constructor(string memory _name, string memory _symbol, address _minter) ERC20(_name, _symbol, 18) {
        minter = _minter;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "ONLY_MINTER");
        _mint(to, amount);
    }
}

/// @title Destination-chain minter with m-of-n signature verification
/// @notice Hardening implemented here (each one maps to a real bridge hack):
///   - EIP-712 domain separation: chain id + this contract's address (no cross-chain/contract replay)
///   - message binds source chain, source vault and nonce; consumed map (no replay)
///   - signers must be strictly ascending (no duplicate signatures counted twice, unlike a naive loop)
///   - low-s check (no signature malleability)
///   - per-window mint rate limit (caps the loss if signers are compromised: Ronin, Harmony, KelpDAO)
///   - guardian pause
contract BridgeMinter {
    struct Message {
        uint256 srcChainId;
        address srcVault;
        uint256 nonce;
        address to;
        uint256 amount;
    }

    bytes32 public constant MESSAGE_TYPEHASH =
        keccak256("Message(uint256 srcChainId,address srcVault,uint256 nonce,address to,uint256 amount)");
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    uint256 private constant HALF_N = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    WrappedToken public immutable wrapped;
    uint256 public immutable srcChainId;
    address public immutable srcVault;
    uint256 public immutable threshold;
    uint256 public immutable windowCap;
    uint256 public constant WINDOW = 1 hours;
    address public immutable guardian;

    mapping(address => bool) public isSigner;
    mapping(bytes32 => bool) public consumed;
    uint256 public windowStart;
    uint256 public mintedInWindow;
    bool public paused;

    event Minted(bytes32 indexed digest, uint256 indexed nonce, address indexed to, uint256 amount);
    event Paused(bool paused);

    constructor(
        uint256 _srcChainId,
        address _srcVault,
        address[] memory signers,
        uint256 _threshold,
        uint256 _windowCap,
        address _guardian
    ) {
        require(_threshold > 0 && _threshold <= signers.length, "BAD_THRESHOLD");
        for (uint256 i; i < signers.length; i++) {
            require(signers[i] != address(0) && !isSigner[signers[i]], "BAD_SIGNER");
            isSigner[signers[i]] = true;
        }
        srcChainId = _srcChainId;
        srcVault = _srcVault;
        threshold = _threshold;
        windowCap = _windowCap;
        guardian = _guardian;
        wrapped = new WrappedToken("Bridged Token", "bTKN", address(this));
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256("BP Bridge"), keccak256("1"), block.chainid, address(this)));
    }

    function digest(Message calldata m) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(MESSAGE_TYPEHASH, m.srcChainId, m.srcVault, m.nonce, m.to, m.amount));
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    function setPaused(bool p) external {
        require(msg.sender == guardian, "ONLY_GUARDIAN");
        paused = p;
        emit Paused(p);
    }

    /// @param sigs 65-byte (r, s, v) signatures over digest(m), ordered by ascending signer address
    function mint(Message calldata m, bytes[] calldata sigs) external {
        require(!paused, "PAUSED");
        require(m.srcChainId == srcChainId && m.srcVault == srcVault, "WRONG_SOURCE");
        bytes32 d = digest(m);
        require(!consumed[d], "REPLAY");
        require(_validSignatures(d, sigs) >= threshold, "NOT_ENOUGH_SIGNATURES");
        consumed[d] = true;

        if (block.timestamp >= windowStart + WINDOW) {
            windowStart = block.timestamp;
            mintedInWindow = 0;
        }
        require(mintedInWindow + m.amount <= windowCap, "RATE_LIMITED");
        mintedInWindow += m.amount;

        wrapped.mint(m.to, m.amount);
        emit Minted(d, m.nonce, m.to, m.amount);
    }

    function _validSignatures(bytes32 d, bytes[] calldata sigs) internal view returns (uint256 count) {
        address last;
        for (uint256 i; i < sigs.length; i++) {
            require(sigs[i].length == 65, "BAD_SIG_LENGTH");
            bytes32 r = bytes32(sigs[i][0:32]);
            bytes32 s = bytes32(sigs[i][32:64]);
            uint8 v = uint8(sigs[i][64]);
            require(uint256(s) <= HALF_N, "MALLEABLE_SIG");
            address signer = ecrecover(d, v, r, s);
            require(signer != address(0) && signer > last, "UNSORTED_OR_DUPLICATE");
            last = signer;
            if (isSigner[signer]) count++;
        }
    }
}
