# Lab: MEV searcher (arbitrage + liquidations)

Build track 6 · lessons U11·L1 (what MEV is), U11·L4 (CEX–DEX arbitrage), U11·L5 (build a searcher), U07·L2 (liquidations).

A small searcher with the same shape as production bots (and Paradigm's Artemis):

```
collect (pool reserves, Borrow events, oracle price)
  → mirror state in memory
  → strategies propose opportunities (pure functions, easy to test)
  → simulate each one against current state
  → execute what still works; skip what doesn't, without paying gas
  → account (PnL) and stop on a kill switch
```

Two strategies against the course's own contracts on a local chain:

- **Cross-pool arbitrage** (`src/strategies/arbitrage.ts`): two ETH/USD pools at $1,900 and $2,100. The bot finds the profit-maximizing trade size with a ternary search over exact integer math (`src/math.ts`), and executes through [`ArbExecutor.sol`](../evm/src/mev/ArbExecutor.sol), which **reverts unless the trade is profitable**. That's the on-chain version of a bundle's all-or-nothing guarantee.
- **Liquidations** (`src/strategies/liquidation.ts`): discovers borrowers from `Borrow` events, reads health factors, and liquidates the most underwater first, up to the close factor, for the 5% bonus. It runs on the [lending lab](../evm/src/lending) pool.

```bash
(cd ../evm && forge build)     # ABIs and bytecode for Pair, ArbExecutor, LendingPool
npm install
npm test                       # starts anvil, runs 6 tests
npm run demo
```

Demo output:

```
block 1: ETH is $1,900 on one pool and $2,100 on the other
  arb: buy on 0x9fe4…, sell on 0xcf7e…, size $45,959.58, predicted $2,213.46 -> executed $2,213.46
block 2: nothing left to do
  (no opportunity above the $10 minimum; no transaction sent)
block 3: the oracle drops ETH to $1,800, pushing a borrower below health factor 1
  liquidation of 0x7099…: repay $8,000, predicted $400 -> executed $400
total PnL: $2,613.46
```

## What the tests prove

1. Off-chain `amountOut` matches `Pair.getAmountOut` to the wei. If your math rounds differently from the contract, you'll mis-size every trade.
2. The chosen size beats nearby sizes, because profit is concave in size.
3. Realized profit equals predicted profit exactly.
4. When the gap is closed, the bot sends nothing.
5. **A rival front-runs the bot.** The opportunity is still in the plan, but simulation now reverts with `NOT_PROFITABLE`, so the bot skips it and the block number doesn't move.
6. After an oracle price drop, the bot liquidates at a profit, and the borrower's health factor improves.

## Read the code in this order

`math.ts` → `strategies/arbitrage.ts` → `strategies/liquidation.ts` → `bot.ts` (`plan` / `execute` / `tick`) → `test/bot.test.ts`.

## Exercises

1. **Event-driven state.** Replace `pools()` polling with `watchContractEvent` on `Sync`, so state updates as blocks arrive, and drive `tick()` from `watchBlockNumber`.
2. **Gas-aware minimum.** Estimate gas with `estimateContractGas`, price it with `getGasPrice` and an ETH/USD price, and require `profit > gas cost × 1.2`.
3. **Flash-loan liquidations.** Liquidate with zero capital: borrow the repay amount (add flash swaps to the AMM lab's Pair: exercise 3 there), liquidate, sell the seized ETH, repay, keep the rest. Do it all in one contract call.
4. **Three-pool routes.** Add a third token and search triangular arbitrage (USD → ETH → BTC → USD).
5. **Mainnet fork, read-only.** Run `anvil --fork-url $ETH_RPC`, point the bot at two real Uniswap v2 / Sushiswap pairs, and log how often an opportunity above $10 exists per block. Don't send anything to mainnet.
6. **Private submission.** Read the Flashbots docs and sketch how `execute` would send a bundle to a builder instead of the public mempool, and what changes when a failed bundle costs nothing.

**Ethics:** arbitrage and liquidations make markets more efficient and keep lenders solvent. Sandwiching users harms them. This lab teaches you to detect sandwich attacks (U11·L1) but doesn't build one.
