# Labs

Each lab is a small, readable reference implementation with passing tests, plus exercises in its README. The workflow:

1. Read the matching lesson on the site.
2. Run the tests and read the code top to bottom.
3. Do the exercises in order. Write the failing test first, then make it pass.

| Lab | Lessons | Run | Tests |
|---|---|---|---|
| [`funding-collector`](funding-collector) | U01·L4, U09·L1, U09·L4 | `uv run pytest`, then `uv run python -m funding_collector` | 8 |
| [`toy-chain`](toy-chain) | U03·L1–L6 | `cargo test`, then `cargo run` | 10 |
| [`evm`](evm): [`amm`](evm/src/amm), [`lending`](evm/src/lending), [`bridge`](evm/src/bridge) | U06, U07, U12 | `forge test` | 23 |
| [`perp-engine`](perp-engine) | U09·L1–L5 | `uv run pytest`, then `uv run python simulate.py` | 8 |

## Prerequisites

- **Python** via [uv](https://docs.astral.sh/uv/). It installs Python and dependencies per lab.
- **Rust** via [rustup](https://rustup.rs).
- **Foundry** via [foundryup](https://www.getfoundry.sh/). After cloning, run `git submodule update --init` to fetch `forge-std`.

## Ground rules

- This is learning code. It is unaudited and simplified on purpose; don't deploy it with real money.
- Read-only by default: only the funding collector touches the network, and only public market-data endpoints.
- For anything that signs transactions, use local `anvil` chains or testnets and throwaway keys.
