# Labs: AMM, lending, bridge, shielded pool, CDP stablecoin and arbitrage executor (Solidity + Foundry)

One Foundry project, six labs:

| Folder | Track | Lessons | Tests |
|---|---|---|---|
| [`src/amm`](src/amm) | 3 · AMM from scratch | U06·L1–L2 | `test/Pair.t.sol` (6, including 2 fuzz) |
| [`src/lending`](src/lending) | 4 · Lending market | U07·L1–L2 | `test/Lending.t.sol` (8, including 2 fuzz) |
| [`src/bridge`](src/bridge) | 7 · Bridge | U12·L5 | `test/Bridge.t.sol` (9, including 1 fuzz) |
| [`src/privacy`](src/privacy) | 11 · Shielded pool | U22·L1 | `test/ShieldedPool.t.sol` (9, including 1 fuzz) |
| [`src/cdp`](src/cdp) | 8 · CDP stablecoin | U08 | `test/CDP.t.sol` (8 + 2 invariants) |
| [`src/mev`](src/mev) | 6 · MEV bot (contract side; the bot is [`labs/mev-bot`](../mev-bot)) | U11 | `test/ArbExecutor.t.sol` (4) |

```bash
git submodule update --init      # fetches lib/forge-std
forge test                       # 46 tests
forge test --match-contract Bridge -vvv
forge test --gas-report
```

`src/common/ERC20.sol` holds a minimal ERC-20, a mintable `MockToken` for tests, and `SafeTransfer`.

## Deploy to a local chain

```bash
anvil                                                     # terminal 1
export PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil's well-known test key
forge create src/common/ERC20.sol:MockToken --rpc-url http://127.0.0.1:8545 --private-key $PK --broadcast --constructor-args "Token A" A 18
```

Then call it with `cast send` and `cast call`. Writing a `forge script` that deploys a pair and seeds liquidity is a good first exercise.

The exercises for each lab are in the README in its folder.
