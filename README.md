# Basis Points Academy

A free, hands-on course for engineers who want to understand DeFi well enough to **build their own protocol**. It covers:

- money and market microstructure, and building a chain from scratch
- AMMs, lending, stablecoins and perpetual futures
- tokenized stocks, MEV and bridges
- Solana, privacy, governance, launchpads, fundraising and liquidity
- security, and a capstone

Content is current to **October 2026**.

**Live site:** https://basis-points-academy.vercel.app

| | |
|---|---|
| 25 units, 107 lessons, 321 quiz questions | Each lesson: summary first, an explanation with formulas and code, the primary papers and docs (with notes), a build task, and a quiz that repeats what you miss |
| 8 learning tracks | Full course, EVM DeFi builder, Perps and market structure, Chain builder, **Solana builder**, **Privacy engineer**, Launch and tokens, Frontier |
| ~300 sources | Papers, docs, code, post-mortems and data tools, searchable in the Library |
| 12 build tracks | Step checklists; 9 labs with tested starter code in [`labs/`](labs) |
| Timeline and glossary | 2008 → October 2026, and 75 terms |

For reading, the site has a serif or sans toggle, three text sizes, a focus mode, an outline rail and a reading-progress bar. Progress, streaks and XP (in basis points) are saved in your browser. When the course is opened as a Claude artifact it also has an AI tutor and saves progress to your Claude account; the tutor isn't available on the static site.

## Hands-on labs

| Lab | Course units | Stack | What you build |
|---|---|---|---|
| [`funding-collector`](labs/funding-collector) | 1, 9 | Python | Live funding rates from Hyperliquid, Binance and Bybit; cross-venue carry ranking |
| [`toy-chain`](labs/toy-chain) | 3 | Rust | Signed transfers, blocks, Merkle state root, mempool, follower validation |
| [`evm/src/amm`](labs/evm/src/amm) | 6 | Solidity + Foundry | Constant-product pair with fuzzed invariants |
| [`evm/src/lending`](labs/evm/src/lending) | 7 | Solidity + Foundry | Kinked rates, index accounting, health factor, liquidations |
| [`evm/src/bridge`](labs/evm/src/bridge) | 12 | Solidity + Foundry | Lock/mint bridge with m-of-n signatures, replay protection and rate limits |
| [`evm/src/privacy`](labs/evm/src/privacy) | 22 | Solidity + Foundry | Shielded pool: commitments, nullifiers, Merkle tree, and why it needs ZK |
| [`perp-engine`](labs/perp-engine) | 9 | Python | Margin engine with funding and a full liquidation waterfall |
| [`solana-launchpad`](labs/solana-launchpad) | 20, 23 | Rust + Anchor + TS | pump.fun-style bonding curve as a Solana program |
| [`dapp-viem`](labs/dapp-viem) | 18 | TypeScript + viem | Client for the AMM: quotes, simulation, safe writes, events |

```bash
git submodule update --init                    # forge-std for the Solidity labs
cd labs/funding-collector && uv run pytest && uv run python -m funding_collector
cd labs/toy-chain        && cargo test && cargo run
cd labs/evm              && forge test
cd labs/perp-engine      && uv run pytest && uv run python simulate.py
cd labs/solana-launchpad && npm install && anchor test
cd labs/dapp-viem        && npm install && npm test
```

## The site

One static HTML file built from `site/src` with no dependencies:

```bash
node site/build.mjs          # writes site/dist/index.html
```

- **Content:** `site/src/content/c1.js` … `c6.js` (units, lessons, quizzes, sources, timeline, glossary, build tracks, learning tracks).
- **App:** `site/src/app.js` (routing, tracks, quiz engine, progress, reading settings, tutor).
- **Styles and layout:** `site/src/shell.html`.

### Deploy

The repo is connected to Vercel, so every push to `main` deploys. `vercel.json` runs `node site/build.mjs` and serves `site/dist`. Any static host works too: upload `site/dist/index.html`.

## Contributing

Corrections are welcome, especially for anything after mid-2026, where facts come from news reports and are marked as such. Open an issue or PR with a primary source.

## Disclaimer

Educational material only. Not financial, investment or legal advice. The lab code is for learning: it is unaudited, so don't deploy it with real funds.

## License

MIT, see [LICENSE](LICENSE).
