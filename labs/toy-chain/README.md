# Lab: toy L1 blockchain

Build track 2 · Unit 3 (build a chain from scratch).

A deterministic state machine with everything a node needs except networking and consensus:

- Ed25519-signed transfers with **nonces and a chain id** (replay protection)
- a **state transition function** over a `BTreeMap` (deterministic iteration, so a deterministic state root)
- blocks committing to **parent hash, tx root and state root**
- a **mempool** with deterministic ordering that holds future-nonce transactions
- **follower validation** that re-executes every block and rejects lying proposers

```bash
cargo test     # 10 tests: replay, wrong chain, forged signatures, lying state root, follower agreement...
cargo run      # proposer + follower agree on 3 blocks
```

## Read the code in this order

`lib.rs` from top to bottom: `merkle_root` → `Tx` → `State::apply_tx` (the STF) → `Header`/`Block` → `Node::produce_block` (proposer) → `Node::apply_block` (follower). Then read the tests: each one is an attack that the design stops.

## Exercises

Write the failing test first for each one.

1. **Merkle proofs.** Add `State::proof(addr) -> Vec<(Hash, bool)>` and a standalone `verify(root, addr, account, proof)`. That's what light clients and bridges consume (U02·L1, U12).
2. **Fees and priority.** Add `fee` to `Tx`, credit it to the proposer, order the mempool by fee within nonce constraints, and evict the lowest fee when the pool is full.
3. **JSON-RPC.** Expose `sendTx`, `getBalance`, `getBlock` and `getProof` with `axum`.
4. **Persistence.** Store blocks and state in `sled` or RocksDB, and restart from disk with an identical state root.
5. **Consensus.** Run 4 validators as threads with `std::sync::mpsc` channels and implement one Tendermint height: propose → prevote → precommit with 2/3+ quorums and a round timeout. Add a Byzantine validator that double-votes and check that safety holds (U03·L2).
6. **Order book module.** Add `PlaceOrder`/`Cancel` transactions and a price-time-priority book in state, with fixed-point prices and cancels processed before takers in each block (U03·L6, U09·L3).
7. **Shortcut to production.** Port the STF to an ABCI app on CometBFT and get real consensus and networking for free.

Finish 5 and 6 and you have built a tiny Hyperliquid or dYdX.
