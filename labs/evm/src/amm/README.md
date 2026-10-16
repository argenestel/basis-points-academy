# Lab: constant-product AMM

Lessons U06·L1 (x · y = k) and U06·L2 (impermanent loss and LVR). Code: [`Pair.sol`](Pair.sol). Tests: [`../../test/Pair.t.sol`](../../test/Pair.t.sol).

A Uniswap v2-style pair: users send tokens to the pair first, then call `mint`, `burn` or `swap`. The 0.30% fee stays in the pool, so k grows. The first deposit locks `MINIMUM_LIQUIDITY` to block share-price inflation attacks.

```bash
forge test --match-contract PairTest -vv
```

## Exercises

1. **Router.** Write `Router.sol` with `addLiquidity(amountADesired, amountBDesired, amountAMin, amountBMin, deadline)` and `swapExactTokensForTokens(amountIn, amountOutMin, path, deadline)`. Test slippage and deadline reverts, and a 2-hop path.
2. **TWAP oracle.** Add `price0CumulativeLast`/`price1CumulativeLast` (UQ112x112) updated in `_update`. Write a consumer that reads a 30-minute TWAP, and show in a test that one-block manipulation barely moves it (U05·L5).
3. **Flash swaps.** Let `swap` call `to.onSwap(data)` before the K check so a borrower can repay in the same transaction. Write an arbitrage contract between two pairs that uses it.
4. **Attack it.** Write a test where someone donates tokens and calls `sync()`. Who gains, who loses? Then show why a lending protocol that prices collateral at this pair's spot price is exploitable with a flash swap (U07·L5).
5. **Measure LVR.** In a Python notebook, simulate GBM prices, let an arbitrageur trade the pool to the market price each step, and compare LP fees with σ²/8 · V (U06·L2). Find the fee where LPs break even at 80% volatility.
6. **Move to v4.** Re-implement the fee as a Uniswap v4 dynamic-fee hook that rises with recent volatility (U06·L5).
