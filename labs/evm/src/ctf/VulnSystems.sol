// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Deliberately vulnerable systems for the wargame lab (labs/ctf). Each one reproduces a real bug class.
// DO NOT copy these into anything real: every contract here has a planted flaw. The fixes are in the READMEs.

import {MockToken} from "../common/ERC20.sol";
import {Pair} from "../amm/Pair.sol";

/* ───────────────────────── 1. Oracle manipulation (Mango Markets class) ─────────────────────────
   Prices collateral at the SPOT reserves of a shallow AMM pool. Anyone can move that price with one
   swap, inflate their collateral, and borrow out far more than it is worth. */
contract NaiveBank {
    MockToken public immutable usd;
    MockToken public immutable gold;
    Pair public immutable pair;
    uint256 public constant LTV = 70; // percent
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;

    constructor(MockToken _usd, MockToken _gold, Pair _pair) {
        usd = _usd;
        gold = _gold;
        pair = _pair;
    }

    /// @notice USD per 1 GOLD, read straight from the pool's spot reserves (the bug).
    function goldPrice() public view returns (uint256) {
        (uint112 r0, uint112 r1) = pair.getReserves();
        (uint256 gr, uint256 ur) = pair.token0() == address(gold) ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        return (ur * 1e18) / gr;
    }

    function depositCollateral(uint256 amt) external {
        gold.transferFrom(msg.sender, address(this), amt);
        collateral[msg.sender] += amt;
    }

    function borrow(uint256 amt) external {
        uint256 value = (collateral[msg.sender] * goldPrice()) / 1e18;
        require(debt[msg.sender] + amt <= (value * LTV) / 100, "undercollateralized");
        debt[msg.sender] += amt;
        usd.transfer(msg.sender, amt);
    }
}

/* ───────────────────────── 2. Vault share inflation (ERC-4626 first-depositor) ─────────────────────────
   Shares are minted from the current balance BEFORE the deposit lands, with no minimum and no virtual
   offset. The first depositor mints 1 wei of shares, donates to inflate the price, and the next
   depositor's shares round down to zero. */
contract TinyVault {
    MockToken public immutable token;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    constructor(MockToken t) {
        token = t;
    }

    function totalAssets() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function deposit(uint256 assets) external returns (uint256 s) {
        s = totalShares == 0 ? assets : (assets * totalShares) / totalAssets();
        token.transferFrom(msg.sender, address(this), assets);
        shares[msg.sender] += s;
        totalShares += s;
    }

    function redeem(uint256 s) external returns (uint256 a) {
        a = (s * totalAssets()) / totalShares;
        shares[msg.sender] -= s;
        totalShares -= s;
        token.transfer(msg.sender, a);
    }
}

/* ───────────────────────── 3. Reentrancy (TheDAO class) ─────────────────────────
   Sends ETH before zeroing the balance, so a contract can reenter withdraw() and drain the well. */
contract EtherWell {
    mapping(address => uint256) public balance;

    function deposit() external payable {
        balance[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 b = balance[msg.sender];
        require(b > 0, "nothing to withdraw");
        (bool ok,) = msg.sender.call{value: b}(""); // interaction before effect: the bug
        require(ok, "send failed");
        balance[msg.sender] = 0;
    }
}

/* ───────────────────────── 4. Flash-loan governance (Beanstalk class) ─────────────────────────
   Voting power is the caller's CURRENT balance (no checkpoint), there is no timelock, and a passing
   proposal can make an arbitrary call. Borrow a majority for one transaction and drain the treasury. */
interface IFlashBorrower {
    function onFlashLoan(uint256 amount, bytes calldata data) external;
}

contract FlashLender {
    MockToken public immutable token;

    constructor(MockToken t) {
        token = t;
    }

    function maxLoan() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function flashLoan(uint256 amount, address receiver, bytes calldata data) external {
        uint256 before = token.balanceOf(address(this));
        token.transfer(receiver, amount);
        IFlashBorrower(receiver).onFlashLoan(amount, data);
        require(token.balanceOf(address(this)) >= before, "not repaid");
    }
}

contract GovHeist {
    MockToken public immutable gov;
    MockToken public immutable treasuryToken;

    constructor(MockToken _gov, MockToken _treasuryToken) {
        gov = _gov;
        treasuryToken = _treasuryToken;
    }

    /// @notice Pass and execute in one call, using the caller's current balance as voting power (the bug).
    function execute(address target, bytes calldata data) external {
        require(gov.balanceOf(msg.sender) * 2 > gov.totalSupply(), "no majority");
        (bool ok,) = target.call(data);
        require(ok, "call failed");
    }
}

/* ───────────────────────── 5. Signature replay (unbound authorization) ─────────────────────────
   The signed message is just keccak(amount): it does not bind the recipient, a nonce, the chain id, or
   this contract, and nothing is marked consumed. One leaked signature authorizes unlimited withdrawals
   to any address. */
contract ReplayBridge {
    MockToken public immutable usd;
    address public immutable signer;

    constructor(MockToken _usd, address _signer) {
        usd = _usd;
        signer = _signer;
    }

    function digest(uint256 amount) public pure returns (bytes32) {
        bytes32 h = keccak256(abi.encodePacked(amount));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h));
    }

    function withdraw(address to, uint256 amount, uint8 v, bytes32 r, bytes32 s) external {
        require(ecrecover(digest(amount), v, r, s) == signer, "bad signature");
        usd.transfer(to, amount);
    }
}
