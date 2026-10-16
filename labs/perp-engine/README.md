# Lab: perp margin engine and liquidation waterfall

Build track 5 · lessons U09·L1 (funding), U09·L2 (margin, liquidation, insurance, ADL), U09·L5 (case studies).

A single-market perp engine where every position has a counterparty, so **value is conserved**: tests check that total equity plus the insurance fund doesn't change through a crash. Liquidations run the full loss waterfall:

1. **book**: close against the order book (a market-maker account) with size-dependent slippage
2. **backstop**: positions too big for the book go to an HLP-style backstop vault at the mark price
3. **insurance**: negative equity after a book close is paid by the insurance fund
4. **adl**: when the fund can't cover it, profitable opposing traders are closed at the bankruptcy price

```bash
uv run pytest                                   # 8 tests, including conservation through a crash
uv run python simulate.py                       # 1,000 traders, grind down plus a 10% gap
uv run python simulate.py --gap 0.25 --insurance 50000   # watch ADL take over
```

Example output:

```
price 3000 -> 2,346 (-21.8%) with a 10% gap at step 30
stage       events   loss absorbed ($)
book           235                   0
backstop        15             276,265
insurance      152             335,389
adl             60             100,169
insurance fund: 250,000 -> 40,103
value conserved: True
```

## Read the code in this order

`liquidation_price()` → `Account` → `Engine._fill` (position accounting and realized PnL) → `open` → `apply_funding` → `_liquidate` → `_adl`. Then the tests.

## Exercises

1. **Isolated margin.** Let accounts hold isolated positions whose losses can't touch the rest of the collateral. Test that one isolated blow-up leaves cross positions untouched.
2. **Funding from premium.** Compute funding hourly as `premium + clamp(interest − premium, ±0.05%)` from sampled mark-vs-index premiums, as in U09·L1, instead of passing a rate.
3. **Robust mark price.** Mark = median(oracle, book mid, oracle + EMA(basis)). Show a single manipulated print no longer triggers liquidations.
4. **Leverage tiers.** Raise maintenance margin for larger positions (U09·L2), and rerun the simulation to compare how many accounts reach ADL.
5. **Replay a real day.** Pull 1-minute candles from Hyperliquid (`candleSnapshot` on the info API) for ETH on 2025-10-10, drive `set_mark` with them, and report where losses landed.
6. **Order book.** Replace the market-maker account with a real price-time-priority book (limit orders, cancels, partial fills), and make liquidation slippage come from the book itself.
7. **Port it.** Move the engine into the order-book module of the [toy chain](../toy-chain) (exercise 6 there). That's the core of an appchain perp DEX.
