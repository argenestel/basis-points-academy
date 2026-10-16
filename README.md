# Basis Points Academy

A free, hands-on course for engineers who want to understand DeFi well enough to **build their own protocol**: money and market microstructure, building a chain from scratch, AMMs, lending, stablecoins, perpetual futures, tokenized stocks, MEV, bridges, fundraising and liquidity, security, and a capstone. Content is current to **October 2026**.

**Live site:** https://basis-points-academy.vercel.app

| | |
|---|---|
| 17 units, 81 lessons | Each lesson: an explanation with formulas and code, the primary papers and docs (with summaries), a build task, and a quiz that repeats what you miss |
| 210 sources | Papers, docs, code, post-mortems and data tools, searchable in the Library |
| 9 build tracks | Step checklists, six of them backed by tested starter code in [`labs/`](labs) |
| Timeline and glossary | 2008 → October 2026, and 75 terms |

Progress, streaks and XP (in basis points) are saved in your browser. When the course is opened as a Claude artifact it also has an AI tutor and saves progress to your Claude account; the tutor isn't available on the static site.

## Hands-on labs

Working reference implementations with tests, plus exercises that extend them. See [`labs/README.md`](labs/README.md).

| Lab | Course units | Stack | What you build |
|---|---|---|---|
| [`funding-collector`](labs/funding-collector) | 1, 9 | Python | Live funding rates from Hyperliquid, Binance and Bybit; cross-venue carry ranking |
| [`toy-chain`](labs/toy-chain) | 3 | Rust | Signed transfers, blocks, Merkle state root, mempool, follower validation |
| [`evm/src/amm`](labs/evm/src/amm) | 6 | Solidity + Foundry | Constant-product pair with fuzzed invariants |
| [`evm/src/lending`](labs/evm/src/lending) | 7 | Solidity + Foundry | Kinked rates, index accounting, health factor, liquidations |
| [`evm/src/bridge`](labs/evm/src/bridge) | 12 | Solidity + Foundry | Lock/mint bridge with m-of-n signatures, replay protection and rate limits |
| [`perp-engine`](labs/perp-engine) | 9 | Python | Margin engine with funding and a full liquidation waterfall (book → backstop → insurance → ADL) |

```bash
# prerequisites: uv (Python), Rust, Foundry
cd labs/funding-collector && uv run pytest && uv run python -m funding_collector
cd labs/toy-chain        && cargo test && cargo run
cd labs/evm              && forge test
cd labs/perp-engine      && uv run pytest && uv run python simulate.py
```

## The site

The site is one static HTML file built from `site/src` with no dependencies:

```bash
node site/build.mjs          # writes site/dist/index.html
```

Content lives in `site/src/content/c1.js` … `c5.js` (units, lessons, quizzes, sources, timeline, glossary, build tracks). The app (routing, quiz engine, progress, tutor) is `site/src/app.js`; styles and layout are in `site/src/shell.html`.

### Deploy

Vercel builds it with `vercel.json` (`node site/build.mjs`, output `site/dist`):

```bash
vercel deploy --prod
```

Any static host works too: upload `site/dist/index.html`.

## Contributing

Corrections are welcome, especially for anything after mid-2026, where facts come from news reports and are marked as such. Open an issue or PR with a primary source.

## Disclaimer

Educational material only. Not financial, investment or legal advice. The lab code is for learning: it is unaudited, so don't deploy it with real funds.

## License

MIT, see [LICENSE](LICENSE).
