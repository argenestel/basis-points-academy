// Strategy: cross-pool arbitrage between pairs that trade the same two tokens.
import type { Address } from "viem";
import { optimalArb, type Oriented } from "../math.js";

export type PoolView = { address: Address; token0: Address; token1: Address; r0: bigint; r1: bigint };

export type ArbOpportunity = { kind: "arb"; buy: Address; sell: Address; tokenIn: Address; amountIn: bigint; expectedProfit: bigint };

function orient(p: PoolView, quote: Address): Oriented | null {
  if (p.token0.toLowerCase() === quote.toLowerCase()) return { rX: p.r0, rY: p.r1 };
  if (p.token1.toLowerCase() === quote.toLowerCase()) return { rX: p.r1, rY: p.r0 };
  return null;
}

function samePair(a: PoolView, b: PoolView) {
  const ka = [a.token0, a.token1].map((t) => t.toLowerCase()).sort().join();
  const kb = [b.token0, b.token1].map((t) => t.toLowerCase()).sort().join();
  return ka === kb;
}

/** Best opportunity across every ordered pool pair, or null if nothing beats `minProfit` (which should cover gas). */
export function findArb(pools: PoolView[], quote: Address, capital: bigint, minProfit: bigint): ArbOpportunity | null {
  let best: ArbOpportunity | null = null;
  for (const buy of pools) {
    for (const sell of pools) {
      if (buy === sell || !samePair(buy, sell)) continue;
      const ob = orient(buy, quote), os = orient(sell, quote);
      if (!ob || !os) continue;
      const opt = optimalArb(ob, os, capital);
      if (opt.profit >= minProfit && (!best || opt.profit > best.expectedProfit)) {
        best = { kind: "arb", buy: buy.address, sell: sell.address, tokenIn: quote, amountIn: opt.amountIn, expectedProfit: opt.profit };
      }
    }
  }
  return best;
}
