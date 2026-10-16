# ArbExecutor: the on-chain half of the MEV bot

[`ArbExecutor.sol`](ArbExecutor.sol) buys on one pool and sells on another in a single transaction, and **reverts unless it made at least `minProfit`**. That's the on-chain version of a bundle's "only land if profitable" guarantee. Tests: [`../../test/ArbExecutor.t.sol`](../../test/ArbExecutor.t.sol) (profit closes the gap, a repeat reverts, the wrong direction reverts, owner-only).

The off-chain half (finding, sizing, simulating and sending trades, plus liquidations) is the TypeScript searcher in [`labs/mev-bot`](../../../mev-bot).

```bash
cd labs/evm && forge test --match-contract ArbExecutorTest -vv
```
