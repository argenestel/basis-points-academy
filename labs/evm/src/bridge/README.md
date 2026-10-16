# Lab: lock-and-mint bridge

Lesson U12·L5 (build a bridge, safely), plus the hack table in U12·L4. Code: [`Bridge.sol`](Bridge.sol). Tests: [`../../test/Bridge.t.sol`](../../test/Bridge.t.sol).

`BridgeVault` locks tokens on the source chain and emits `Locked`. `BridgeMinter` mints the wrapped token on the destination chain when at least `threshold` of `n` signers attest to the message. Each defense maps to a real incident:

| Defense | Test | Incident it answers |
|---|---|---|
| EIP-712 domain with chain id + contract address | `test_crossChainReplayRejected` | Cross-chain signature replay (2026 reports) |
| Message binds source chain, vault and nonce; consumed map | `test_replayRejected`, `test_wrongSourceRejected` | Replays and spoofed sources |
| Signers strictly ascending (no double counting) | `test_duplicateSignatureRejected` | Naive multisig loops |
| Low-s check | (built in) | Signature malleability |
| Threshold signatures | `test_oneSignatureIsNotEnough` | KelpDAO's 1-of-1 verifier (2026) |
| Per-hour mint cap | `test_rateLimitCapsLossesThenResets` | Ronin, Harmony, KelpDAO: losses capped by the window |
| Guardian pause | `test_guardianCanPause` | Incident response |
| Minted ≤ locked | `testFuzz_mintedNeverExceedsLocked` | The invariant watchers must monitor |

```bash
forge test --match-contract BridgeTest -vv
```

## Exercises

1. **The return path.** Burn wrapped tokens on B, emit `Burned`, and unlock on A with signatures. Reuse the domain-separation pattern, and test replay in both directions.
2. **Relayer across two real chains.** Run two `anvil` instances (`--chain-id 1` on port 8545, `--chain-id 42161` on port 8546). Write a relayer in TS (viem) or Python (web3.py) that watches `Locked`, waits N blocks for "finality", gathers 2 of 3 signatures from three signer processes, and calls `mint`.
3. **Reorgs.** Use `anvil_reorg` / `evm_revert` on the source chain after a lock. Show that the relayer must not mint before its confirmation depth.
4. **Watcher.** A separate process compares `vault balance on A` with `wrapped totalSupply on B` every block and calls `setPaused(true)` if minted > locked.
5. **Signer rotation.** Add a timelocked `proposeSigners`/`executeSigners` so a compromised set can be replaced, with a delay users can see.
6. **Large-transfer delay.** Messages above X go into a queue that can be executed only after 6 hours, so the guardian has time to veto.
7. **Read the real thing.** Compare your design with Hyperlane ISMs and LayerZero DVN configuration in the U12·L3 docs. What would a 2-of-3 independent-verifier configuration look like there?
