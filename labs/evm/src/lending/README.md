# Lab: lending pool

Lessons U07·L1 (rate curves) and U07·L2 (health factor and liquidations). Code: [`LendingPool.sol`](LendingPool.sol). Tests: [`../../test/Lending.t.sol`](../../test/Lending.t.sol).

One loan asset and one collateral asset:

- a kinked rate curve: 4% at the 80% kink, 34% at 90% utilization
- interest through two global indices (`borrowIndex`, `supplyIndex`), so accrual is O(1) for any number of users
- a 10% reserve factor
- an 80% LTV for borrowing and an 85% liquidation threshold
- a 50% close factor and a 5% liquidation bonus
- an oracle staleness check

Every rounding choice favors the pool.

```bash
forge test --match-contract LendingTest -vv
```

## Exercises

1. **Decimals.** Support a 6-decimal loan token (USDC) with an 18-decimal collateral. Add tests at both scales.
2. **Invariant suite.** Write a handler contract that randomly supplies, borrows, repays, warps time, moves the price and liquidates. Assert after every call: cash + total debt ≥ total supply assets + reserves (within rounding), and no healthy account can be liquidated.
3. **Bad debt.** When collateral runs out before debt (a crash past the bonus), track the leftover as bad debt. Socialize it to suppliers by lowering `supplyIndex`, and write the test for it.
4. **Multiple collaterals.** Generalize the health factor to a list of collateral assets, each with its own LTV and LT (U07·L2).
5. **Dutch-auction liquidations.** Replace the fixed bonus with a bonus that starts at 0% and rises over time until someone liquidates (U01·L6). Compare liquidator profits in a simulation.
6. **Liquidation bot.** Deploy to `anvil` and write a bot (Python, TS or Rust) that indexes `Borrow` events, tracks health factors off-chain, and liquidates when HF < 1 using a flash swap from the AMM lab (U11·L5).
