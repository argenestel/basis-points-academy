# Lab: funding-rate collector

Build track 1 · lessons U01·L4 (where yield comes from), U09·L1 (funding), U09·L4 (the basis trade).

Pulls live funding rates from **Hyperliquid** (hourly), **Binance** and **Bybit** (usually 8-hourly), annualizes them, stores them in SQLite, and ranks cross-venue carry: short where funding is highest, long where it's lowest. It only uses public, keyless market-data endpoints and places no orders.

```bash
uv run pytest                                          # offline tests with fixtures
uv run python -m funding_collector                     # one live snapshot -> funding.db + top spreads
uv run python -m funding_collector --loop 3600         # collect hourly
uv run python -m funding_collector --venues hyperliquid,bybit --fee-bps 3.5 --hold-days 30
```

If a venue is geo-blocked or rate-limits you, it's skipped and the error is printed.

## Read the code in this order

1. `core.py`: `annualize()` and `rank_spreads()`. Pure functions, which is where the economics lives.
2. `venues.py`: parsers (tested with fixtures) and fetchers (network).
3. `store.py` and `__main__.py`: persistence and the CLI loop.

## What you'll notice on the first run

The top "spreads" are usually illiquid tokens and stock perps with absurd APRs (thousands of percent). That's the lesson: **funding on thin markets is not harvestable**, because you can't get size in or out and the funding flips. Exercise 1 fixes the ranking.

## Exercises

1. **Liquidity filter.** Skip coins whose open interest on either leg is under $5M. Binance OI needs `/fapi/v1/openInterest?symbol=` per symbol, so batch and cache it. Re-rank, then compare with the raw list.
2. **Symbol mapping.** `1000PEPE` on Binance is `kPEPE` on Hyperliquid. Add an alias table and a test.
3. **History and charts.** Load `funding.db` into DuckDB or pandas. Plot each coin's APR distribution by venue and how often the sign flips.
4. **A fourth venue.** Add the dYdX v4 indexer (`/v4/perpetualMarkets`) with a parser and a fixture test.
5. **Paper trading.** For the top 3 filtered spreads, simulate entering both legs with slippage from order-book depth (Hyperliquid `l2Book`, Binance `/fapi/v1/depth`). Hold 14 days, accrue funding each interval, and report PnL including fees and basis change.
6. **Alerts.** Post to a Discord or Telegram webhook when a filtered spread crosses a threshold, at most once per coin per day.

Done with all six? You have the data layer of a basis-trading desk. Unit 9 · Lesson 4 lists the risks that this ranking ignores (short-leg liquidation, venue failure, ADL).
