// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20, SafeTransfer} from "../common/ERC20.sol";
import {IPriceOracle} from "../lending/LendingPool.sol";

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
}

/// @notice The stablecoin. Only the CDP manager can mint or burn.
contract StableCoin is ERC20 {
    address public immutable manager;

    constructor() ERC20("Basis Points USD", "bpUSD", 18) {
        manager = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == manager, "ONLY_MANAGER");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == manager, "ONLY_MANAGER");
        _burn(from, amount);
    }
}

/// @notice Stablecoin holders deposit here to absorb liquidated debt and receive the collateral at a discount.
///         Accounting is share-based (like an ERC-4626 vault): every depositor owns a pro-rata slice of
///         the pool's remaining bpUSD AND of the collateral it has collected.
contract StabilityPool {
    using SafeTransfer for address;

    StableCoin public immutable stable;
    address public immutable collateral;
    address public immutable manager;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    constructor(StableCoin _stable, address _collateral) {
        stable = _stable;
        collateral = _collateral;
        manager = msg.sender;
    }

    function totalStable() public view returns (uint256) {
        return stable.balanceOf(address(this));
    }

    function totalCollateral() public view returns (uint256) {
        return IERC20Min(collateral).balanceOf(address(this));
    }

    function deposit(uint256 amount) external returns (uint256 minted) {
        uint256 ts = totalStable();
        require(!(totalShares > 0 && ts == 0), "POOL_DEPLETED"); // exercise: handle a fully used pool
        minted = totalShares == 0 ? amount : (amount * totalShares) / ts;
        require(minted > 0, "ZERO_SHARES");
        address(stable).safeTransferFrom(msg.sender, address(this), amount);
        shares[msg.sender] += minted;
        totalShares += minted;
    }

    /// @notice Burn shares for the pro-rata bpUSD and collateral.
    function withdraw(uint256 shareAmount) external returns (uint256 stableOut, uint256 collOut) {
        stableOut = (shareAmount * totalStable()) / totalShares;
        collOut = (shareAmount * totalCollateral()) / totalShares;
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        if (stableOut > 0) address(stable).safeTransfer(msg.sender, stableOut);
        if (collOut > 0) collateral.safeTransfer(msg.sender, collOut);
    }

    function valueOf(address who) external view returns (uint256 stableAmt, uint256 collAmt) {
        if (totalShares == 0) return (0, 0);
        stableAmt = (shares[who] * totalStable()) / totalShares;
        collAmt = (shares[who] * totalCollateral()) / totalShares;
    }
}

