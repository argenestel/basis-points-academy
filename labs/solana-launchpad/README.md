# Lab: Solana bonding-curve launchpad (Anchor)

Build track 10 · lessons U20·L1 (bonding curve math), U20·L3 (snipers and rugs), U23·L1–L2 (accounts, Anchor, security).

A pump.fun-style launchpad as a real Solana program:

- `create`: a new SPL mint whose **mint authority is the curve PDA**, so nobody can mint outside the curve, and with **no freeze authority**
- `buy`: pay SOL plus a 1% creator fee and receive tokens priced on a **constant product over virtual reserves** (30 SOL / 1.073B tokens)
- `sell`: burn tokens and get SOL back from the curve account, minus 1%
- **graduation**: when 793.1M tokens are sold (about 85 SOL raised), trading stops. The last buyer is capped and charged only for what they get.

The math lives in `programs/solana_launchpad/src/curve.rs` with host unit tests. Every rounding goes in the curve's favor, so k never decreases.

## Run

```bash
npm install                                   # TypeScript test deps
anchor keys sync                              # first time only: point declare_id! at your local program keypair
(cd programs/solana_launchpad && cargo test --lib)   # 7 curve-math tests on the host
anchor test                                   # build SBF, start a local validator, deploy, run 7 TS tests
```

**Validator note:** Agave 3.1 no longer ships `solana-test-validator` in the default install. If `anchor test` says it can't spawn it, either install an Agave 3.0.x release and add its `bin` to the **end** of your `PATH`, or use [Surfpool](https://github.com/solana-foundation/surfpool) as the local validator. Keep the current `cargo-build-sbf` first on `PATH`, because older platform tools can't build current crates.

What the TypeScript tests check (`tests/solana_launchpad.ts`):

1. create sets virtual reserves, makes the PDA the mint authority, and leaves no freeze authority
2. a buy matches the curve exactly (BN math) and the creator receives the 1% fee
3. the same SOL buys fewer tokens as the price rises
4. a sell burns tokens and pays SOL minus the fee, to the lamport
5. slippage protection rejects a buy
6. graduation at the curve supply (about 85 SOL), with the whale charged well under its 150 SOL budget
7. trading is closed after graduation

## Read the code in this order

`curve.rs` (pure math) → `lib.rs` `Create` / `Buy` / `Sell` account structs (every constraint is a security check) → the three instructions. Notice the three ways lamports move: a System Program CPI (buy), direct debits from a program-owned account (sell), and a PDA signing a Token Program CPI (mint).

## Exercises

1. **Break it on purpose.** Remove `has_one = creator` from `Sell` and write a test where a seller passes their own wallet as `creator` to steal the fee. Put it back (U23·L2).
2. **Anti-sniper fee.** Store the creation slot, and charge a fee that starts at 50% and decays linearly to 1% over 20 slots. Test a same-slot buy against a later one (U20·L3).
3. **Graduation migration.** On completion, move the raised SOL and the remaining 206.9M tokens into a constant-product pool (your own, or a CPI to an AMM), then burn the LP tokens.
4. **Token metadata.** Add name, symbol and URI with Token-2022's metadata extension, or Metaplex. Show a client-side risk report for any mint: authorities and extensions (U23·L3).
5. **Compute budget.** Measure compute units with `simulateTransaction` and set the limit and a priority fee from `getRecentPrioritizationFees` for the curve account (U23·L4).
6. **Devnet and a UI.** Deploy to devnet and build a one-page UI that shows price, progress to graduation and a buy box, using `@solana/kit` or the Anchor client.
