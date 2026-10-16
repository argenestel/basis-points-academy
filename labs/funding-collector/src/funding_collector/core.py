"""Pure functions: annualizing funding and ranking cross-venue spreads. No network here, so it's easy to test."""

from __future__ import annotations

from dataclasses import dataclass

HOURS_PER_YEAR = 24 * 365


@dataclass(frozen=True)
class Snapshot:
    venue: str
    coin: str  # normalized base asset, e.g. "BTC"
    rate: float  # funding rate per interval (0.0001 = 0.01%)
    interval_hours: float  # 1 on Hyperliquid, usually 8 on Binance/Bybit
    mark: float | None = None
    open_interest_usd: float | None = None
    ts: int = 0  # unix seconds

    @property
    def apr(self) -> float:
        return annualize(self.rate, self.interval_hours)


def annualize(rate: float, interval_hours: float) -> float:
    """Simple (non-compounded) annualized funding: rate * periods per year."""
    return rate * HOURS_PER_YEAR / interval_hours


def normalize_symbol(symbol: str) -> str:
    """BTCUSDT -> BTC, ETH-PERP -> ETH, 1000PEPEUSDT -> 1000PEPE (left as-is: see README exercise)."""
    s = symbol.upper()
    for suffix in ("USDT", "USDC", "-PERP", "PERP", "USD"):
        if s.endswith(suffix) and len(s) > len(suffix):
            return s[: -len(suffix)]
    return s


@dataclass(frozen=True)
class Spread:
    coin: str
    short_venue: str  # receive funding here (highest rate)
    long_venue: str  # pay the least here
    gross_apr: float
    net_apr: float


def rank_spreads(snaps: list[Snapshot], taker_fee_bps: float = 4.5, hold_days: float = 14) -> list[Spread]:
    """For each coin on 2+ venues: short where funding is highest, long where lowest.

    net APR subtracts four taker fills (open and close both legs) amortized over the holding period.
    It ignores basis moves, borrow costs and liquidation risk, which are what actually hurt (Unit 9).
    """
    by_coin: dict[str, list[Snapshot]] = {}
    for s in snaps:
        by_coin.setdefault(s.coin, []).append(s)
    fee_apr = 4 * taker_fee_bps / 10_000 * 365 / hold_days
    out = []
    for coin, rows in by_coin.items():
        venues = {r.venue for r in rows}
        if len(venues) < 2:
            continue
        hi = max(rows, key=lambda r: r.apr)
        lo = min(rows, key=lambda r: r.apr)
        if hi.venue == lo.venue:
            continue
        gross = hi.apr - lo.apr
        out.append(Spread(coin, hi.venue, lo.venue, gross, gross - fee_apr))
    return sorted(out, key=lambda s: s.net_apr, reverse=True)
