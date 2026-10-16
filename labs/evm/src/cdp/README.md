# Lab: CDP stablecoin (Liquity-style)

Build track 8 · lessons U08·L1 (stablecoin designs), U08·L2 (pegs and runs), U07·L2 (liquidations). Code: [`CDP.sol`](CDP.sol). Tests: [`../../test/CDP.t.sol`](../../test/CDP.t.sol).

Lock WETH, mint **bpUSD** against it:

| Mechanism | Rule | Why it matters |
|---|---|---|
| Minimum collateral ratio | 110% to open and to stay open | The safety buffer |
| Borrowing fee | 0.5%, added to debt and minted to the treasury | bpUSD supply always equals total debt |
| Stability pool | bpUSD deposits absorb liquidated debt and receive the collateral | Instant liquidation capacity; depositors buy collateral at a discount |
| Liquidation | Any vault under 110%; caller earns 0.5% of collateral | Keeps the system overcollateralized |
| **Redemption** | Anyone swaps bpUSD for $1 of collateral (−0.5%) from the **riskiest** vault | A hard price floor: if bpUSD trades at $0.97, arbitrageurs redeem until it's back near $1 |

```bash
cd labs/evm && forge test --match-path test/CDP.t.sol -vv     # 8 unit tests + 2 invariants
```

The **invariant tests** run 3,200 random actions (open, redeem, close across three users) and check after every call that:

- `bpUSD.totalSupply() == totalDebt`
- the manager holds exactly the collateral it accounts for

## Read the code in this order

`StableCoin` (mint and burn only by the manager) → `StabilityPool` (share accounting, like ERC-4626) → `CDPManager.open` → `liquidate` → `redeem` (the peg mechanism) → the tests.

## Exercises

1. **Peg arbitrage bot.** Add a bpUSD/USDC pool from the AMM lab. When bpUSD trades below $0.995, buy it on the pool and `redeem` it. When it trades above $1.10 (the ceiling, since you can always open a vault at 110%), mint and sell. Reuse the [MEV bot lab](../../../mev-bot)'s plan/simulate/execute loop.
2. **Crash test.** Write a test that drops ETH 40% in one step with 20 vaults at random ratios, liquidates everything possible, and reports how much debt the stability pool absorbed, which vaults went below 100%, and what's left unbacked.
3. **Redistribution.** When the stability pool is too small (`POOL_TOO_SMALL`), spread the bad vault's debt and collateral across all other vaults pro rata, as Liquity v1 does. Keep the invariants green.
4. **Sorted vaults.** Replace the O(n) `_riskiest` scan with a sorted linked list using insert hints (Liquity's `SortedTroves`), and measure the gas difference at 1,000 vaults.
5. **Recovery mode.** When the system-wide ratio drops below 150%, allow liquidating vaults under 150% and forbid actions that lower the system ratio.
6. **Interest rates.** Add a per-vault interest rate the borrower chooses (Liquity v2-style), redeeming against the lowest-rate vaults first. Explain why that ties the peg to borrowing rates.
