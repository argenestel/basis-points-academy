"""Crash simulation: 1,000 leveraged traders, a grind down and a gap, then where every loss landed.

Run:  uv run python simulate.py [--gap 0.10] [--seed 1]
"""

import argparse
import random
from collections import Counter, defaultdict

from perp_engine import Engine, Market


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--traders", type=int, default=1000)
    ap.add_argument("--gap", type=float, default=0.10, help="one-step gap down, e.g. 0.10 = -10%%")
    ap.add_argument("--insurance", type=float, default=250_000.0)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    # a thin book: positions above $300k notional go to the backstop vault instead of the book
    e = Engine(market=Market(max_book_liquidation_usd=300_000.0), mark=3000.0, insurance_fund=args.insurance)
    for i in range(args.traders):
        lev = min(19.5, rng.lognormvariate(1.6, 0.6))  # most 3-10x, a fat tail near max
        collateral = rng.lognormvariate(8.5, 1.2)  # median ~$5k, some whales
        side = 1 if rng.random() < 0.72 else -1  # crowded long
        e.open(f"t{i}", side * collateral * lev / e.mark * 0.995, collateral=collateral)

    start_value, price = e.total_value(), e.mark
    stages: Counter = Counter()
    losses: defaultdict = defaultdict(float)
    for step in range(60):
        move = rng.gauss(-0.002, 0.006) - (args.gap if step == 30 else 0.0)
        price *= 1 + move
        for ev in e.set_mark(price):
            stages[ev.kind] += 1
            losses[ev.kind] += ev.amount
        if step % 12 == 0:
            e.apply_funding(0.0001)

    print(f"price 3000 -> {price:,.0f} ({price / 3000 - 1:+.1%}) with a {args.gap:.0%} gap at step 30")
    print(f"{'stage':<10}{'events':>8}{'loss absorbed ($)':>20}")
    for k in ("book", "backstop", "insurance", "adl"):
        print(f"{k:<10}{stages[k]:>8}{losses[k]:>20,.0f}")
    print(f"insurance fund: {args.insurance:,.0f} -> {e.insurance_fund:,.0f}")
    print(f"backstop vault equity: {e.backstop.equity(price):,.0f} (started 10,000,000), position {e.backstop.size:,.1f}")
    print(f"value conserved: {abs(e.total_value() - start_value) < 1e-6 * start_value}")


if __name__ == "__main__":
    main()
