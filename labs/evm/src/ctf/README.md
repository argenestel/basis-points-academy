# Wargame: exploit the course's own contracts

Build track 13 · lessons U15 (security), U18·L1 (reading exploits). In the spirit of [Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz/), but against the systems you built earlier in these labs.

Five deliberately broken contracts in [`VulnSystems.sol`](VulnSystems.sol), each a real bug class. For each one there is a Foundry test that **fails until you write the exploit**. Make it pass.

| # | Challenge | Bug class | Maps to |
|---|---|---|---|
| 1 | [Oracle manipulation](../../test/ctf/Challenge1_Oracle.t.sol) | Collateral priced at a manipulable spot AMM | Mango Markets (Oct 2022, ~$117M) |
| 2 | [Vault inflation](../../test/ctf/Challenge2_VaultInflation.t.sol) | ERC-4626 first-depositor / donation | Many 4626 forks |
| 3 | [Reentrancy](../../test/ctf/Challenge3_Reentrancy.t.sol) | Send before effect | TheDAO (2016, ~$60M) |
| 4 | [Flash-loan governance](../../test/ctf/Challenge4_Governance.t.sol) | Votes = current balance, no timelock, arbitrary call | Beanstalk (Apr 2022, ~$182M) |
| 5 | [Signature replay](../../test/ctf/Challenge5_Replay.t.sol) | Authorization doesn't bind recipient / nonce / chain / contract | Cross-chain replay incidents |

## How to play

```bash
cd labs/evm
forge test --match-path 'test/ctf/*'          # all five pass, because they ship solved
```

Each test ships **with the reference solution** between `SOLUTION ▼` / `SOLUTION ▲` markers, so the suite is green. To turn one into a challenge:

1. Open its test file and **delete everything between the markers** (for challenges 3 and 4, also blank the `WellAttacker` / `GovAttacker` contract and rewrite it).
2. Run `forge test --match-contract Challenge1_Oracle -vvv`. It now fails: that's your starting point.
3. Write the exploit. The assertions at the bottom of the test are the win condition. Don't change them.
4. Peek at the solution only after you've tried. Then read the fix below and, as an exercise, patch `VulnSystems.sol` so the exploit stops working while the honest path still does.

Work in order: 3 (reentrancy) and 2 (inflation) are the gentlest; 1 and 4 need a flash loan / a pumped pool; 5 is about what a signature must commit to.

## Hints and fixes

<details><summary>1 — Oracle manipulation</summary>

**Hint:** the pool is shallow. One swap moves `goldPrice()` a long way. Pump it, deposit collateral at the inflated price, borrow the bank dry. **Fix:** never price collateral from a manipulable spot source. Use a decentralized oracle (Chainlink), a long TWAP, and cap borrows by real liquidity (U05·L5, U07·L2).</details>

<details><summary>2 — Vault inflation</summary>

**Hint:** be the first depositor with 1 wei, then donate directly to the vault so the next depositor's shares round to zero. **Fix:** OpenZeppelin's virtual shares/decimals offset, a dead first deposit, or a minimum first deposit (U05·L2).</details>

<details><summary>3 — Reentrancy</summary>

**Hint:** `withdraw()` sends ETH before zeroing your balance. A contract whose `receive()` calls `withdraw()` again drains the well. **Fix:** checks-effects-interactions (zero the balance first), or a `nonReentrant` guard (U02·L3, U05·L3).</details>

<details><summary>4 — Flash-loan governance</summary>

**Hint:** voting power is your current balance. Flash-borrow a majority, call `execute()` with a treasury-transfer payload, repay in the same transaction. **Fix:** snapshot voting power at the proposal's start block (ERC20Votes), add a timelock, and never let one call both pass and execute (U19·L1–L3).</details>

<details><summary>5 — Signature replay</summary>

**Hint:** the signature only covers `amount`. Call `withdraw` with your own `to`, as many times as you like. **Fix:** sign an EIP-712 struct binding `to`, a per-message `nonce`, `block.chainid` and `address(this)`, and mark each digest consumed (U12·L5, the [bridge lab](../bridge)).</details>

## Then go wider

Real challenge sets, from gentlest up: [Ethernaut](https://ethernaut.openzeppelin.com/), [Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz/), [Mr Steal Yo Crypto](https://www.mrstealyocrypto.xyz/), the [Paradigm CTF](https://github.com/paradigmxyz/paradigm-ctf-2023) archives, and [DeFiHackLabs](https://github.com/SunWeb3Sec/DeFiHackLabs) (hundreds of real hacks as Foundry tests). Then audit for money: [CodeHawks](https://codehawks.cyfrin.io/), [Code4rena](https://code4rena.com/), [Sherlock](https://audits.sherlock.xyz/), [Immunefi](https://immunefi.com/).

**This is for learning to defend.** Run it only against these local contracts. Attacking systems you don't own is a crime.
