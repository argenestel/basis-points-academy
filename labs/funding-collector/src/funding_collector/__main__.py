"""CLI.

  uv run python -m funding_collector                 # collect once, print top spreads
  uv run python -m funding_collector --loop 3600     # collect every hour into funding.db
  uv run python -m funding_collector --venues hyperliquid,bybit --top 20
"""

from __future__ import annotations

import argparse
import sys
import time

from .core import rank_spreads
from .store import connect, insert
from .venues import FETCHERS


def collect(venues: list[str]):
    snaps, errors = [], {}
    for v in venues:
        try:
            snaps += FETCHERS[v]()
        except Exception as e:  # one venue failing (geo-block, rate limit) must not stop the others
            errors[v] = f"{type(e).__name__}: {e}"
    return snaps, errors


def report(snaps, top: int, fee_bps: float, hold_days: float) -> None:
    spreads = rank_spreads(snaps, fee_bps, hold_days)
    print(f"{'coin':<10}{'short (receive)':<17}{'long (pay)':<13}{'gross APR':>11}{'net APR':>10}")
    for s in spreads[:top]:
        print(f"{s.coin:<10}{s.short_venue:<17}{s.long_venue:<13}{s.gross_apr:>10.1%}{s.net_apr:>10.1%}")
    if not spreads:
        print("(no coin is listed on two of the venues that answered)")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="funding_collector")
    ap.add_argument("--venues", default="hyperliquid,binance,bybit")
    ap.add_argument("--db", default="funding.db")
    ap.add_argument("--loop", type=int, default=0, help="seconds between collections; 0 = run once")
    ap.add_argument("--top", type=int, default=15)
    ap.add_argument("--fee-bps", type=float, default=4.5, help="taker fee per fill, in bps")
    ap.add_argument("--hold-days", type=float, default=14)
    args = ap.parse_args(argv)

    venues = [v.strip() for v in args.venues.split(",") if v.strip()]
    unknown = [v for v in venues if v not in FETCHERS]
    if unknown:
        print(f"unknown venues: {unknown}; choose from {sorted(FETCHERS)}", file=sys.stderr)
        return 2

    db = connect(args.db)
    while True:
        snaps, errors = collect(venues)
        n = insert(db, snaps)
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{stamp}] stored {n} snapshots in {args.db}")
        for v, err in errors.items():
            print(f"  {v} failed: {err}", file=sys.stderr)
        report(snaps, args.top, args.fee_bps, args.hold_days)
        if not args.loop:
            return 0 if snaps else 1
        time.sleep(args.loop)


if __name__ == "__main__":
    raise SystemExit(main())