/// @title CDP manager (Liquity-style), course Unit 8 and build track 8
/// @notice Lock collateral, mint bpUSD against it at a minimum 110% collateral ratio.
///   - borrowing fee (0.5%) is added to the debt and minted to the treasury, so bpUSD supply == total debt
///   - liquidation: any vault under 110% is closed; the stability pool burns bpUSD equal to the debt and
///     receives the collateral (worth more than the debt while CR > 100%); the caller gets 0.5% of collateral
///   - redemption: anyone can swap bpUSD for $1 of collateral (minus 0.5%) taken from the RISKIEST vaults,
///     which is what puts a hard floor under the peg
contract CDPManager {
    using SafeTransfer for address;

    uint256 internal constant WAD = 1e18;
    uint256 public constant MCR = 1.1e18; // 110%
    uint256 public constant BORROW_FEE = 0.005e18;
    uint256 public constant REDEMPTION_FEE = 0.005e18;
    uint256 public constant LIQUIDATOR_REWARD = 0.005e18; // share of collateral
    uint256 public constant MIN_DEBT = 100e18;
    uint256 public constant MAX_STALENESS = 1 hours;

    struct Vault {
        uint256 coll;
        uint256 debt;
    }

    address public immutable collateral;
    IPriceOracle public immutable oracle;
    address public immutable treasury;
    StableCoin public immutable stable;
    StabilityPool public immutable pool;

    mapping(address => Vault) public vaults;
    address[] public owners;
    mapping(address => uint256) internal ownerIndex; // 1-based
    uint256 public totalColl;
    uint256 public totalDebt;

    event Opened(address indexed owner, uint256 coll, uint256 debt);
    event Adjusted(address indexed owner, uint256 coll, uint256 debt);
    event Closed(address indexed owner);
    event Liquidated(address indexed owner, address indexed liquidator, uint256 coll, uint256 debt);
    event Redeemed(address indexed redeemer, uint256 amount, uint256 collOut);

    constructor(address _collateral, IPriceOracle _oracle, address _treasury) {
        collateral = _collateral;
        oracle = _oracle;
        treasury = _treasury;
        stable = new StableCoin();
        pool = new StabilityPool(stable, _collateral);
    }

    // ------------------------------------------------------------ views

    function price() public view returns (uint256 px) {
        uint256 updatedAt;
        (px, updatedAt) = oracle.price();
        require(px > 0, "BAD_PRICE");
        require(block.timestamp - updatedAt <= MAX_STALENESS, "STALE_PRICE");
    }

    /// @notice Collateral ratio, 1e18 = 100%. Max uint for a vault with no debt.
    function collateralRatio(address owner) public view returns (uint256) {
        Vault memory v = vaults[owner];
        if (v.debt == 0) return type(uint256).max;
        return (v.coll * price()) / v.debt;
    }

    function vaultCount() external view returns (uint256) {
        return owners.length;
    }

    // ------------------------------------------------------------ borrowers

    function open(uint256 collAmount, uint256 borrowAmount) external {
        require(vaults[msg.sender].debt == 0, "VAULT_EXISTS");
        uint256 fee = (borrowAmount * BORROW_FEE) / WAD;
        uint256 debt = borrowAmount + fee;
        require(debt >= MIN_DEBT, "DEBT_TOO_SMALL");
        collateral.safeTransferFrom(msg.sender, address(this), collAmount);
        vaults[msg.sender] = Vault(collAmount, debt);
        _addOwner(msg.sender);
        totalColl += collAmount;
        totalDebt += debt;
        require(collateralRatio(msg.sender) >= MCR, "BELOW_MCR");
        stable.mint(msg.sender, borrowAmount);
        stable.mint(treasury, fee);
        emit Opened(msg.sender, collAmount, debt);
    }

    function addCollateral(uint256 amount) external {
        require(vaults[msg.sender].debt > 0, "NO_VAULT");
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        vaults[msg.sender].coll += amount;
        totalColl += amount;
        emit Adjusted(msg.sender, vaults[msg.sender].coll, vaults[msg.sender].debt);
    }

    function repay(uint256 amount) external {
        Vault storage v = vaults[msg.sender];
        require(amount < v.debt && v.debt - amount >= MIN_DEBT, "USE_CLOSE_OR_KEEP_MIN_DEBT");
        stable.burn(msg.sender, amount);
        v.debt -= amount;
        totalDebt -= amount;
        emit Adjusted(msg.sender, v.coll, v.debt);
    }

    /// @notice Repay all debt and take all collateral back.
    function close() external {
        Vault memory v = vaults[msg.sender];
        require(v.debt > 0, "NO_VAULT");
        stable.burn(msg.sender, v.debt);
        _removeVault(msg.sender, v);
        collateral.safeTransfer(msg.sender, v.coll);
        emit Closed(msg.sender);
    }

    // ------------------------------------------------------------ liquidation

    function liquidate(address owner) external {
        Vault memory v = vaults[owner];
        require(v.debt > 0, "NO_VAULT");
        require(collateralRatio(owner) < MCR, "HEALTHY");
        require(pool.totalStable() >= v.debt, "POOL_TOO_SMALL"); // exercise: redistribute to other vaults instead

        uint256 reward = (v.coll * LIQUIDATOR_REWARD) / WAD;
        _removeVault(owner, v);
        stable.burn(address(pool), v.debt); // the pool's bpUSD cancels the debt
        collateral.safeTransfer(address(pool), v.coll - reward);
        collateral.safeTransfer(msg.sender, reward);
        emit Liquidated(owner, msg.sender, v.coll, v.debt);
    }

    // ------------------------------------------------------------ redemption

    /// @notice Burn `amount` bpUSD for $1 of collateral per bpUSD (minus the fee), taken from the lowest-CR vaults.
    /// @dev Linear scan to find the riskiest vault: fine for a lab, O(n) gas. Liquity keeps a sorted list instead.
    function redeem(uint256 amount) external returns (uint256 collOut) {
        require(amount > 0, "ZERO");
        uint256 px = price();
        stable.burn(msg.sender, amount);
        uint256 remaining = amount;
        for (uint256 iter = 0; remaining > 0 && iter < 20; iter++) {
            address target = _riskiest();
            require(target != address(0), "NOT_ENOUGH_DEBT");
            Vault storage v = vaults[target];
            require((v.coll * px) / v.debt >= WAD, "LIQUIDATE_FIRST"); // below 100% there isn't $1 of collateral per bpUSD
            uint256 take = remaining < v.debt ? remaining : v.debt;
            if (v.debt - take > 0 && v.debt - take < MIN_DEBT) take = v.debt - MIN_DEBT; // never leave dust debt
            uint256 c = (take * WAD) / px;
            v.debt -= take;
            v.coll -= c;
            totalDebt -= take;
            totalColl -= c;
            collOut += c;
            remaining -= take;
            if (v.debt == 0) {
                uint256 surplus = v.coll;
                _removeVault(target, Vault(surplus, 0));
                if (surplus > 0) collateral.safeTransfer(target, surplus); // fully redeemed owners keep their surplus
            }
        }
        require(remaining == 0, "TOO_MANY_VAULTS");
        uint256 fee = (collOut * REDEMPTION_FEE) / WAD;
        collateral.safeTransfer(treasury, fee);
        collateral.safeTransfer(msg.sender, collOut - fee);
        emit Redeemed(msg.sender, amount, collOut - fee);
        return collOut - fee;
    }

    // ------------------------------------------------------------ internals

    function _riskiest() internal view returns (address best) {
        uint256 bestCr = type(uint256).max;
        for (uint256 i = 0; i < owners.length; i++) {
            Vault memory v = vaults[owners[i]];
            if (v.debt == 0) continue;
            uint256 cr = (v.coll * WAD) / v.debt; // price cancels out when comparing
            if (cr < bestCr) {
                bestCr = cr;
                best = owners[i];
            }
        }
    }

    function _addOwner(address o) internal {
        owners.push(o);
        ownerIndex[o] = owners.length;
    }

    function _removeVault(address o, Vault memory v) internal {
        totalColl -= v.coll;
        totalDebt -= v.debt;
        delete vaults[o];
        uint256 i = ownerIndex[o];
        if (i == 0) return;
        address last = owners[owners.length - 1];
        owners[i - 1] = last;
        ownerIndex[last] = i;
        owners.pop();
        delete ownerIndex[o];
    }
}
