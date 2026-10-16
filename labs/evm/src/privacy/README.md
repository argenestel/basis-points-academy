# Lab: shielded pool (transparent edition)

Build track 11 · lessons U22·L1 (how shielded pools work) and U22·L3 (privacy pools). Code: [`ShieldedPoolLite.sol`](ShieldedPoolLite.sol). Tests: [`../../test/ShieldedPool.t.sol`](../../test/ShieldedPool.t.sol).

All the data structures of a Tornado-style pool:

- `commitment = H(nullifier, secret)` inserted into a depth-20 **incremental Merkle tree**
- a **root history** of the last 30 roots, so a withdrawal built against a slightly old root still works
- a **spent-nullifier set** to stop double spends
- fixed **denomination** (0.1 ETH)
- **relayer fees**, so a fresh address never needs gas

What it leaves out is the zero-knowledge proof. `withdraw` reveals the nullifier, secret and leaf index, so anyone can link the deposit to the withdrawal. One test, `test_liteVersionCanBeFrontRun`, shows a mempool watcher copying a pending withdrawal and stealing it. That's why the real version proves membership in zero knowledge and binds `recipient`, `relayer` and `fee` as public inputs.

```bash
cd labs/evm && forge test --match-contract ShieldedPoolTest -vv     # 9 tests including a fuzz test
```

The test file also keeps an **offchain mirror** of the tree (`_path`), the same job a wallet or relayer does to build Merkle paths.

## Exercises

1. **The circuit.** Write `withdraw.circom` (or Noir): private inputs `nullifier, secret, pathElements[20], pathIndices[20]`; public inputs `root, nullifierHash, recipient, relayer, fee`. Constrain `H(nullifier, secret)` to be a leaf under `root` and `nullifierHash = H(nullifier)`. Include `recipient` in a dummy constraint (square it) so the proof binds it.
2. **Hash choice.** keccak is very expensive in circuits. Switch the tree to **Poseidon** in both the circuit and the contract (circomlibjs can generate a Poseidon contract).
3. **Verifier.** Generate a Groth16 verifier with snarkjs (or Noir's Solidity backend), and change `withdraw` to take `(proof, root, nullifierHash, recipient, relayer, fee)`. Rerun the front-running test: it must now fail.
4. **Privacy pools.** Add an association-set root maintained by a provider, require proofs of membership in both trees, and add `ragequit` for deposits never approved (U22·L3).
5. **Relayer.** A small service that accepts proofs over HTTP, checks the fee covers gas, and submits the withdrawal.
6. **Measure the anonymity set.** Simulate 1,000 deposits and withdrawals with realistic timing, and show how quickly timing analysis shrinks the effective set. Then add a recommended minimum delay.

Before you deploy anything like this for real, read U22·L2 on the Tornado Cash cases.
