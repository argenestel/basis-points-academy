# Labs

Each lab is a small, readable reference implementation with passing tests, plus exercises in its README. The workflow:

1. Read the matching lesson on the site.
2. Run the tests and read the code top to bottom.
3. Do the exercises in order. Write the failing test first, then make it pass.

| Lab | Lessons | Stack | Run | Tests |
|---|---|---|---|---|
| [`funding-collector`](funding-collector) | U01·L4, U09·L1, U09·L4 | Python | `uv run pytest`, `uv run python -m funding_collector` | 8 |
| [`toy-chain`](toy-chain) | U03 | Rust | `cargo test`, `cargo run` | 10 |
| [`evm/src/amm`](evm/src/amm) | U06 | Solidity + Foundry | `forge test --match-contract PairTest` | 6 |
| [`evm/src/lending`](evm/src/lending) | U07 | Solidity + Foundry | `forge test --match-contract LendingTest` | 8 |
| [`evm/src/bridge`](evm/src/bridge) | U12 | Solidity + Foundry | `forge test --match-contract BridgeTest` | 9 |
| [`evm/src/privacy`](evm/src/privacy) | U22 | Solidity + Foundry (+ circom or Noir) | `forge test --match-contract ShieldedPoolTest` | 9 |
| [`perp-engine`](perp-engine) | U09 | Python | `uv run pytest`, `uv run python simulate.py` | 8 |
| [`solana-launchpad`](solana-launchpad) | U20, U23 | Rust + Anchor + TypeScript | `anchor test` | 7 + 7 |
| [`dapp-viem`](dapp-viem) | U18 | TypeScript + viem | `npm test`, `npm run demo` | 5 |

**Total: 77 tests**, all passing at the time of writing.

## Prerequisites

- **Python** via [uv](https://docs.astral.sh/uv/).
- **Rust** via [rustup](https://rustup.rs).
- **Foundry** via [foundryup](https://www.getfoundry.sh/). After cloning, run `git submodule update --init` to fetch `forge-std`.
- **Node.js** 20+ for `dapp-viem` and the Anchor tests.
- **Solana CLI + Anchor 0.32** for `solana-launchpad` (see that lab's README for the local-validator note).

## Ground rules

- This is learning code. It is unaudited and simplified on purpose; don't deploy it with real money.
- Only the funding collector touches a network (public market-data endpoints). Everything else runs on local chains: anvil, or the Solana test validator.
- Use throwaway keys. The anvil keys in these labs are public development keys.
