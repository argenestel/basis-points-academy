window.BP_UNITS.push({
  id: "u9", t: "Perpetual futures, deep dive", tag: "Perps",
  d: "Funding, mark price, margin and liquidation engines, venue architectures, the basis trade, failure case studies and the 2025–26 perp DEX war.",
  lessons: [
  {
    id: "u9l1", t: "Perp mechanics: index, mark and funding", min: 15,
    sum: "How a future with no expiry stays pinned to spot, with the actual funding formulas.",
    body: `<p>A perpetual future (BitMEX popularized it in 2016, building on Shiller's 1990s idea) is a futures contract that never expires. Three prices matter:</p>
<ul><li><b>Index / oracle price</b>: an external spot reference, usually a weighted median of major exchanges.</li>
<li><b>Mark price</b>: a robust fair price used for margin and liquidations. Hyperliquid combines the oracle, its own book and external perp prices so that one manipulated print can't trigger liquidations.</li>
<li><b>Last traded price</b>: what the order book is printing.</li></ul>
<h4>Funding</h4>
<pre><code>premium P = (impact_bid/ask midpoint of perp − index) / index, sampled and averaged
funding rate F = P + clamp(interest − P, −0.05%, +0.05%)       (common Binance/Hyperliquid shape)
Hyperliquid: interest = 0.01% per 8h, paid hourly at 1/8 of the 8h rate; capped at 4%/hour
payment per interval = position size × oracle price × F
F > 0: longs pay shorts   ·   F < 0: shorts pay longs</code></pre>
<p>If the perp trades above spot, longs pay shorts. That makes holding longs expensive and shorting attractive, which pushes the perp back down. Funding moves value between traders. The venue doesn't collect it.</p>
<h4>Why funding is usually positive</h4>
<p>Crypto traders want leveraged long exposure more than they want shorts. The interest term also builds in a small positive bias that reflects the cost of capital. Positive funding is the "price of leverage" that delta-neutral strategies like Ethena collect.</p>`,
    keys: ["Index (external), mark (robust fair), last (book)", "F = premium + clamp(interest − premium, ±0.05%)", "Positive funding: longs pay shorts", "Funding moves between traders; it's not a venue fee"],
    src: [
      ["Hyperliquid docs: funding", "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding", "D", "Exact formula, interval, cap and impact prices."],
      ["Hyperliquid docs: oracle", "https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/oracle", "D", "How validators publish the index."],
      ["He, Manela, Ross, von Wachter, Fundamentals of Perpetual Futures", "https://arxiv.org/abs/2212.06888", "P", "Theory of perp pricing and empirical deviations."],
      ["Ackerer, Hugonnier, Jermann, Perpetual Futures Pricing", "https://arxiv.org/abs/2310.11771", "P", "Formal no-arbitrage pricing of perps with different funding designs."]
    ],
    build: "Pull Hyperliquid's funding history and the oracle price for BTC and ETH. Recompute funding from the premium samples with the formula above, check it against the venue's published rates, and chart the annualized funding distribution.",
    quiz: [
      ["The perp trades 0.2% above the index for an hour. Who pays funding?", ["Longs pay shorts", "Shorts pay longs", "The exchange pays both", "Nobody"], "A positive premium makes funding positive, so longs pay."],
      ["Why use a separate mark price for liquidations instead of the last trade?", ["So one manipulated or thin print can't trigger liquidations", "Because the last price isn't public", "To charge higher fees", "Because funding requires it"], "A robust mark protects traders from wicks and manipulation."],
      ["Hyperliquid funding at 0.01% per hour is about what annualized rate?", ["About 87.6% APR", "About 8.76% APR", "About 0.24% APR", "About 876% APR"], "0.01% × 24 × 365 = 87.6%."]
    ]
  },
  {
    id: "u9l2", t: "Margin, liquidation, insurance and ADL", min: 16,
    sum: "The risk engine: initial and maintenance margin, liquidation price math, backstop vaults and the loss waterfall.",
    body: `<pre><code>initial margin   IM = notional / leverage
maintenance      MM = notional × mmr   (often half of IM at max leverage)
equity = collateral + unrealized PnL
liquidation when equity < MM

Isolated long, entry P0, leverage L, maintenance ratio m:
  P_liq = P0 · (1 − 1/L) / (1 − m)
Isolated short:
  P_liq = P0 · (1 + 1/L) / (1 + m)
e.g. long at $100, 10x, m = 0.5% →  P_liq = 100 · 0.9 / 0.995 ≈ $90.45</code></pre>
<p><b>Cross margin</b> shares collateral across positions (efficient, but one loser can drag down everything). <b>Isolated margin</b> caps the loss at that position's margin.</p>
<h4>The loss waterfall (design this explicitly)</h4>
<ol><li><b>Market liquidation</b>: close positions through the order book while equity is still positive. The remaining margin covers slippage.</li>
<li><b>Backstop liquidator</b>: if the book can't absorb it, a vault takes over the position at the mark price. On Hyperliquid that's a liquidator vault inside HLP, the community market-making vault.</li>
<li><b>Insurance fund</b>: absorbs negative equity (bankruptcy) left after liquidation.</li>
<li><b>Auto-deleveraging (ADL)</b>: last resort. Profitable opposing traders, ranked by PnL and leverage, are force-closed at the bankruptcy price so the system stays solvent. ADL fired on several venues on Oct 10, 2025.</li>
<li>(Some designs) <b>socialized losses</b> across all winners.</li></ol>
<h4>Parameters that matter</h4>
<p>Maximum leverage per asset (tie it to liquidity), position-size tiers with higher margin for big positions, open-interest caps for thin markets, and mark-price smoothing.</p>`,
    keys: ["P_liq(long) = P0(1−1/L)/(1−m)", "Cross shares collateral; isolated caps loss", "Waterfall: book → backstop vault → insurance → ADL", "Leverage limits and OI caps must follow liquidity"],
    src: [
      ["Hyperliquid docs: liquidations", "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations", "D", "Book liquidation, backstop liquidator vault and thresholds."],
      ["Hyperliquid docs: auto-deleveraging", "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/auto-deleveraging", "D", "ADL ranking and mechanics."],
      ["dYdX v4 docs", "https://docs.dydx.xyz/", "D", "Margin, liquidation, insurance fund and deleveraging on an appchain."],
      ["GMX docs", "https://docs.gmx.io/", "D", "Liquidation and fees in a pool-based perp design."]
    ],
    build: "Implement a margin engine in Python or Rust: accounts with cross and isolated positions, mark-to-market, maintenance checks, book liquidation with slippage, a backstop vault, an insurance fund and ADL. Replay a 20% one-minute crash and log where each dollar of loss ended up.",
    quiz: [
      ["Long at $2,000 with 20x leverage and 1% maintenance. Liquidation price?", ["About $1,919", "About $1,900", "About $1,980", "About $1,800"], "P_liq = 2000 × (1 − 0.05)/(1 − 0.01) = 1900/0.99 ≈ $1,919."],
      ["What is auto-deleveraging (ADL)?", ["Force-closing profitable opposing traders at the bankruptcy price when other backstops are exhausted", "Lowering leverage limits for new users", "Automatically adding margin", "A funding-rate cap"], "ADL keeps the system solvent by reducing winners' positions."],
      ["Why are higher margin tiers used for large positions?", ["Big positions are harder to liquidate without slippage", "To reward whales", "To lower funding", "Because the oracle requires it"], "Liquidation cost grows with size, so required margin should too."]
    ]
  },
  {
    id: "u9l3", t: "Venue architectures: CLOB, pool and hybrid", min: 14,
    sum: "Five ways to build a perp DEX, and the trade-off each one makes.",
    body: `<div class="tbl"><table><thead><tr><th>Design</th><th>Examples</th><th>Who's the counterparty</th><th>Strength</th><th>Weakness</th></tr></thead><tbody>
<tr><td>Onchain CLOB on an appchain</td><td>Hyperliquid</td><td>Other traders and market makers (plus the HLP vault)</td><td>Real price discovery, CEX-like UX, fully onchain state</td><td>Needs a custom high-performance L1 and validator set</td></tr>
<tr><td>Offchain matching, onchain settlement</td><td>dYdX v4 (validator in-memory books), Paradex, edgeX</td><td>Other traders</td><td>Fast; settlement is verifiable</td><td>Matching fairness is less transparent</td></tr>
<tr><td>ZK-verified order book</td><td>Lighter</td><td>Other traders</td><td>Matching proven correct; very low fees</td><td>Prover cost and complexity</td></tr>
<tr><td>Oracle-priced pool</td><td>GMX v2, Jupiter Perps, gTrade</td><td>An LP pool (GM/JLP) takes the other side</td><td>Zero-slippage UX, easy to list assets</td><td>LPs bear trader PnL and oracle-latency arbitrage; needs price-impact fees and OI caps</td></tr>
<tr><td>vAMM / hybrid</td><td>Perp v1 (historical), Drift v2 (now Velocity)</td><td>A virtual curve plus JIT makers</td><td>Always-on liquidity</td><td>vAMM PnL risk; complex</td></tr>
</tbody></table></div>
<h4>Questions that decide your architecture</h4>
<ol><li>Where does <b>price discovery</b> happen: your book, or someone else's (oracle)?</li>
<li>Who <b>absorbs trader PnL</b>? Pool LPs are short trader skill.</li>
<li>How fast and cheap are <b>cancels</b>? Makers need sub-second, gas-free updates.</li>
<li>What can a <b>sequencer, validator or oracle</b> front-run?</li>
<li>How do you <b>bootstrap liquidity</b> on day one: a protocol vault like HLP, designated market makers, or incentives (Unit 13)?</li></ol>`,
    keys: ["CLOB: real discovery but needs fast infrastructure", "Oracle pools: easy UX, LPs short trader PnL", "ZK order books: verifiable matching", "Decide where price discovery and PnL risk live"],
    src: [
      ["Hyperliquid docs", "https://hyperliquid.gitbook.io/hyperliquid-docs", "D", "Onchain CLOB with HLP."],
      ["dYdX v4 chain (code)", "https://github.com/dydxprotocol/v4-chain", "C", "Cosmos appchain with in-memory order books."],
      ["Lighter docs", "https://docs.lighter.xyz/", "D", "ZK-proven matching engine."],
      ["GMX synthetics (code)", "https://github.com/gmx-io/gmx-synthetics", "C", "Oracle-priced pool perps with price impact and funding/borrowing fees."],
      ["Velocity (formerly Drift) protocol docs", "https://docs.velocity.exchange/protocol", "D", "Solana perp design; relaunched after the 2026 exploit."]
    ],
    build: "Read GMX synthetics' position-increase flow and dYdX's clob module. Write a 2-page design doc choosing an architecture for a new perp venue that lists long-tail assets, and justify each choice with the five questions above.",
    quiz: [
      ["In an oracle-priced pool perp like GMX, who is the counterparty to traders?", ["The liquidity pool's LPs", "Other traders on an order book", "The oracle network", "Validators"], "LPs take the other side and earn fees, but bear trader PnL."],
      ["What's the main risk of oracle-priced perps?", ["Oracle latency lets informed traders trade against stale prices", "No liquidity at all", "Too much slippage", "They can't charge fees"], "If the oracle lags the real market, traders can pick off the pool."],
      ["Why do market makers care about cancel latency and cost?", ["They must update quotes constantly to avoid being picked off", "Cancels earn rebates", "Regulators require it", "Cancels change funding"], "Slow or expensive cancels mean stale quotes and adverse selection."]
    ]
  },
  {
    id: "u9l4", t: "Funding economics and the basis trade", min: 12,
    sum: "Cash-and-carry, cross-venue funding arbitrage, and the risks that blow up 'risk-free' carry.",
    body: `<p><b>Cash-and-carry</b>: buy spot, short the perp with equal notional. You're delta-neutral and collect funding while it's positive. This is the trade behind Ethena, many hedge-fund books, and HLP-style vaults.</p>
<pre><code>carry APR ≈ avg funding × periods per year − borrow/opportunity cost − fees − rebalancing slippage
cross-venue funding arb: long the perp on venue A (low funding), short on venue B (high funding)
PnL = Σ (F_B − F_A) × notional − fees − basis change when you close</code></pre>
<h4>What actually goes wrong</h4>
<ul><li><b>Liquidation of the short leg</b> in a violent pump. Your spot is on a different venue, so you can't post it as margin fast enough.</li>
<li><b>Venue risk</b>: an exchange halts, gets hacked or fails (FTX, 2022).</li>
<li><b>Basis blowout</b> on exit: the perp–spot spread moves against you.</li>
<li><b>ADL</b> closing your profitable leg at the worst time.</li>
<li><b>Funding flips</b>: crowded carry pushes funding to zero or negative.</li></ul>
<h4>Market structure insight</h4>
<p>Funding is a market-clearing price for leverage. When it's high everywhere, carry capital floods in (USDe supply grows) until it compresses. Watching aggregate funding and open interest tells you about leverage in the system, the stuff that fuels cascades (Unit 1).</p>`,
    keys: ["Long spot + short perp = collect funding", "Cross-venue arb trades funding differences", "Real risks: short-leg liquidation, venue failure, basis, ADL", "Funding is the market price of leverage"],
    src: [
      ["Coinglass", "https://www.coinglass.com/", "T", "Funding, OI and liquidation data across venues."],
      ["Velo", "https://velo.xyz/", "T", "Derivatives data and charts."],
      ["ccxt", "https://github.com/ccxt/ccxt", "C", "Unified API to pull funding and place orders on many venues."],
      ["Binance USD-M futures API", "https://developers.binance.com/docs/derivatives/usds-margined-futures/general-info", "D", "Funding, premium index and order endpoints."],
      ["Bybit v5 API", "https://bybit-exchange.github.io/docs/v5/intro", "D", "Tickers with funding rates and open interest."],
      ["Ethena docs", "https://docs.ethena.fi/", "D", "Carry at scale, with its risk framework."]
    ],
    build: "Build a funding-arb monitor: every hour, pull funding for the top 30 perps on Hyperliquid, Binance, Bybit and dYdX. Rank cross-venue spreads net of fees, and paper-trade the top 3 with realistic slippage for 2 weeks.",
    quiz: [
      ["Which position collects positive funding while staying delta-neutral?", ["Long spot, short perp", "Long perp, short spot", "Long perp only", "Short spot only"], "Shorts receive positive funding, and the spot long cancels the price exposure."],
      ["What's the most common way a 'delta-neutral' carry trade blows up?", ["The short perp leg is liquidated in a sharp pump before margin can be added", "Funding becomes too positive", "Spot tokens are worth zero", "Gas fees are too low"], "Collateral is split across venues, so a violent move hits the short leg's margin."],
      ["What does persistently high funding across venues signal?", ["Heavy leveraged long demand in the system", "No leverage", "That all exchanges are insolvent", "That spot volume is zero"], "Longs are paying a lot for leverage, which is fuel for a cascade."]
    ]
  },
  {
    id: "u9l5", t: "Case studies: when perp venues break", min: 15,
    sum: "Mango 2022, Hyperliquid's ETH whale and JELLY in 2025, the October 10 cascade, and the Drift exploit in 2026.",
    body: `<h4>Mango Markets (Oct 2022): oracle manipulation</h4>
<p>The attacker pumped MNGO across the thin markets the oracle read, inflating the value of their own perp position, then borrowed out more than $100M. <i>Lesson:</i> never let a trader's collateral value come from a market they can move.</p>
<h4>Hyperliquid ETH whale (Mar 2025): liquidation as an exit</h4>
<p>A trader opened a huge leveraged ETH long, withdrew excess margin, and let the position be liquidated into HLP, which absorbed a multi-million-dollar loss. The trader effectively exited a size the book couldn't absorb. Hyperliquid responded by cutting maximum leverage and changing margin rules for withdrawals.</p>
<h4>JELLYJELLY (Mar 2025): self-liquidation and a squeeze</h4>
<p>A large short in a thin memecoin was deliberately liquidated into HLP's liquidator vault. Then the spot price was pumped, leaving the vault short a squeezing asset. Validators delisted the market and settled it at a lower price. That stopped the loss, but raised governance and neutrality questions. <i>Lesson:</i> OI caps tied to spot liquidity, and backstop vaults with position limits.</p>
<h4>October 10, 2025: the cascade</h4>
<p>A macro headline started the largest liquidation day on record (about $19B reported). ADL triggered on multiple venues, and venue-specific collateral pricing (USDe on Binance) made it worse. <i>Lesson:</i> design the waterfall and the collateral oracles for the tail, not the median day.</p>
<h4>Drift (Apr 1, 2026): admin compromise</h4>
<p>About $285–295M was lost after attackers obtained privileged access through long-running social engineering (attributed by investigators to DPRK-linked actors). Drift relaunched as <b>Velocity</b> in July 2026, as a leaner perps-only venue. <i>Lesson:</i> your biggest risk may be operational, not mathematical (Unit 5).</p>`,
    keys: ["Oracle inputs must not be cheap to move", "Liquidation can be weaponized as an exit or a squeeze", "Design the loss waterfall for tail days", "Opsec failures rival code bugs"],
    src: [
      ["rekt: Mango Markets", "https://rekt.news/mango-markets-rekt", "R", "Oracle manipulation."],
      ["CoinGecko: October 10 crash explained", "https://www.coingecko.com/learn/october-10-crypto-crash-explained", "R", "Cascade breakdown by venue."],
      ["The Defiant: Drift rebrands to Velocity", "https://thedefiant.io/news/defi/drift-protocol-rebrands-to-velocity-dex-ahead-of-relaunch", "N", "Post-exploit rebuild."],
      ["Hyperliquid docs: liquidations", "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/liquidations", "D", "Compare the current rules with the 2025 incidents."]
    ],
    build: "For each of the five incidents, write a design change to your own perp venue spec (from Unit 3's project) that would have prevented or bounded the loss, with the exact parameter or rule.",
    quiz: [
      ["What was the core flaw exploited at Mango Markets?", ["Collateral valued from thin, manipulable markets", "A reentrancy bug", "A bridge hack", "Negative funding"], "The attacker moved the oracle's price of their own collateral."],
      ["In the JELLY incident, what did the attacker exploit?", ["Self-liquidation into a backstop vault, then a squeeze on a thin asset", "A signature replay", "A sequencer outage", "A stablecoin depeg"], "The backstop inherited a short in an asset that was then pumped."],
      ["What does the Drift 2026 exploit mainly teach?", ["Operational and key security can be the weakest link", "Perps can't work on Solana", "Funding formulas are wrong", "Order books are insecure"], "Reports point to social engineering and admin access, not a math bug."]
    ]
  },
  {
    id: "u9l6", t: "The 2025–26 perp DEX war", min: 12,
    sum: "Market share, take rates, points farming, volume quality and builder-deployed markets, as of October 2026.",
    body: `<h4>Where things stand (snapshot Oct 14, 2026, Castle Labs)</h4>
<ul><li><b>Open interest</b>: Hyperliquid about 57% of onchain perp OI (about $7.8B), then Aster (about 9.6%) and Variational (about 7.9%).</li>
<li><b>24h volume</b>: Hyperliquid about 36% of $18.3B tracked, Lighter about 11%, Aster about 8.5%.</li>
<li><b>Take rate</b>: Lighter about 0.8 bps versus Hyperliquid about 2.6 bps. Cheaper venues buy volume with lower fees.</li></ul>
<h4>The dynamics</h4>
<ul><li><b>Points and airdrops</b> rent volume. Lighter's volume reportedly fell about 70% after its December 2025 token launch as farmers left. Aster's volume spikes around incentive campaigns.</li>
<li><b>Volume quality</b>: DefiLlama delisted Aster's volume in Oct 2025 after finding it moved almost 1:1 with Binance. Prefer <b>open interest, fees paid, and unique active traders</b> over raw volume.</li>
<li><b>Builder-deployed markets (HIP-3)</b>: third parties stake HYPE to launch their own perp markets on Hyperliquid's engine: equities, indices, commodities, pre-launch tokens. Unit 10 covers the equity-perp boom this enabled.</li>
<li><b>New entrants</b>: prediction-market leaders (Polymarket, Kalshi) reportedly launched crypto perps in April 2026, and stock brokers and stablechains want perps too.</li></ul>
<h4>The lesson for builders</h4>
<p>Liquidity is sticky once market makers and traders settle in. To compete you need a structural edge: cost, latency, assets nobody else lists, UX, or distribution. Incentives alone produce volume that leaves when they stop.</p>
<p><i>All figures are reported by third parties at the dates shown. Check live dashboards.</i></p>`,
    keys: ["Hyperliquid about 57% of onchain perp OI (Oct 2026)", "Points rent volume; it leaves after the token launch", "Judge venues by OI, fees and traders, not volume", "HIP-3: permissionless builder-deployed markets"],
    src: [
      ["Castle Labs: Perp DEX rankings (Oct 2026)", "https://castlelabs.io/research/perp-dex-rankings", "N", "OI, volume and take-rate snapshot."],
      ["DefiLlama perps", "https://defillama.com/perps", "T", "Live volume and OI by venue."],
      ["Hypurrscan", "https://hypurrscan.io/", "T", "Hyperliquid explorer: HLP, vaults, builders, markets."],
      ["Lighter docs", "https://docs.lighter.xyz/", "D", "ZK order-book design and fee model."],
      ["DL News: Aster and Hyperliquid drive volume records", "https://www.dlnews.com/articles/defi/aster-hyperliquid-drive-2-trillion-perp-dex-volume-surge/", "N", "The 2025 surge and competition."],
      ["Galaxy Research", "https://www.galaxy.com/insights/research", "N", "Institutional research on market structure, perps and onchain trends."]
    ],
    build: "Build a venue-quality dashboard: for 5 perp DEXs, pull daily volume, OI, fees and (where possible) unique traders. Compute volume/OI and fees/volume ratios, flag any venue whose volume/OI looks like wash trading, and publish it.",
    quiz: [
      ["Which metric is hardest to fake for a perp venue?", ["Fees actually paid and open interest backed by margin", "Raw 24h volume", "Twitter followers", "Number of listed markets"], "Volume can be washed. OI needs margin and fees cost real money."],
      ["What reportedly happened to Lighter's volume after its token launch?", ["It fell about 70% as airdrop farmers left", "It tripled", "It went to zero", "It stayed exactly flat"], "Incentive-driven volume is rented, not owned."],
      ["What does Hyperliquid's HIP-3 allow?", ["Third parties to deploy their own perp markets on Hyperliquid's engine by staking HYPE", "Free leverage", "Gasless Ethereum transactions", "Bridging to Bitcoin"], "Builder-deployed perps opened the door to equities, indices and more."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u10", t: "Tokenized stocks and RWAs", tag: "Markets",
  d: "Tokenized T-bills, the 2025–26 tokenized-stock rush, equity perps, and the hard design problems of trading TradFi assets 24/7.",
  lessons: [
  {
    id: "u10l1", t: "RWAs: tokenized treasuries and funds", min: 10,
    sum: "How offchain assets get onchain, what you actually own, and why T-bills became DeFi's base rate.",
    body: `<p>A <b>real-world asset (RWA)</b> token is a claim recorded onchain on something held offchain. The token is only as good as the <b>legal wrapper</b> and the <b>custodian</b>.</p>
<ul><li><b>Tokenized money-market and T-bill funds</b> (BlackRock's BUIDL via Securitize, Franklin's BENJI, Ondo's OUSG/USDY and others): fund shares recorded on a chain, with allowlisted holders and transfer restrictions.</li>
<li><b>Uses in DeFi</b>: treasury collateral for stablecoins and perps margin, reserves backing yield-bearing stables, and the onchain risk-free rate.</li>
<li><b>Mechanics</b>: mint and redeem through the issuer (KYC'd), NAV oracles, daily accruals or rebasing, and permissioned token standards (ERC-3643-style allowlists).</li></ul>
<h4>Questions to ask any RWA</h4>
<ol><li>Who is the legal issuer, and in what jurisdiction?</li>
<li>Is the holder a <b>shareholder</b>, a <b>creditor</b> of an SPV, or just holding a contractual claim?</li>
<li>Who custodies the assets, and what happens in issuer bankruptcy?</li>
<li>Can the token be frozen or force-transferred?</li>
<li>How fast is redemption, and what happens at weekends and holidays?</li></ol>`,
    keys: ["RWA token = onchain claim on an offchain asset", "Legal wrapper and custodian define the risk", "Tokenized T-bills = the onchain risk-free rate", "Permissioned standards and freeze powers are the norm"],
    src: [
      ["rwa.xyz", "https://app.rwa.xyz/", "T", "Live data on tokenized treasuries, stocks and credit."],
      ["ERC-3643: T-REX permissioned tokens", "https://eips.ethereum.org/EIPS/eip-3643", "D", "A standard for compliant, permissioned security tokens."],
      ["Ondo Finance", "https://ondo.finance/", "D", "Tokenized treasuries and Global Markets."]
    ],
    build: "Write an ERC-20 with an allowlist registry, a NAV oracle and a daily accrual (or rebasing) mechanism, plus a forced-transfer function behind a timelocked multisig. Write tests for transfers to non-allowlisted addresses failing.",
    quiz: [
      ["What mainly determines the risk of an RWA token?", ["Its legal wrapper, custodian and redemption terms", "The blockchain's TPS", "The token's ticker", "Its Twitter following"], "The onchain token is a claim. Its enforceability is offchain."],
      ["Why do tokenized T-bill funds matter for DeFi protocols?", ["They provide a low-risk yield and collateral base, the onchain risk-free rate", "They pay 50% APY", "They remove the need for oracles", "They're always permissionless"], "Protocols use them as reserves and benchmark rates."],
      ["What's a common feature of tokenized fund shares?", ["Allowlisted holders and transfer restrictions", "Unlimited permissionless minting", "No issuer", "Algorithmic pegs"], "Securities rules usually require knowing who holds them."]
    ]
  },
  {
    id: "u10l2", t: "Tokenized stocks: the 2025–26 rush", min: 12,
    sum: "xStocks, Robinhood Stock Tokens, Ondo Global Markets: different structures, different rights.",
    body: `<p>In mid-2025 tokenized US equities went mainstream outside the US:</p>
<ul><li><b>xStocks</b> (Backed): tokens tracking roughly 60+ US stocks and ETFs, launched June 2025 on Solana with Kraken and Bybit, then spread to other venues and chains.</li>
<li><b>Robinhood Stock Tokens</b>: launched for EU users in June 2025, starting on Arbitrum. Robinhood later built <b>Robinhood Chain</b>. Reports describe two products, 1:1-backed tokens usable from self-custody and in-app derivative "classic" tokens.</li>
<li><b>Ondo Global Markets</b> and others: tokenized equity exposure for non-US investors.</li></ul>
<h4>Market size</h4>
<p>Allium measured about <b>$1.67B</b> of spot tokenized-equity market cap across 14 venues in May 2026, up about 13.6x year on year. Later estimates (Sept 2026) range from $3B to $4.8B.</p>
<h4>What holders actually get</h4>
<ul><li>Usually <b>economic exposure</b> (price, sometimes dividends reinvested), <b>not voting rights</b>.</li>
<li>Often a <b>creditor claim</b> on an issuer or SPV that holds the shares, not direct share ownership.</li>
<li>Access restricted by jurisdiction: generally not offered to US persons.</li></ul>
<h4>Why builders care</h4>
<p>Stocks are now ERC-20 or SPL tokens. That means lending markets against AAPL tokens, AMM pools for TSLA/USDC, structured products, and 24/7 trading of assets whose primary market closes. Every one of those runs into the "closed market" problem in the next lesson.</p>`,
    keys: ["xStocks, Robinhood and Ondo: different wrappers", "About $1.67B spot tokenized equities (May 2026, Allium)", "Usually economic exposure, not shareholder rights", "Composable stocks create new DeFi primitives"],
    src: [
      ["Allium: Tokenized equities onchain", "https://www.allium.so/reports/tokenized-equities-onchain-4b-and-growing", "N", "Market-size and venue data (2026)."],
      ["Talos: The race for tokenized stocks", "https://www.talos.com/insights/the-race-for-tokenized-stocks-and-the-path-ahead", "N", "Structures, venues and the path ahead."],
      ["rwa.xyz", "https://app.rwa.xyz/", "T", "Track tokenized-stock supply by issuer and chain."]
    ],
    build: "Pick one tokenized stock (e.g. an xStocks token). Trace its contract, the issuer's attestation or proof-of-reserves page, the redemption process, and its DEX liquidity versus the underlying's daily volume. Write up what a holder really owns.",
    quiz: [
      ["What do most tokenized-stock holders NOT get?", ["Shareholder voting rights", "Price exposure", "The ability to transfer the token", "A token balance"], "Most structures give economic exposure without direct shareholder rights."],
      ["Who were tokenized US stocks (xStocks, Robinhood EU tokens) mainly offered to at launch?", ["Non-US users", "Only US retail", "Only US banks", "Nobody, they were testnet only"], "Jurisdictional rules kept most products away from US persons."],
      ["Why are tokenized stocks interesting to DeFi builders?", ["They can be used in AMMs, lending and structured products like any token", "They remove market risk", "They pay higher dividends", "They avoid all regulation"], "Composability is the new part."]
    ]
  },
  {
    id: "u10l3", t: "Equity perps and the 24/7 problem", min: 13,
    sum: "HIP-3 equity perps and stock perps on crypto venues: pricing assets whose real market is closed most of the week.",
    body: `<p>Perps on stocks, indices and commodities became one of 2026's hottest crypto products. On Hyperliquid, <b>HIP-3 builder-deployed equity perps</b> reached about <b>$1.67B of open interest, about 19% of all Hyperliquid perp OI</b>, by May 2026 (Allium). Other venues, including Lighter (reportedly from January 2026), added stock perps too.</p>
<h4>The 24/7 problem</h4>
<p>NYSE and Nasdaq regular hours cover about 6.5 hours a day, 5 days a week. A crypto perp trades 24/7. When the underlying is closed:</p>
<ul><li>There's no live index price, so the oracle must switch to the last close, an extended-hours or futures proxy, or the perp's own order book.</li>
<li>The perp becomes the <b>price discovery venue</b> (weekend prices for NVDA, say), with thin liquidity.</li>
<li>Monday's open can <b>gap</b> far from the weekend perp price, so liquidations bunch up at the open.</li></ul>
<h4>Design tools</h4>
<ul><li>Session-aware mark price: a blend of the external index and an EMA of the internal book when closed.</li>
<li>Lower leverage and wider margins off-hours.</li>
<li>OI caps per market and per account.</li>
<li>Funding anchored to the last reference price.</li>
<li>Corporate actions: splits need contract adjustments, and dividends may need funding adjustments.</li>
<li>Circuit breakers matching exchange limit-up/limit-down.</li></ul>`,
    keys: ["Equity perps: about 19% of Hyperliquid OI by May 2026", "Off-hours, the perp becomes the price-discovery venue", "Gap risk at the open bunches up liquidations", "Session-aware marks, margins and OI caps"],
    src: [
      ["Allium: Tokenized equities onchain", "https://www.allium.so/reports/tokenized-equities-onchain-4b-and-growing", "N", "HIP-3 equity-perp OI data."],
      ["Hyperliquid docs", "https://hyperliquid.gitbook.io/hyperliquid-docs", "D", "HIP-3 builder-deployed perps and oracle rules."],
      ["Hyperliquid docs: oracle", "https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/oracle", "D", "Compare with what equity deployers must provide."]
    ],
    build: "Simulate an equity perp over a weekend: use Friday's close as the index, let a random-walk internal book trade for 64 hours, then gap-open Monday at ±5%. Compare liquidation losses under (a) a static mark, (b) a book-EMA mark with 3x lower weekend leverage.",
    quiz: [
      ["What happens to an equity perp's price discovery when the stock market is closed?", ["It moves to the perp's own order book", "It stops trading", "It follows Bitcoin", "The oracle keeps updating from NYSE"], "With no external market, traders on the perp set the price."],
      ["Why are Monday opens dangerous for equity perps?", ["The underlying can gap far from the weekend perp price and trigger mass liquidations", "Funding is paid only on Mondays", "Oracles are offline", "Gas is highest"], "The gap is a jump that margin systems must survive."],
      ["Which tool reduces off-hours risk?", ["Lower maximum leverage and wider margins when the underlying is closed", "Higher leverage at weekends", "Removing OI caps", "Pricing only from last trade"], "Less leverage means smaller forced flows at the gap."]
    ]
  },
  {
    id: "u10l4", t: "Designing an RWA or stock protocol", min: 11,
    sum: "A checklist that covers legal, oracle, liquidity and compliance design together.",
    body: `<p>RWA protocols fail at the seams between onchain and offchain. Design all four layers together:</p>
<h4>1. Legal and custody</h4>
<p>Issuer entity, bankruptcy remoteness, custodian, audits or attestations, redemption rights, eligible jurisdictions, and whether your protocol itself becomes a regulated venue.</p>
<h4>2. Compliance in code</h4>
<p>Allowlists (ERC-3643 or similar), Uniswap v4 hooks that check eligibility on swap and add-liquidity, freeze and force-transfer powers (behind timelocks), and sanctions screening at the interface.</p>
<h4>3. Pricing and oracles</h4>
<p>Session-aware prices, NAV versus market price for funds, corporate actions, holidays, stale-price guards, and confidence intervals.</p>
<h4>4. Liquidity and risk</h4>
<p>Collateral factors that drop off-hours. Liquidation paths when the token can only be redeemed during market hours (who buys seized AAPL tokens at 3 a.m. on a Sunday?). OI and borrow caps tied to real two-sided depth. Arbitrage between token, underlying and perp.</p>
<p><b>Opportunity</b>: the hard problems here (24/7 pricing, compliant composability, weekend liquidity) are unsolved and valuable. A protocol that becomes the standard lending market or AMM for tokenized equities is a real business.</p>`,
    keys: ["Design legal, compliance, oracle and liquidity together", "Hooks and allowlists put compliance in code", "Liquidation paths must work when markets are closed", "Weekend liquidity is an open, valuable problem"],
    src: [
      ["ERC-3643", "https://eips.ethereum.org/EIPS/eip-3643", "D", "Permissioned token standard."],
      ["Uniswap v4 hook template", "https://github.com/Uniswap/v4-template", "C", "Build eligibility-checking hooks."],
      ["Chainlink Data Feeds", "https://docs.chain.link/data-feeds", "D", "Equity and NAV feeds; market-hours behavior."]
    ],
    build: "Write a Uniswap v4 hook for a tokenized-stock/USDC pool that (1) only lets allowlisted addresses add liquidity, (2) widens the fee off market hours, and (3) halts swaps if the oracle is stale beyond a session-aware threshold.",
    quiz: [
      ["Why are liquidations of tokenized stocks hard at weekends?", ["Redemption and the underlying market are closed, so natural buyers are scarce", "Gas is disabled at weekends", "Tokens can't be transferred at weekends", "Oracles are illegal at weekends"], "Liquidators need an exit, and the primary market isn't open."],
      ["How can a DEX enforce eligibility for a permissioned RWA token?", ["Allowlist checks in a hook or token transfer logic", "By asking users nicely", "With a higher fee", "With a longer TWAP"], "Compliance can be enforced at the contract level."],
      ["For a tokenized fund share, what's the key oracle choice?", ["NAV from the issuer versus market price on DEXs", "BTC price", "Gas price", "Block number"], "NAV and market price can diverge, so choose which one governs collateral."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u11", t: "MEV, order flow and market structure", tag: "Markets",
  d: "Who orders transactions and what that's worth: MEV types, PBS and ePBS, order-flow auctions, CEX–DEX arbitrage, and building a searcher.",
  lessons: [
  {
    id: "u11l1", t: "What MEV is, and who pays for it", min: 12,
    sum: "Arbitrage, sandwiches, liquidations, JIT and backruns: separating the benign from the extractive.",
    body: `<p><b>Maximal extractable value</b> is the value someone can capture by including, excluding or reordering transactions. Flash Boys 2.0 (2019) documented bots fighting gas wars over it.</p>
<div class="tbl"><table><thead><tr><th>Type</th><th>Mechanism</th><th>Who loses</th></tr></thead><tbody>
<tr><td>DEX–DEX / CEX–DEX arbitrage</td><td>Trade stale AMM prices back to market</td><td>LPs (this is LVR)</td></tr>
<tr><td>Sandwich</td><td>Buy before a victim's swap, sell after</td><td>The swapper (worse execution)</td></tr>
<tr><td>Liquidations</td><td>Race to liquidate for the bonus</td><td>The borrower pays the bonus. This one is useful</td></tr>
<tr><td>JIT liquidity</td><td>Add concentrated liquidity just for one big swap</td><td>Passive LPs (fee dilution)</td></tr>
<tr><td>Backrun</td><td>Trade right after a price-moving transaction</td><td>Mostly neutral; arbitrage</td></tr>
</tbody></table></div>
<p><b>CEX–DEX arbitrage</b> is the largest category on Ethereum. Builders vertically integrated with trading firms win many blocks because they have the arb flow.</p>
<h4>Why protocol designers should care</h4>
<p>Your users' bad execution and your LPs' losses are someone else's MEV. Design choices like batch auctions, oracle-updated AMMs, private order flow and fees that follow volatility decide who captures it.</p>`,
    keys: ["MEV = value from ordering rights", "CEX–DEX arb is the biggest category (LPs pay)", "Sandwiches hurt users; liquidations are useful", "Design decides who captures MEV"],
    src: [
      ["Daian et al., Flash Boys 2.0", "https://arxiv.org/abs/1904.05234", "P", "The original MEV paper."],
      ["Qin, Zhou, Gervais, Quantifying Blockchain Extractable Value", "https://arxiv.org/abs/2101.05511", "P", "Measured sandwiches, liquidations and arbitrage."],
      ["Zhou et al., High-Frequency Trading on Decentralized On-Chain Exchanges", "https://arxiv.org/abs/2009.14021", "P", "Sandwich attacks formalized."],
      ["libMEV", "https://libmev.com/", "T", "MEV bundle and searcher analytics."],
      ["mev-inspect-py (archived)", "https://github.com/flashbots/mev-inspect-py", "C", "Flashbots' MEV classifier. Archived, but its detection logic is still instructive."]
    ],
    build: "Find 10 sandwich attacks on Ethereum mainnet (libMEV or a Dune dashboard). For each, compute the victim's loss versus a fair execution, and the attacker's net profit after builder payment.",
    quiz: [
      ["Who mainly bears the cost of CEX–DEX arbitrage?", ["AMM liquidity providers", "Validators", "The arbitrageur", "Stablecoin issuers"], "Arbs trade against stale pool prices. That's LVR."],
      ["Why are liquidation races generally considered 'good' MEV?", ["They keep lending protocols solvent", "They harm borrowers less than sandwiches", "They don't use gas", "They are illegal"], "Fast liquidation prevents bad debt."],
      ["What is JIT liquidity?", ["Adding concentrated liquidity right before a large swap and removing it right after", "A token unlock schedule", "An oracle update", "A flash loan"], "JIT captures most of that swap's fees from passive LPs."]
    ]
  },
  {
    id: "u11l2", t: "PBS, MEV-Boost and ePBS", min: 12,
    sum: "How Ethereum outsourced block building, the trust it introduced, and how Glamsterdam brings it into the protocol.",
    body: `<p><b>Proposer–builder separation (PBS)</b> splits block production into two roles. Proposers (validators) just pick the most valuable block. Specialized builders compete to build it. Without PBS, sophisticated validators would out-earn solo stakers, which pushes toward centralization.</p>
<h4>MEV-Boost (since the Merge, 2022)</h4>
<ul><li><b>Searchers</b> send bundles to builders.</li>
<li><b>Builders</b> bid to relays.</li>
<li><b>Relays</b> escrow the payload and show proposers only the header and bid, so the proposer can't steal the MEV.</li>
<li>The proposer signs blindly, and the relay reveals the block.</li></ul>
<p>Trusted relays and a handful of dominant builders became central points.</p>
<h4>ePBS (EIP-7732, in Glamsterdam)</h4>
<p>The protocol itself handles the builder commitment. The proposer commits to a builder's bid onchain, and a <b>payload-timeliness committee</b> attests whether the builder revealed the payload on time. This removes the need to trust relays for fair exchange. Related proposals such as <b>FOCIL</b> (fork-choice inclusion lists, EIP-7805) aim to stop builders censoring transactions.</p>
<h4>For bot builders</h4>
<p>Your bundles' path to inclusion is changing. Watch builder market share, the bid timing games around slot boundaries, and what ePBS's timeline means for latency.</p>`,
    keys: ["PBS: proposers choose, builders build", "MEV-Boost relays provide trust-based fair exchange", "ePBS (7732) moves this into the protocol", "Inclusion lists (FOCIL) target censorship"],
    src: [
      ["Flashbots docs: MEV-Boost", "https://docs.flashbots.net/", "D", "Architecture of searchers, builders and relays."],
      ["EIP-7732: ePBS", "https://eips.ethereum.org/EIPS/eip-7732", "D", "Enshrined PBS spec."],
      ["EIP-7805: FOCIL", "https://eips.ethereum.org/EIPS/eip-7805", "D", "Fork-choice enforced inclusion lists."],
      ["mevboost.pics", "https://mevboost.pics/", "T", "Builder and relay market share."],
      ["Flashbots forum (The Collective)", "https://collective.flashbots.net/", "P", "Open research discussion on PBS, orderflow and MEV."]
    ],
    build: "Using mevboost.pics and relay data APIs, chart the builder market share for the last 30 days, and the share of blocks built by builders affiliated with trading firms.",
    quiz: [
      ["In MEV-Boost, why does the proposer sign a header without seeing the block?", ["So it can't steal the builder's MEV before committing", "To save gas", "Because blocks are encrypted onchain", "To finalize faster"], "Relays enforce fair exchange between proposer and builder."],
      ["What does ePBS remove the need to trust?", ["Relays, for fair exchange between proposers and builders", "Validators", "Users' wallets", "Oracles"], "The protocol enforces the commitment and the payload reveal."],
      ["What problem do inclusion lists (FOCIL) target?", ["Builders censoring transactions", "High blob fees", "Slow finality", "Oracle staleness"], "Proposers or committees force certain transactions into blocks."]
    ]
  },
  {
    id: "u11l3", t: "Order-flow auctions and MEV capture", min: 12,
    sum: "Give MEV back to users and apps: OFAs, private RPCs, MEV taxes, and app-specific ordering.",
    body: `<p>If ordering rights are worth money, <b>sell them on the user's behalf</b>:</p>
<ul><li><b>Private RPCs and OFAs</b> (Flashbots Protect and MEV-Share, MEV Blocker): user transactions go to searchers who bid to backrun them, and most of the bid is rebated to the user. Sandwiching is excluded.</li>
<li><b>Intent auctions</b> (CoW, UniswapX): solvers compete on the price they deliver, so MEV turns into user surplus.</li>
<li><b>MEV taxes</b> (Paradigm's "Priority Is All You Need"): on chains with competitive priority ordering (many OP Stack L2s), an app can charge fees proportional to the priority fee, capturing searchers' competition for itself or its LPs.</li>
<li><b>App-specific sequencing</b>: the app defines ordering rules. Hyperliquid processes cancels before takers. AMM hooks can auction the right to the first swap of each block to recapture LVR.</li></ul>
<h4>Solana</h4>
<p>Jito's block engine runs bundle auctions with tips to validators. Sandwiching on Solana was an issue that validators and Jito tried to limit, and app-level protections (such as RFQ and protected routes in aggregators) matter there.</p>
<h4>Design principle</h4>
<p>Assume someone will capture the ordering value. Decide in your protocol's design whether it goes to <b>users, LPs, the protocol, or validators</b>, and enforce that choice.</p>`,
    keys: ["OFAs rebate backrun value to users", "Intent auctions turn MEV into user surplus", "MEV taxes let apps capture priority competition", "App-specific ordering is a design lever"],
    src: [
      ["Paradigm, Priority Is All You Need", "https://www.paradigm.xyz/writing/priority-is-all-you-need", "P", "MEV taxes under priority ordering."],
      ["Flashbots docs", "https://docs.flashbots.net/", "D", "Protect RPC and MEV-Share."],
      ["CoW Protocol docs", "https://docs.cow.fi/", "D", "Batch auctions as MEV protection."],
      ["Jito docs", "https://docs.jito.wtf/", "D", "Solana bundles, tips and the block engine."]
    ],
    build: "Implement a MEV-tax hook concept: in a simple AMM on a local OP Stack devnet (or an anvil simulation), charge a fee equal to k × priority fee per gas and route it to LPs. Simulate competing arbitrageurs and measure how much LVR is recaptured.",
    quiz: [
      ["How does an order-flow auction help users?", ["Searchers bid for backrun rights and part of the payment is rebated to the user", "It makes transactions free", "It hides transactions forever", "It speeds up finality"], "The value of the user's order flow goes back to the user."],
      ["What do MEV taxes rely on?", ["Competitive priority ordering, where the highest priority fee goes first", "Proof of work", "Encrypted mempools", "Off-chain matching"], "Apps charge fees proportional to the priority fee, capturing competition."],
      ["Which is an app-specific ordering rule?", ["Processing cancels before taker orders within a block", "Using EIP-1559", "Requiring 12-second slots", "Using BLS signatures"], "The app decides intra-block order to protect makers."]
    ]
  },
  {
    id: "u11l4", t: "Market makers, latency and CEX–DEX arbitrage", min: 11,
    sum: "How professional trading firms interact with onchain venues, and what that means for your protocol's liquidity.",
    body: `<p>Most onchain liquidity and price accuracy comes from <b>professional market makers and arbitrageurs</b> who also trade on centralized exchanges.</p>
<ul><li><b>CEX–DEX arb</b>: when Binance moves, AMM prices are stale until someone trades them back. The winner is whoever has the best CEX hedge execution and block inclusion (often via builder integration).</li>
<li><b>Market making on onchain CLOBs</b>: firms co-locate near validators or API servers, run inventory models (Avellaneda–Stoikov-style skew), and hedge on CEXs.</li>
<li><b>L2 dynamics</b>: on chains with first-come-first-served or priority ordering, bots spam transactions or probe for opportunities, which raises costs for everyone. Chains respond with priority fee auctions, revert protection and sequencer policies.</li></ul>
<h4>For your protocol</h4>
<ul><li><b>Make makers' lives easy</b>: cheap cancels, batch order placement, maker rebates, API keys and session keys, clear risk limits.</li>
<li><b>Know who your informed flow is</b> (Unit 1 markouts) and price accordingly.</li>
<li><b>Bootstrap</b> with designated market-maker agreements or a protocol-owned vault (HLP-style). Unit 13 covers the deal terms.</li></ul>`,
    keys: ["Pro MMs and arbs provide most onchain liquidity", "CEX–DEX arb rewards the best hedge and inclusion", "Spam-based MEV on L2s raises everyone's costs", "Design for makers: cheap cancels, rebates, APIs"],
    src: [
      ["Avellaneda and Stoikov, High-frequency trading in a limit order book", "https://people.orie.cornell.edu/sfs33/LimitOrderBook.pdf", "P", "The classic inventory-aware market-making model."],
      ["Hyperliquid API docs", "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api", "D", "Order placement, batch orders, cancels and websocket feeds."],
      ["Flashbots writings", "https://writings.flashbots.net/", "P", "Research on CEX–DEX arbitrage and L2 MEV."]
    ],
    build: "Implement an Avellaneda–Stoikov market maker in a simulator, using recorded Hyperliquid order-book and trade data as the environment. Measure PnL, inventory and markouts, then add a CEX hedge leg.",
    quiz: [
      ["In Avellaneda–Stoikov, why does a market maker skew quotes when holding inventory?", ["To encourage trades that bring inventory back toward target", "To raise fees", "To lower funding", "To trigger liquidations"], "Skewing reduces inventory risk by making offsetting trades more likely."],
      ["Who usually wins CEX–DEX arbitrage on Ethereum?", ["Firms with the best CEX execution and reliable block inclusion", "Random retail users", "Validators by default", "LPs"], "Speed, hedging and builder access determine the winner."],
      ["What's a good way to bootstrap liquidity on a new perp venue?", ["Market-maker agreements or a protocol-owned market-making vault", "Removing cancels", "Charging makers more than takers", "Hiding the order book"], "Liquidity attracts flow, so seed it deliberately."]
    ]
  },
  {
    id: "u11l5", t: "Build a searcher or liquidation bot", min: 14,
    sum: "The architecture of a production MEV bot: ingestion, state, detection, simulation, submission, risk.",
    body: `<pre><code>  ┌─────────── collectors ───────────┐
  │ new blocks · logs · mempool/OFA  │
  │ CEX websocket prices · oracles   │
  └───────────────┬──────────────────┘
                  ▼
          state mirror (pools, positions, HFs)
                  ▼
          strategies → candidate actions
                  ▼
          simulate (revm / anvil fork) → profit after gas, revert risk
                  ▼
          executors: Flashbots bundle · private RPC · direct tx
                  ▼
          risk: max size, kill switch, PnL tracking, alerting</code></pre>
<ul><li><b>Language</b>: Rust (alloy, revm, Artemis-style collector, strategy and executor pipelines) for speed. Python or TS for prototypes.</li>
<li><b>State mirror</b>: keep reserves, ticks and positions in memory, updated from logs. Never call an RPC in the hot path.</li>
<li><b>Simulation</b>: always simulate against the exact pending state. Assume competitors and reorgs.</li>
<li><b>Submission</b>: bundles revert-protected through builders. Bid a share of profit as the builder payment.</li>
<li><b>Start where competition is thin</b>: long-tail liquidations, new chains, new protocols. Mainstream ETH arb is dominated by a few firms.</li></ul>
<p><b>Safety</b>: run on forks and testnets first, use a dedicated hot wallet with small balances, and add kill switches. Most bots lose money until they find an edge.</p>`,
    keys: ["Collect → mirror state → detect → simulate → submit → risk", "Never hit RPC in the hot path; mirror state", "Simulate everything; bundles must be revert-safe", "Hunt in less competitive niches first"],
    src: [
      ["Artemis (Paradigm)", "https://github.com/paradigmxyz/artemis", "C", "A Rust MEV-bot framework with collectors, strategies and executors (no longer actively updated, still instructive)."],
      ["Flashbots simple-arbitrage", "https://github.com/flashbots/simple-arbitrage", "C", "A minimal example of a bundle-based arbitrage bot."],
      ["reth", "https://github.com/paradigmxyz/reth", "C", "Run your own node; ExEx for in-node strategies."],
      ["Flashbots docs", "https://docs.flashbots.net/", "D", "Bundle submission and relay APIs."]
    ],
    build: "Build a liquidation bot for one Morpho Blue or Aave market on a fork: event-driven HF tracking, revm simulation, a flash-loan executor contract, bundle submission on testnet. Add a dashboard of opportunities seen versus won.",
    quiz: [
      ["Why mirror protocol state in memory instead of querying RPC per opportunity?", ["RPC calls are too slow for competitive detection", "RPCs are inaccurate", "To save storage", "Because state is encrypted"], "Latency decides MEV races, so keep state local and update it from events."],
      ["Why simulate every bundle before sending it?", ["To confirm profit after gas and avoid reverts against current state", "Because builders require Python", "To get a refund", "To lower funding"], "Simulation catches stale opportunities and bad assumptions."],
      ["Where should a new searcher look for an edge?", ["Long-tail protocols, new chains and niche liquidations", "Mainstream ETH/USDC arbitrage", "Bitcoin mining", "CEX spot trading"], "Competition is weaker where large firms haven't integrated yet."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u12", t: "Bridges and interoperability", tag: "Chains",
  d: "Trust models, token-transfer designs, messaging protocols, the biggest bridge hacks including KelpDAO 2026, and how to build a bridge safely.",
  lessons: [
  {
    id: "u12l1", t: "The bridge problem and trust models", min: 13,
    sum: "Chain B can't see chain A. Every bridge is an answer to 'who tells B what happened on A, and why believe them?'",
    body: `<p>Blockchains can't read each other. A bridge needs a <b>verification mechanism</b> to convince chain B that an event (lock, burn, message) happened on chain A.</p>
<div class="tbl"><table><thead><tr><th>Model</th><th>How B is convinced</th><th>Examples</th><th>Trust</th></tr></thead><tbody>
<tr><td>Externally verified</td><td>m-of-n signers (multisig, MPC, guardians, DVNs, oracle networks)</td><td>Wormhole (19 guardians), LayerZero DVNs, CCIP, Axelar</td><td>An honest threshold of the signer set</td></tr>
<tr><td>Natively verified</td><td>Light client of A running on B (verifies consensus signatures and Merkle proofs), possibly ZK-compressed</td><td>IBC, ZK light-client bridges, rollup canonical bridges</td><td>A's consensus itself</td></tr>
<tr><td>Optimistic</td><td>Messages accepted after a challenge window unless a watcher proves fraud</td><td>Nomad (historical), Across settlement via an optimistic oracle</td><td>At least one honest watcher</td></tr>
<tr><td>Locally verified</td><td>Counterparties check each other (HTLCs, atomic swaps)</td><td>Atomic swaps, liquidity networks</td><td>Only the two parties</td></tr>
</tbody></table></div>
<p>The trade-off is trust minimization versus generality, cost and latency. Light clients are the strongest but expensive and chain-specific. External verifiers are cheap and general but add a new trust set, and it is usually where hacks happen.</p>
<p>A deeper point (Vitalik's multichain argument): even a perfect light-client bridge inherits the <b>source chain's</b> security. If A gets 51%-attacked, B's bridged assets can be backed by nothing.</p>`,
    keys: ["Bridges = verification of foreign chain events", "External, native, optimistic and local models", "Light clients minimize trust but cost more", "Bridged assets inherit the source chain's security"],
    src: [
      ["Zamyatin et al., SoK: Communication Across Distributed Ledgers", "https://eprint.iacr.org/2019/1128", "P", "The foundational systematization of cross-chain communication."],
      ["IBC docs", "https://ibc.cosmos.network/", "D", "Light-client-based interoperability."],
      ["L2BEAT", "https://l2beat.com/", "T", "Risk analysis including rollup bridges."],
      ["Helios (a16z light client)", "https://github.com/a16z/helios", "C", "A working light client: verifies chain data instead of trusting an RPC."]
    ],
    build: "Classify 8 bridges you've used or heard of into the four models. For each, write down the exact set of parties whose collusion or compromise could steal funds.",
    quiz: [
      ["Which model is generally the most trust-minimized?", ["Native verification with a light client of the source chain", "A 2-of-3 multisig", "A single relayer", "A centralized exchange"], "The destination checks the source chain's consensus directly."],
      ["Wormhole's guardian network is an example of…", ["External verification by m-of-n signers", "A light client", "An atomic swap", "A ZK rollup"], "19 guardians sign observations, and a supermajority is required."],
      ["What's the limit even of a perfect light-client bridge?", ["It inherits the source chain's security; a 51% attack there breaks it", "It can't move tokens", "It requires KYC", "It only works on Bitcoin"], "Verification is only as strong as the chain being verified."]
    ]
  },
  {
    id: "u12l2", t: "Moving tokens: lock-mint, burn-mint, pools and intents", min: 12,
    sum: "Wrapped assets, native burn-and-mint (CCTP, OFT, CCT), liquidity networks and intent-based fast bridging.",
    body: `<ul><li><b>Lock and mint</b>: lock on A, mint a wrapped IOU on B. The wrapped token is only as good as the locked pool, and a bridge hack makes every wrapped token unbacked at once. It also creates fragmentation (USDC.e versus native USDC).</li>
<li><b>Burn and mint</b> (issuer-native): the token issuer controls minting on every chain. Burn on A, then mint on B after verification. Examples: Circle's <b>CCTP</b> for USDC, LayerZero's <b>OFT</b>, Chainlink's <b>CCT</b>. There's no honeypot of locked funds, but whoever can authorize a mint can create tokens out of thin air.</li>
<li><b>Liquidity networks</b>: pools of the asset on each chain. You deposit on A and withdraw from B's pool. They need rebalancing and LPs, and price the imbalance.</li>
<li><b>Intents and relayers</b>: a relayer pays you on B immediately from its own inventory, then is repaid on A after slower verification. You get speed, and the relayer bears finality and verification risk. Examples: Across, UniswapX cross-chain, ERC-7683 orders.</li>
<li><b>Canonical rollup bridges</b>: verified by the rollup's own proof system. Trust-minimized, but optimistic exits take about 7 days.</li></ul>
<h4>Design questions</h4>
<ol><li>Where does the risk sit: a locked pool, mint authority, LPs, or relayers?</li>
<li>What happens to holders on B if verification breaks?</li>
<li>Is there a rate limit on minting per time window?</li></ol>`,
    keys: ["Lock-mint creates honeypots and fragmentation", "Burn-mint moves risk to mint authority", "Intents: relayers front liquidity and take finality risk", "Rate-limit minting"],
    src: [
      ["Circle CCTP docs", "https://developers.circle.com/cctp", "D", "Native USDC burn and mint across chains."],
      ["LayerZero docs", "https://docs.layerzero.network/", "D", "OFT standard, DVNs and executors."],
      ["Chainlink CCIP docs", "https://docs.chain.link/ccip", "D", "Cross-chain token (CCT) standard and messaging."],
      ["Across docs", "https://docs.across.to/", "D", "Intent-based bridging with relayers."],
      ["ERC-7683", "https://eips.ethereum.org/EIPS/eip-7683", "D", "Cross-chain intent standard."]
    ],
    build: "Bridge USDC between two testnets via CCTP and via an intent bridge. Trace the transactions on both chains, measure the latency, and draw who held risk at each moment.",
    quiz: [
      ["What's the main risk of lock-and-mint bridges?", ["The locked pool is a honeypot; if it's drained, wrapped tokens become unbacked", "Tokens can't be traded", "They need a validator per user", "They only work with NFTs"], "All wrapped supply depends on one locked pool."],
      ["In an intent-based bridge, who takes the finality risk?", ["The relayer who fronts funds on the destination chain", "The user", "The source chain validators", "Nobody"], "The relayer pays first and gets repaid after verification."],
      ["Why is a per-window mint rate limit valuable?", ["It caps losses if verification is compromised", "It lowers fees", "It speeds up bridging", "It improves the oracle"], "Even a full compromise can only mint up to the limit before humans react."]
    ]
  },
  {
    id: "u12l3", t: "Messaging protocols compared", min: 12,
    sum: "IBC, LayerZero, Wormhole, CCIP, Hyperlane and Axelar: verification sets and who configures them.",
    body: `<div class="tbl"><table><thead><tr><th>Protocol</th><th>Verification</th><th>Notes</th></tr></thead><tbody>
<tr><td>IBC</td><td>Onchain light clients plus relayers</td><td>Native to Cosmos. Relayers are untrusted transport. ICS-20 for tokens</td></tr>
<tr><td>LayerZero</td><td>App-configured DVNs (decentralized verifier networks) plus executors</td><td>The <b>app chooses</b> its security stack (X-of-Y-of-N DVNs). A weak config is the app's risk</td></tr>
<tr><td>Wormhole</td><td>19 guardians sign VAAs (13 needed)</td><td>Broad chain coverage. Fixed guardian set</td></tr>
<tr><td>Chainlink CCIP</td><td>Oracle DONs plus a separate Risk Management Network</td><td>Defense in depth. CCT for tokens</td></tr>
<tr><td>Hyperlane</td><td>Interchain Security Modules chosen by the app</td><td>Permissionless deployment to any chain</td></tr>
<tr><td>Axelar</td><td>Its own PoS validator chain</td><td>A hub with a general message-passing API</td></tr>
</tbody></table></div>
<h4>The 2026 lesson: configurable security means configurable failure</h4>
<p>When the app picks its verifier set, <b>the app owns that decision</b>. KelpDAO's rsETH bridge ran on a <b>1-of-1 DVN</b> configuration, and that single verifier was tricked into signing a forged message (next lesson). Afterwards LayerZero said it would stop signing for 1-of-1 configurations, and Kelp disputed that 1-of-1 had been effectively the documented default.</p>
<pre><code>rule of thumb for your app:
  ≥ 2 independent verifier sets (different operators, infrastructure, codebases)
  + rate limits + pause guardian + monitoring that compares source and destination supply</code></pre>`,
    keys: ["IBC: light clients; others: external verifier sets", "LayerZero and Hyperlane: the app configures security", "Defense in depth: independent verifiers + rate limits", "1-of-1 verification is a single point of failure"],
    src: [
      ["IBC docs", "https://ibc.cosmos.network/", "D", "Clients, connections, channels and relayers."],
      ["LayerZero docs", "https://docs.layerzero.network/", "D", "DVN configuration and security stack."],
      ["Wormhole docs", "https://wormhole.com/docs", "D", "Guardians, VAAs and NTT."],
      ["Hyperlane docs", "https://docs.hyperlane.xyz/", "D", "Interchain Security Modules."],
      ["Chainlink CCIP docs", "https://docs.chain.link/ccip", "D", "DONs and the Risk Management Network."]
    ],
    build: "Deploy a LayerZero OApp (or Hyperlane app) between two testnets. Configure it with 2 required DVNs or ISMs, then write a test plan for what happens if one verifier signs a forged message.",
    quiz: [
      ["In LayerZero, who decides how many DVNs must verify a message?", ["The application", "LayerZero alone, for everyone", "Ethereum validators", "The user per transaction"], "Security stacks are configured per app."],
      ["What makes IBC different from guardian-based bridges?", ["It verifies the counterparty chain's consensus with onchain light clients", "It uses 19 guardians", "It requires a centralized relayer to be honest", "It only moves NFTs"], "IBC relayers just carry data. The light clients do the verification."],
      ["What's the minimum sensible defense for an app's bridge configuration?", ["Multiple independent verifiers, rate limits, a pause guardian and supply monitoring", "One verifier with a strong password", "A higher gas limit", "Anonymous operators"], "Independent verifiers plus damage caps."]
    ]
  },
  {
    id: "u12l4", t: "Bridge hacks: Ronin to KelpDAO", min: 15,
    sum: "Billions lost, mostly to key compromise and verification bugs. Each one teaches a design rule.",
    body: `<div class="tbl"><table><thead><tr><th>Incident</th><th>Loss</th><th>Root cause</th><th>Rule</th></tr></thead><tbody>
<tr><td>Wormhole (Feb 2022)</td><td>~$325M</td><td>Signature verification bypass on Solana (spoofed sysvar account), minting 120k wETH</td><td>Verify every account and input your verifier trusts</td></tr>
<tr><td>Ronin (Mar 2022)</td><td>~$625M</td><td>5 of 9 validator keys compromised (4 from one operator, plus a stale allowlist)</td><td>Independent signers; revoke stale permissions</td></tr>
<tr><td>Harmony Horizon (Jun 2022)</td><td>~$100M</td><td>2-of-5 multisig keys compromised</td><td>Low thresholds are not security</td></tr>
<tr><td>Nomad (Aug 2022)</td><td>~$190M</td><td>An upgrade initialized the trusted root to 0x00, so every message passed. A crowd copy-pasted the exploit</td><td>Test upgrades and initializers adversarially</td></tr>
<tr><td>Multichain (Jul 2023)</td><td>~$126M</td><td>"MPC" keys effectively controlled by one person</td><td>Verify decentralization claims</td></tr>
<tr><td><b>KelpDAO rsETH (Apr 18, 2026)</b></td><td><b>~$292M (116,500 rsETH)</b></td><td>LayerZero bridge configured with a single DVN. LayerZero's report says the attacker poisoned the RPC nodes that DVN relied on and DDoS'd the clean ones, so it signed a forged message. Attributed to DPRK-linked actors. The stolen rsETH was then posted on Aave to borrow WETH</td><td>Never run single-verifier bridges; monitor supply</td></tr>
</tbody></table></div>
<h4>The KelpDAO fallout</h4>
<p>Kelp disputed the post-mortem, saying 1-of-1 was LayerZero's documented default, and announced a migration to Chainlink's CCT. LayerZero said it would stop signing for 1-of-1 configurations. <b>Aave froze rsETH markets</b>: a bridge failure became a lending-market risk within hours.</p>
<p>Lessons across the table:</p>
<ul><li><b>Keys and configuration, not cryptography</b>, cause most losses.</li>
<li><b>Contagion</b>: bridged collateral in lending markets spreads the damage.</li>
<li><b>Rate limits</b> would have capped almost every one of these.</li></ul>`,
    keys: ["Most bridge losses come from keys, config and verification bugs", "KelpDAO 2026: about $292M via a single-DVN configuration", "Bridged collateral spreads losses into lending", "Rate limits and independent verifiers cap the damage"],
    src: [
      ["rekt: KelpDAO", "https://rekt.news/kelpdao-rekt", "R", "The April 2026 rsETH bridge exploit."],
      ["CoinDesk: Kelp disputes LayerZero's post-mortem", "https://www.coindesk.com/tech/2026/04/20/kelp-dao-claims-layerzero-s-default-settings-are-what-actually-caused-the-usd290-million-disaster", "N", "Both sides of the configuration dispute."],
      ["The Defiant: LayerZero's incident report", "https://thedefiant.io/news/hacks/layerzero-s-incident-report-says-kelp-downgraded-from-2-of-2-to-1-of-1-before-usd292m-exploit", "N", "LayerZero's account of the DVN downgrade."],
      ["rekt: Ronin", "https://rekt.news/ronin-rekt", "R", "Validator key compromise."],
      ["rekt: Wormhole", "https://rekt.news/wormhole-rekt", "R", "Signature verification bypass."],
      ["rekt: Nomad", "https://rekt.news/nomad-rekt", "R", "The zero-root initialization bug."]
    ],
    build: "Reproduce the Nomad bug in Foundry: a minimal replica with a confirmAt[root] mapping, an upgrade that initializes the trusted root to zero, and an exploit test. Then add a test that would have caught it before deployment.",
    quiz: [
      ["What made the Nomad exploit so widespread?", ["A bad initialization made every message valid, so anyone could copy the exploit transaction", "A 51% attack", "An oracle failure", "A phishing email"], "Once any message passed, hundreds of addresses copy-pasted the attack."],
      ["What configuration weakness enabled the 2026 KelpDAO exploit?", ["A single (1-of-1) verifier on the LayerZero bridge", "A 13-of-19 guardian set", "A light client bug in IBC", "A Uniswap v4 hook"], "One compromised verifier was enough to sign a forged message."],
      ["How did the KelpDAO hack spread to lending markets?", ["The stolen rsETH was used as collateral on Aave to borrow WETH", "Aave's contracts were hacked directly", "Chainlink stopped working", "ETH depegged"], "Bridged collateral carries bridge risk into every protocol that accepts it."]
    ]
  },
  {
    id: "u12l5", t: "Build a bridge (safely)", min: 15,
    sum: "A lock-mint bridge between two local chains, then hardened: replay protection, finality, rate limits, watchers, upgrades.",
    body: `<h4>v0: the minimal bridge</h4>
<pre><code>// Chain A
function lock(uint256 amt, address to) external {
    token.safeTransferFrom(msg.sender, address(this), amt);
    emit Locked(nonce++, msg.sender, to, amt, block.chainid, DEST_CHAIN);
}
// Chain B
function mint(Message calldata m, bytes[] calldata sigs) external {
    bytes32 h = keccak256(abi.encode(m, SRC_CHAIN, address(this)));
    require(!consumed[h], "replay");  consumed[h] = true;
    require(verify(h, sigs) >= THRESHOLD, "sigs");   // sorted unique signers
    require(windowMinted + m.amt <= WINDOW_CAP, "rate limit");
    windowMinted += m.amt;
    wrapped.mint(m.to, m.amt);
}</code></pre>
<h4>Hardening checklist</h4>
<ol><li><b>Domain separation</b>: hash in the source chain, destination chain, contract address and nonce (cross-chain replay is a real 2026 attack pattern).</li>
<li><b>Finality</b>: relayers wait for source finality (finalized checkpoint, or N confirmations), and handle reorgs.</li>
<li><b>Verifier set</b>: m-of-n signers with sorted unique addresses, key rotation with a timelock, and operators on independent infrastructure. Upgrade path toward light-client or ZK verification.</li>
<li><b>Rate limits</b> per window and per transfer size. Large transfers get a delay.</li>
<li><b>Watchers</b>: independent processes compare locked on A with minted on B and can pause.</li>
<li><b>Pause and recovery</b>: a guardian can pause, upgrades are timelocked, and the incident runbook is written in advance.</li>
<li><b>Invariant monitored offchain</b>: Σ minted(B) ≤ Σ locked(A), alerting within one block.</li></ol>`,
    keys: ["Replay protection: chain ids, contract, nonce, consumed map", "Wait for finality; handle reorgs", "m-of-n with independent operators, then light client or ZK", "Rate limits + watchers + pause = bounded losses"],
    src: [
      ["OpenZeppelin Contracts", "https://github.com/OpenZeppelin/openzeppelin-contracts", "C", "ECDSA, EIP712, Pausable and AccessControl building blocks."],
      ["Foundry", "https://www.getfoundry.sh/", "D", "Run two anvil chains and test cross-chain flows."],
      ["Hyperlane docs", "https://docs.hyperlane.xyz/", "D", "Study production ISM designs after building your own."],
      ["DeFiHackLabs", "https://github.com/SunWeb3Sec/DeFiHackLabs", "C", "Reproduce real bridge exploits against your design."]
    ],
    build: "Build v0 with two anvil instances and a Rust or TypeScript relayer with 3 signers (2-of-3). Then add each hardening item, with a failing test written first for each: replay across chains, reorg on the source, a compromised signer, a rate-limit breach, and watcher-triggered pause.",
    quiz: [
      ["Why include the destination contract address in the signed message hash?", ["To stop the same signatures being replayed on another deployment or chain", "To save gas", "To make the message shorter", "Because ERC-20 requires it"], "Domain separation binds each signature to exactly one target."],
      ["Why must relayers wait for source-chain finality?", ["A reorg could remove the lock after the mint already happened", "To lower fees", "To batch more messages", "Because blobs expire"], "Minting against an event that disappears creates unbacked tokens."],
      ["Which invariant should watchers monitor continuously?", ["Total minted on B ≤ total locked on A", "Gas price on A", "Number of signers online", "Token name equality"], "Any violation means unbacked tokens exist, so pause immediately."]
    ]
  }
  ]
});
