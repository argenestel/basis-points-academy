// Strategy: liquidate unhealthy borrowers on the lending lab's pool (labs/evm/src/lending).
import type { Address } from "viem";

const WAD = 10n ** 18n;
export const CLOSE_FACTOR = WAD / 2n; // 50%
export const LIQ_BONUS = (5n * WAD) / 100n; // 5%

export type BorrowerView = { borrower: Address; healthFactor: bigint; debt: bigint };

export type LiquidationOpportunity = {
  kind: "liquidation"; borrower: Address; repay: bigint; expectedSeized: bigint; expectedProfit: bigint; // profit in loan-token units
};

/** Pure planning step: which borrowers to liquidate and for how much, given capital and the collateral price. */
export function planLiquidations(views: BorrowerView[], price: bigint, capital: bigint, minProfit: bigint): LiquidationOpportunity[] {
  const out: LiquidationOpportunity[] = [];
  let left = capital;
  // most underwater first: lowest health factor gives the safest profit
  for (const v of [...views].sort((a, b) => (a.healthFactor < b.healthFactor ? -1 : 1))) {
    if (v.healthFactor >= WAD || left === 0n) continue;
    const maxRepay = (v.debt * CLOSE_FACTOR) / WAD;
    const repay = maxRepay < left ? maxRepay : left;
    const seized = (repay * (WAD + LIQ_BONUS)) / price; // same formula as LendingPool.liquidate
    const profit = (seized * price) / WAD - repay;
    if (profit < minProfit) continue;
    out.push({ kind: "liquidation", borrower: v.borrower, repay, expectedSeized: seized, expectedProfit: profit });
    left -= repay;
  }
  return out;
}
