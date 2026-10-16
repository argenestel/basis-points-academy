# Lab: dApp client with viem

Build track 12 · lessons U18·L2 (viem) and U18·L3 (frontends that can't be turned against users).

A TypeScript client for the [AMM lab](../evm/src/amm), tested against a real local chain:

- deploy two tokens and a pair from Foundry's build artifacts
- quote exact-in swaps with the pair's own math, plus price impact
- **simulate → write → wait** for every transaction, with decoded revert reasons (`"K"`)
- slippage-protected swaps that refuse a stale quote after someone else moves the price
- read `Swap` events back as a trade history

```bash
(cd ../evm && forge build)     # the client loads ABIs and bytecode from labs/evm/out
npm install
npm test                       # starts anvil, runs 5 tests
npm run demo                   # deploy, quote, swap, read events
```

Example demo output:

```
pair 0x9fe4...: 100 A / 300,000 B
quote 1 A -> 2961.47 B (fee + price impact 1.28%)
quote 10 A -> 27198.33 B (fee + price impact 9.33%)
swapped 1 A for 2961.47 B (min was 2946.67)
```

## Read the code in this order

`src/amm.ts`: `clients` → `write` (the simulate, write, wait pattern) → `quoteExactIn` → `swapExactIn` → `revertReason`. Then `test/amm.test.ts`, where each test is a behavior a frontend must get right.

## Exercises

1. **Typed ABIs.** Generate `as const` ABIs from Foundry's artifacts (for example with `@wagmi/cli`) so function names and arguments are checked at compile time.
2. **Router.** After the AMM lab's Router exercise, swap through it in one atomic transaction with `amountOutMin` and a deadline, and delete the two-step transfer-then-swap.
3. **A web page.** Build a single page (Vite or plain ES modules) that connects an injected wallet (EIP-1193 `window.ethereum`), shows a quote, price impact and minimum out, and swaps.
4. **Safety checks before every write.** Verify the chain id, check that the target's bytecode hash matches a pinned value, refuse unlimited approvals, and show a plain-language summary of simulated balance changes (U18·L3).
5. **Live chart.** Use `watchContractEvent` on `Swap` to stream prices into a chart, and reconcile with `getContractEvents` after reconnects.
6. **Point it at a fork.** Run `anvil --fork-url $ETH_RPC` and quote against a real Uniswap v2 pair with the same code (the interface matches).
