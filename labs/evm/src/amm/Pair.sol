// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20, SafeTransfer} from "../common/ERC20.sol";

interface IBalance {
    function balanceOf(address) external view returns (uint256);
}

/// @title Constant-product pair (Uniswap v2 style), course Unit 6
/// @notice Pool for two tokens that keeps x * y >= k after a 0.30% fee.
///         Like v2, it is "pull" based: send tokens in first, then call mint/burn/swap.
///         A router (your exercise) does the transfers and slippage checks for users.
contract Pair is ERC20 {
    using SafeTransfer for address;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant FEE_BPS = 30; // 0.30%

    address public immutable token0;
    address public immutable token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint256 private unlocked = 1;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 in0, uint256 in1, uint256 out0, uint256 out1, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(address _token0, address _token1) ERC20("BP LP", "BPLP", 18) {
        require(_token0 != _token1 && _token0 != address(0) && _token1 != address(0), "BAD_TOKENS");
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() public view returns (uint112, uint112) {
        return (reserve0, reserve1);
    }

    /// @notice dy = y * dx_eff / (x + dx_eff), with dx_eff = dx * (1 - fee)
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "BAD_INPUT");
        uint256 inWithFee = amountIn * (10_000 - FEE_BPS);
        return (inWithFee * reserveOut) / (reserveIn * 10_000 + inWithFee);
    }

    /// @notice Mint LP shares for tokens already sent to the pair.
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 r0, uint112 r1) = getReserves();
        uint256 b0 = IBalance(token0).balanceOf(address(this));
        uint256 b1 = IBalance(token1).balanceOf(address(this));
        uint256 a0 = b0 - r0;
        uint256 a1 = b1 - r1;

        if (totalSupply == 0) {
            liquidity = _sqrt(a0 * a1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY); // permanently locked: blocks share-price inflation
        } else {
            liquidity = _min((a0 * totalSupply) / r0, (a1 * totalSupply) / r1);
        }
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);
        _update(b0, b1);
        emit Mint(msg.sender, a0, a1, liquidity);
    }

    /// @notice Burn LP shares already sent to the pair; returns the pro-rata reserves.
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        uint256 b0 = IBalance(token0).balanceOf(address(this));
        uint256 b1 = IBalance(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];

        amount0 = (liquidity * b0) / totalSupply; // rounds down: in the pool's favor
        amount1 = (liquidity * b1) / totalSupply;
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);
        token0.safeTransfer(to, amount0);
        token1.safeTransfer(to, amount1);
        _update(IBalance(token0).balanceOf(address(this)), IBalance(token1).balanceOf(address(this)));
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice Send amountOut tokens to `to`. The caller must have sent input tokens first.
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external lock {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT");
        (uint112 r0, uint112 r1) = getReserves();
        require(amount0Out < r0 && amount1Out < r1, "INSUFFICIENT_LIQUIDITY");
        require(to != token0 && to != token1, "INVALID_TO");

        if (amount0Out > 0) token0.safeTransfer(to, amount0Out);
        if (amount1Out > 0) token1.safeTransfer(to, amount1Out);

        uint256 b0 = IBalance(token0).balanceOf(address(this));
        uint256 b1 = IBalance(token1).balanceOf(address(this));
        uint256 in0 = b0 > r0 - amount0Out ? b0 - (r0 - amount0Out) : 0;
        uint256 in1 = b1 > r1 - amount1Out ? b1 - (r1 - amount1Out) : 0;
        require(in0 > 0 || in1 > 0, "INSUFFICIENT_INPUT");

        // K check on fee-adjusted balances (scaled by 10_000 to stay in integers)
        uint256 adj0 = b0 * 10_000 - in0 * FEE_BPS;
        uint256 adj1 = b1 * 10_000 - in1 * FEE_BPS;
        require(adj0 * adj1 >= uint256(r0) * uint256(r1) * 1e8, "K");

        _update(b0, b1);
        emit Swap(msg.sender, in0, in1, amount0Out, amount1Out, to);
    }

    /// @notice Match reserves to balances (e.g. after someone donated tokens).
    function sync() external lock {
        _update(IBalance(token0).balanceOf(address(this)), IBalance(token1).balanceOf(address(this)));
    }

    function _update(uint256 b0, uint256 b1) private {
        require(b0 <= type(uint112).max && b1 <= type(uint112).max, "OVERFLOW");
        reserve0 = uint112(b0);
        reserve1 = uint112(b1);
        emit Sync(reserve0, reserve1);
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
