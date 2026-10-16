// Off-chain math with exactly the contract's integer rounding, so predictions match execution to the wei.

export const FEE_BPS = 30n;

/** Uniswap v2 / Pair.sol getAmountOut. */
export function amountOut(amountIn: bigint, rIn: bigint, rOut: bigint): bigint {
  if (amountIn <= 0n || rIn <= 0n || rOut <= 0n) return 0n;
  const f = amountIn * (10_000n - FEE_BPS);
  return (f * rOut) / (rIn * 10_000n + f);
}

/** Reserves seen from the quote token X: rX = X in the pool, rY = the other token. */
export type Oriented = { rX: bigint; rY: bigint };

/** Profit in X of: spend dx of X buying Y on pool `buy`, then sell all that Y on pool `sell`. */
export function arbProfit(dx: bigint, buy: Oriented, sell: Oriented): bigint {
  const y = amountOut(dx, buy.rX, buy.rY);
  return amountOut(y, sell.rY, sell.rX) - dx;
}

/**
 * Profit is concave in trade size: small trades earn little, big trades push both pools past each other.
 * Ternary search on integers finds the peak, then a short linear scan fixes rounding at the top.
 */
export function optimalArb(buy: Oriented, sell: Oriented, maxIn: bigint): { amountIn: bigint; profit: bigint } {
  let lo = 0n, hi = maxIn;
  while (hi - lo > 2n) {
    const m1 = lo + (hi - lo) / 3n, m2 = hi - (hi - lo) / 3n;
    if (arbProfit(m1, buy, sell) < arbProfit(m2, buy, sell)) lo = m1; else hi = m2;
  }
  let best = { amountIn: 0n, profit: 0n };
  for (let x = lo; x <= hi; x++) {
    const p = arbProfit(x, buy, sell);
    if (p > best.profit) best = { amountIn: x, profit: p };
  }
  return best;
}
