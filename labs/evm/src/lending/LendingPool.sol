// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeTransfer} from "../common/ERC20.sol";

interface IERC20Bal {
    function balanceOf(address) external view returns (uint256);
}

/// @notice Price of 1 collateral token in loan-token units, 1e18-scaled.
interface IPriceOracle {
    function price() external view returns (uint256 price, uint256 updatedAt);
}

contract MockOracle is IPriceOracle {
    uint256 public px;
    uint256 public updatedAt;

    function set(uint256 _px) external {
        px = _px;
        updatedAt = block.timestamp;
    }

    function price() external view returns (uint256, uint256) {
        return (px, updatedAt);
    }
}

/// @title Single-market lending pool, course Unit 7
/// @notice One loan asset, one collateral asset. Kinked interest-rate curve, global indices
///         for O(1) interest accrual, health factor, and liquidations with a close factor and bonus.
///         Both tokens are assumed to have 18 decimals (making it decimal-aware is an exercise).
contract LendingPool {
    using SafeTransfer for address;

    uint256 internal constant WAD = 1e18;
    uint256 internal constant RAY = 1e27;
    uint256 internal constant YEAR = 365 days;

    address public immutable loanToken;
    address public immutable collateralToken;
    IPriceOracle public immutable oracle;

    // risk parameters (WAD)
    uint256 public constant LTV = 0.80e18; // max borrow / collateral value
    uint256 public constant LIQ_THRESHOLD = 0.85e18; // health factor uses this
    uint256 public constant CLOSE_FACTOR = 0.5e18; // max share of debt repaid per liquidation
    uint256 public constant LIQ_BONUS = 0.05e18; // liquidator receives +5% collateral
    uint256 public constant RESERVE_FACTOR = 0.10e18;
    uint256 public constant MAX_STALENESS = 1 hours;

    // kinked rate model (annual, WAD)
    uint256 public constant BASE_RATE = 0;
    uint256 public constant SLOPE1 = 0.04e18;
    uint256 public constant SLOPE2 = 0.60e18;
    uint256 public constant OPTIMAL_U = 0.80e18;

    uint256 public supplyIndex = RAY;
    uint256 public borrowIndex = RAY;
    uint256 public lastAccrual;
    uint256 public reserves; // protocol share of interest, in loan tokens

    uint256 public totalSupplyScaled;
    uint256 public totalDebtScaled;
    mapping(address => uint256) public supplyScaled;
    mapping(address => uint256) public debtScaled;
    mapping(address => uint256) public collateral;

    event Supply(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed payer, address indexed borrower, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed borrower, uint256 repaid, uint256 seized);

    constructor(address _loan, address _collateral, IPriceOracle _oracle) {
        loanToken = _loan;
        collateralToken = _collateral;
        oracle = _oracle;
        lastAccrual = block.timestamp;
    }

    // ---------------------------------------------------------------- views

    function totalSupplyAssets() public view returns (uint256) {
        return _mulDivDown(totalSupplyScaled, supplyIndex, RAY);
    }

    function totalDebt() public view returns (uint256) {
        return _mulDivUp(totalDebtScaled, borrowIndex, RAY);
    }

    function utilization() public view returns (uint256) {
        uint256 s = totalSupplyAssets();
        return s == 0 ? 0 : (totalDebt() * WAD) / s;
    }

    /// @notice Kinked curve: gentle below OPTIMAL_U, steep above it.
    function borrowRate(uint256 u) public pure returns (uint256) {
        if (u <= OPTIMAL_U) return BASE_RATE + (SLOPE1 * u) / OPTIMAL_U;
        return BASE_RATE + SLOPE1 + (SLOPE2 * (u - OPTIMAL_U)) / (WAD - OPTIMAL_U);
    }

    function supplyBalance(address user) public view returns (uint256) {
        return _mulDivDown(supplyScaled[user], supplyIndex, RAY);
    }

    function debtBalance(address user) public view returns (uint256) {
        return _mulDivUp(debtScaled[user], borrowIndex, RAY);
    }

    /// @notice HF = collateral * price * LT / debt. Below 1e18 means liquidatable.
    function healthFactor(address user) public view returns (uint256) {
        uint256 debt = debtBalance(user);
        if (debt == 0) return type(uint256).max;
        uint256 value = (collateral[user] * _price()) / WAD;
        return (value * LIQ_THRESHOLD) / debt;
    }

    // ---------------------------------------------------------------- interest

    /// @notice Accrue interest since the last update by moving the two global indices.
    function accrue() public {
        uint256 dt = block.timestamp - lastAccrual;
        if (dt == 0) return;
        lastAccrual = block.timestamp;
        if (totalDebtScaled == 0) return;

        uint256 debtBefore = totalDebt();
        uint256 rate = borrowRate(utilization()); // annual WAD
        uint256 growthRay = RAY + (rate * dt * 1e9) / YEAR; // linear within one accrual period
        borrowIndex = (borrowIndex * growthRay) / RAY;

        uint256 interest = totalDebt() - debtBefore;
        uint256 toReserves = (interest * RESERVE_FACTOR) / WAD;
        reserves += toReserves;
        if (totalSupplyScaled > 0) {
            supplyIndex += ((interest - toReserves) * RAY) / totalSupplyScaled;
        }
    }

    // ---------------------------------------------------------------- suppliers

    function supply(uint256 amount) external {
        accrue();
        loanToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 scaled = _mulDivDown(amount, RAY, supplyIndex); // round down: pool's favor
        require(scaled > 0, "ZERO_SHARES");
        supplyScaled[msg.sender] += scaled;
        totalSupplyScaled += scaled;
        emit Supply(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        accrue();
        uint256 scaled = _mulDivUp(amount, RAY, supplyIndex); // round up: pool's favor
        supplyScaled[msg.sender] -= scaled;
        totalSupplyScaled -= scaled;
        require(_cash() >= amount, "INSUFFICIENT_LIQUIDITY");
        loanToken.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    // ---------------------------------------------------------------- borrowers

    function depositCollateral(uint256 amount) external {
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        collateral[msg.sender] += amount;
    }

    function withdrawCollateral(uint256 amount) external {
        accrue();
        collateral[msg.sender] -= amount;
        require(_withinLtv(msg.sender), "WOULD_EXCEED_LTV");
        collateralToken.safeTransfer(msg.sender, amount);
    }

    function borrow(uint256 amount) external {
        accrue();
        uint256 scaled = _mulDivUp(amount, RAY, borrowIndex); // round up: debt in pool's favor
        debtScaled[msg.sender] += scaled;
        totalDebtScaled += scaled;
        require(_withinLtv(msg.sender), "WOULD_EXCEED_LTV");
        require(_cash() >= amount, "INSUFFICIENT_LIQUIDITY");
        loanToken.safeTransfer(msg.sender, amount);
        emit Borrow(msg.sender, amount);
    }

    function repay(address borrower, uint256 amount) public returns (uint256 repaid) {
        accrue();
        uint256 debt = debtBalance(borrower);
        repaid = amount > debt ? debt : amount;
        uint256 scaled = repaid == debt ? debtScaled[borrower] : _mulDivDown(repaid, RAY, borrowIndex);
        debtScaled[borrower] -= scaled;
        totalDebtScaled -= scaled;
        loanToken.safeTransferFrom(msg.sender, address(this), repaid);
        emit Repay(msg.sender, borrower, repaid);
    }

    // ---------------------------------------------------------------- liquidations

    /// @notice Repay up to CLOSE_FACTOR of an unhealthy borrower's debt; seize collateral worth repaid * (1 + bonus).
    function liquidate(address borrower, uint256 repayAmount) external returns (uint256 seized) {
        accrue();
        require(healthFactor(borrower) < WAD, "HEALTHY");
        uint256 maxRepay = (debtBalance(borrower) * CLOSE_FACTOR) / WAD;
        if (repayAmount > maxRepay) repayAmount = maxRepay;

        uint256 repaid = repay(borrower, repayAmount);
        seized = (repaid * (WAD + LIQ_BONUS)) / _price();
        if (seized > collateral[borrower]) seized = collateral[borrower]; // remaining debt becomes bad debt
        collateral[borrower] -= seized;
        collateralToken.safeTransfer(msg.sender, seized);
        emit Liquidate(msg.sender, borrower, repaid, seized);
    }

    // ---------------------------------------------------------------- internals

    function _withinLtv(address user) internal view returns (bool) {
        uint256 debt = debtBalance(user);
        if (debt == 0) return true;
        uint256 value = (collateral[user] * _price()) / WAD;
        return debt <= (value * LTV) / WAD;
    }

    function _price() internal view returns (uint256 px) {
        uint256 updatedAt;
        (px, updatedAt) = oracle.price();
        require(px > 0, "BAD_PRICE");
        require(block.timestamp - updatedAt <= MAX_STALENESS, "STALE_PRICE");
    }

    function _cash() internal view returns (uint256) {
        return IERC20Bal(loanToken).balanceOf(address(this));
    }

    function _mulDivDown(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y) / d;
    }

    function _mulDivUp(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y + d - 1) / d;
    }
}
