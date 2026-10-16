import pytest

from funding_collector.core import Snapshot, annualize, normalize_symbol, rank_spreads
from funding_collector.store import connect, insert
from funding_collector.venues import parse_binance, parse_bybit, parse_hyperliquid


def test_annualize():
    assert annualize(0.0001, 8) == pytest.approx(0.1095)  # 0.01% per 8h ~ 10.95% APR
    assert annualize(0.0000125, 1) == pytest.approx(0.1095)  # Hyperliquid's hourly baseline


def test_normalize_symbol():
    assert normalize_symbol("BTCUSDT") == "BTC"
    assert normalize_symbol("ETH-PERP") == "ETH"
    assert normalize_symbol("SOL") == "SOL"


def test_rank_spreads_picks_short_high_long_low():
    snaps = [
        Snapshot("hyperliquid", "ETH", 0.00003, 1),  # 26.3% APR
        Snapshot("binance", "ETH", 0.0001, 8),  # 10.95%
        Snapshot("bybit", "ETH", 0.00005, 8),  # 5.5%
        Snapshot("bybit", "ONLYONE", 0.001, 8),
    ]
    [s] = rank_spreads(snaps, taker_fee_bps=0, hold_days=14)
    assert (s.coin, s.short_venue, s.long_venue) == ("ETH", "hyperliquid", "bybit")
    assert s.gross_apr == pytest.approx(0.2628 - 0.05475, abs=1e-4)


def test_fees_reduce_net_apr():
    snaps = [Snapshot("a", "X", 0.0001, 8), Snapshot("b", "X", 0.0, 8)]
    [s] = rank_spreads(snaps, taker_fee_bps=5, hold_days=7)
    assert s.net_apr == pytest.approx(s.gross_apr - 4 * 5 / 10_000 * 365 / 7)


def test_parse_hyperliquid_fixture():
    payload = [
        {"universe": [{"name": "BTC"}, {"name": "OLD", "isDelisted": True}]},
        [{"funding": "0.0000125", "markPx": "100000", "openInterest": "10"}, {"funding": "0", "markPx": "1"}],
    ]
    [s] = parse_hyperliquid(payload, ts=1)
    assert s.coin == "BTC" and s.interval_hours == 1 and s.open_interest_usd == 1_000_000


def test_parse_binance_respects_custom_intervals():
    premium = [
        {"symbol": "BTCUSDT", "lastFundingRate": "0.0001", "markPrice": "100000"},
        {"symbol": "DOGEUSDT", "lastFundingRate": "0.0002", "markPrice": "0.2"},
        {"symbol": "BTCUSDC", "lastFundingRate": "0.0001", "markPrice": "100000"},
    ]
    info = [{"symbol": "DOGEUSDT", "fundingIntervalHours": 4}]
    snaps = {s.coin: s for s in parse_binance(premium, info, ts=1)}
    assert set(snaps) == {"BTC", "DOGE"}
    assert snaps["DOGE"].interval_hours == 4 and snaps["BTC"].interval_hours == 8


def test_parse_bybit_fixture():
    tickers = {"result": {"list": [
        {"symbol": "ETHUSDT", "fundingRate": "0.0001", "markPrice": "3000", "openInterestValue": "5000000", "fundingIntervalHour": "8"},
        {"symbol": "ETHPERP", "fundingRate": "", "markPrice": "3000"},
    ]}}
    [s] = parse_bybit(tickers, ts=1)
    assert s.coin == "ETH" and s.open_interest_usd == 5_000_000


def test_store_roundtrip(tmp_path):
    db = connect(str(tmp_path / "f.db"))
    assert insert(db, [Snapshot("binance", "BTC", 0.0001, 8, 1.0, None, 10)]) == 1
    row = db.execute("select venue, coin, apr from funding").fetchone()
    assert row[0] == "binance" and row[1] == "BTC" and row[2] == pytest.approx(0.1095)
