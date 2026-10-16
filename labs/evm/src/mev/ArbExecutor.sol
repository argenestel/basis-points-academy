// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeTransfer} from "../common/ERC20.sol";
import {Pair} from "../amm/Pair.sol";

interface IERC20Bal {
    function balanceOf(address) external view returns (uint256);
}

/// @title Atomic arbitrage executor, course Unit 11 (MEV) and build track 6
/// @notice Buys on one pool and sells on another in a single transaction, and reverts unless the trade made at
///         least `minProfit`. That revert is the onchain version of a bundle's "only land if profitable" guarantee:
///         if another searcher closes the gap first, we lose only gas (and with a private bundle, not even that).
contract ArbExecutor {
    using SafeTransfer for address;

    address public immutable owner;

    event Arb(address indexed pairBuy, address indexed pairSell, address tokenIn, uint256 amountIn, uint256 profit);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    /// @param pairBuy  pool where tokenIn buys the other token cheaply
    /// @param pairSell pool where the other token is sold back for more tokenIn
    function arb(address pairBuy, address pairSell, address tokenIn, uint256 amountIn, uint256 minProfit)
        external
        onlyOwner
        returns (uint256 profit)
    {
        uint256 before = IERC20Bal(tokenIn).balanceOf(address(this));
        (uint256 mid, address tokenMid) = _swap(pairBuy, tokenIn, amountIn);
        _swap(pairSell, tokenMid, mid);
        uint256 afterBal = IERC20Bal(tokenIn).balanceOf(address(this));
        require(afterBal >= before + minProfit, "NOT_PROFITABLE");
        profit = afterBal - before;
        emit Arb(pairBuy, pairSell, tokenIn, amountIn, profit);
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
    }

    function _swap(address pair, address tokenIn, uint256 amountIn) internal returns (uint256 out, address tokenOut) {
        Pair p = Pair(pair);
        address t0 = p.token0();
        bool zeroForOne = tokenIn == t0;
        require(zeroForOne || tokenIn == p.token1(), "TOKEN_NOT_IN_PAIR");
        tokenOut = zeroForOne ? p.token1() : t0;
        (uint112 r0, uint112 r1) = p.getReserves();
        out = zeroForOne ? p.getAmountOut(amountIn, r0, r1) : p.getAmountOut(amountIn, r1, r0);
        tokenIn.safeTransfer(pair, amountIn);
        p.swap(zeroForOne ? 0 : out, zeroForOne ? out : 0, address(this));
    }
}
