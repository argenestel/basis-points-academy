"""Public, keyless endpoints for three venues. Parsers are separate from fetchers so tests can use fixtures."""

from __future__ import annotations

import json
import time
import urllib.request

from .core import Snapshot, normalize_symbol

UA = {"User-Agent": "basis-points-academy-funding-collector/0.1", "Content-Type": "application/json"}


def _get(url: str, timeout: float = 15) -> object:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def _post(url: str, body: dict, timeout: float = 15) -> object:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=UA, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


# ---------------------------------------------------------------- Hyperliquid (hourly funding)

def parse_hyperliquid(payload: list, ts: int) -> list[Snapshot]:
    """payload = [meta, assetCtxs] from POST /info {"type": "metaAndAssetCtxs"}."""
    meta, ctxs = payload
    out = []
    for asset, ctx in zip(meta["universe"], ctxs):
        if asset.get("isDelisted"):
            continue
        mark = float(ctx["markPx"]) if ctx.get("markPx") else None
        oi = float(ctx["openInterest"]) * mark if mark and ctx.get("openInterest") else None
        out.append(Snapshot("hyperliquid", asset["name"].upper(), float(ctx["funding"]), 1.0, mark, oi, ts))
    return out


def fetch_hyperliquid() -> list[Snapshot]:
    return parse_hyperliquid(_post("https://api.hyperliquid.xyz/info", {"type": "metaAndAssetCtxs"}), int(time.time()))


# ---------------------------------------------------------------- Binance USD-M futures

def parse_binance(premium_index: list, funding_info: list, ts: int) -> list[Snapshot]:
    """premium_index from /fapi/v1/premiumIndex; funding_info from /fapi/v1/fundingInfo (only symbols with non-default intervals)."""
    intervals = {row["symbol"]: float(row["fundingIntervalHours"]) for row in funding_info}
    out = []
    for row in premium_index:
        sym = row["symbol"]
        if not sym.endswith("USDT"):
            continue
        out.append(Snapshot("binance", normalize_symbol(sym), float(row["lastFundingRate"]), intervals.get(sym, 8.0), float(row["markPrice"]), None, ts))
    return out


def fetch_binance() -> list[Snapshot]:
    base = "https://fapi.binance.com/fapi/v1"
    return parse_binance(_get(f"{base}/premiumIndex"), _get(f"{base}/fundingInfo"), int(time.time()))


# ---------------------------------------------------------------- Bybit linear perps

def parse_bybit(tickers: dict, ts: int) -> list[Snapshot]:
    """tickers from /v5/market/tickers?category=linear."""
    out = []
    for row in tickers["result"]["list"]:
        sym = row["symbol"]
        if not sym.endswith("USDT") or not row.get("fundingRate"):
            continue
        interval = float(row.get("fundingIntervalHour") or 8)
        oi = float(row["openInterestValue"]) if row.get("openInterestValue") else None
        out.append(Snapshot("bybit", normalize_symbol(sym), float(row["fundingRate"]), interval, float(row["markPrice"]), oi, ts))
    return out


def fetch_bybit() -> list[Snapshot]:
    return parse_bybit(_get("https://api.bybit.com/v5/market/tickers?category=linear"), int(time.time()))


FETCHERS = {"hyperliquid": fetch_hyperliquid, "binance": fetch_binance, "bybit": fetch_bybit}
