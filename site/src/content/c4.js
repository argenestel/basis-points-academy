window.BP_UNITS.push({
  id: "u13", t: "Funding, tokens and liquidity bootstrapping", tag: "Launch",
  d: "How protocols raise money, design tokens, bootstrap liquidity, work with market makers, and run points and airdrops without renting fake volume.",
  lessons: [
  {
    id: "u13l1", t: "How protocols get funded", min: 12,
    sum: "Grants, VC rounds with token warrants, public sales, and the 2025–26 token-sale revival.",
    body: `<p>Funding options, roughly in the order teams use them:</p>
<ul><li><b>Grants</b>: ecosystem foundations, L2 grant programs, retroactive public-goods funding. Non-dilutive, but small, and they come with ecosystem strings attached.</li>
<li><b>Angels and pre-seed / seed VC</b>: usually <b>equity (SAFE) plus a token warrant or side letter</b> giving investors a share of future tokens. Typical terms are a 1-year cliff and 2–4 years of vesting.</li>
<li><b>Strategic rounds</b> from exchanges, market makers or other protocols: they bring distribution and liquidity, but can also bring conflicts.</li>
<li><b>Public token sales</b>: ICOs (2017) gave way to IEOs and launchpads, then LBPs, then compliant onchain raises. In <b>2025</b> the model came back. Coinbase acquired the raising platform <b>Echo</b> (and its Sonar public-sale tool) for about $375M, and its first sale (Monad) raised about $269M from roughly 85,000 participants. Futarchy-governed raises (MetaDAO) and curated launchpads also grew.</li>
<li><b>Revenue first</b>: Hyperliquid famously took no VC money, built a product people paid for, and airdropped about 31% of supply to users in November 2024.</li></ul>
<h4>Decide what you're selling</h4>
<p>Equity in a company, a token in a network, or both. Your legal structure (a foundation or DAO entity next to a dev company), jurisdiction and disclosures follow from that. Get a crypto-specialist lawyer before any sale. <i>This is not legal advice.</i></p>`,
    keys: ["Grants → angels/VC (SAFE + token warrant) → public sale", "Cliffs and vesting align teams and investors", "Compliant public sales returned in 2025 (Echo/Sonar, Coinbase)", "Revenue-first plus a community airdrop is a credible alternative"],
    src: [
      ["Cointelegraph: Coinbase acquires Echo for $375M", "https://cointelegraph.com/news/coinbase-acquires-capital-raising-platform-echo-375-million", "N", "The 2025 return of onchain capital formation."],
      ["The Block: Can ICOs make a comeback?", "https://www.theblock.co/newsletters/layer-one/2025-11-27-layer-one-can-icos-make-a-comeback-410701", "N", "A sceptical view of launchpad ROI."],
      ["Ethereum Foundation Ecosystem Support", "https://esp.ethereum.foundation/", "D", "Non-dilutive grants for public goods and research."]
    ],
    build: "Write a one-page funding plan for your capstone protocol: how much you need for 18 months, which instruments, what the investor terms would be (valuation, token allocation, cliff and vesting), and what you'd keep for the community.",
    quiz: [
      ["What's a common early-stage crypto VC instrument?", ["Equity (SAFE) plus a token warrant or side letter", "A bank loan", "An options vault", "A perp position"], "Investors get company equity and rights to future tokens."],
      ["Why do token allocations have cliffs and vesting?", ["To align insiders with long-term success and limit early selling", "To reduce gas costs", "To meet ERC-20 requirements", "To raise funding rates"], "Unlocks over time reduce dump risk and keep contributors engaged."],
      ["What did Hyperliquid's path show?", ["A product with real revenue plus a large community airdrop can work without VC funding", "VC funding is required", "Airdrops always fail", "Tokens can't have value"], "It funded itself and distributed a large share to users."]
    ]
  },
  {
    id: "u13l2", t: "Token design and value accrual", min: 13,
    sum: "Supply, emissions, float vs FDV, unlocks, and how (or whether) a token captures protocol value.",
    body: `<pre><code>FDV = price × max supply          market cap = price × circulating supply
float = circulating / max supply
annual sell pressure ≈ emissions + unlocks × (share expected to sell)
value accrual ≈ fees routed to buyback/burn or stakers − dilution</code></pre>
<p>The 2024 complaint was <b>"low float, high FDV"</b>: tokens launched with about 10% circulating at huge valuations, followed by years of unlocks that early buyers absorbed. Design for an honest float and clear unlock schedules.</p>
<h4>Ways a token can accrue value</h4>
<ul><li><b>Fee switch and buyback-and-burn</b>: Uniswap's UNIfication (Dec 2025) turned on protocol fees for burns. Hyperliquid routes trading fees to buy back HYPE.</li>
<li><b>Fee sharing to stakers</b>, with a lock-up.</li>
<li><b>Work token</b>: you must stake it to provide a service (validators, keepers, HIP-3 deployers staking HYPE).</li>
<li><b>Governance</b> over valuable parameters and treasury.</li>
<li><b>Collateral and gas use</b> on your own chain.</li></ul>
<h4>Design questions</h4>
<ol><li>Who needs to hold your token, and why? If the honest answer is "nobody", it's a fundraising instrument, not a product.</li>
<li>What happens to price if emissions stop?</li>
<li>Do regulations treat it as a security? It depends on the structure and the jurisdiction. Ask counsel.</li></ol>`,
    keys: ["Know FDV, float and unlock overhang", "Avoid low-float/high-FDV launches", "Accrual: buyback-burn, fee share, work token, governance", "If nobody needs to hold it, it's not a product"],
    src: [
      ["Uniswap governance forum", "https://gov.uniswap.org/", "D", "The fee-switch debate and UNIfication."],
      ["Tokenomist (token unlock data)", "https://tokenomist.ai/", "T", "Unlock schedules and emissions across tokens."],
      ["Token Terminal", "https://tokenterminal.com/", "T", "Revenue, earnings and incentives by protocol."]
    ],
    build: "Model your token in a spreadsheet: allocations (team, investors, community, treasury), cliffs and vesting, emissions, and a fee-funded buyback. Chart monthly net supply change versus buyback capacity at three revenue scenarios.",
    quiz: [
      ["A token has 1B max supply, 100M circulating, price $2. What's the FDV?", ["$2B", "$200M", "$100M", "$1B"], "FDV = price × max supply = $2 × 1B."],
      ["Why was 'low float, high FDV' criticized?", ["Large future unlocks create persistent sell pressure on early buyers", "It reduces gas fees", "It raises staking yield", "It's illegal"], "Insiders' unlocks hit a thin float for years."],
      ["Which is a 'work token' design?", ["Operators must stake the token to provide a service and can be slashed", "The token is only used for votes", "The token is only airdropped", "The token is pegged to $1"], "Staking requirements create demand tied to network usage."]
    ]
  },
  {
    id: "u13l3", t: "Bootstrapping liquidity", min: 13,
    sum: "Liquidity mining, vampire attacks, ve-tokenomics and bribes, protocol-owned liquidity and LBPs: what worked and what it cost.",
    body: `<ul><li><b>Liquidity mining (June 2020)</b>: Compound's COMP distribution started DeFi Summer. You pay users tokens to supply, borrow or LP. It works fast, but most of the capital is <b>mercenary</b> and leaves when rewards drop.</li>
<li><b>Vampire attack (2020)</b>: SushiSwap paid Uniswap LPs to migrate their LP tokens and moved hundreds of millions of liquidity. Liquidity is portable, and forks can buy it.</li>
<li><b>ve-tokenomics</b> (Curve veCRV): lock tokens (up to 4 years) to get boosted rewards and votes on where emissions go. Protocols then bribed veCRV holders (Convex, Votium) to direct emissions to their pools. This was the <b>Curve Wars</b>, a market for liquidity incentives.</li>
<li><b>Protocol-owned liquidity</b> (Olympus bonds, 2021): sell tokens at a discount for LP tokens, so the protocol owns its liquidity permanently. It's durable, but it's a reflexive treasury bet.</li>
<li><b>Liquidity bootstrapping pools</b> (Balancer LBPs): weights shift over time, which starts the price high and lets it fall to clearing, discouraging snipers.</li>
<li><b>Protocol market-making vaults</b> (Hyperliquid's HLP): users deposit into a vault that quotes and backstops liquidations, sharing its PnL. Liquidity is owned by the community.</li></ul>
<pre><code>incentive efficiency = (liquidity or volume that stays after rewards end) / (USD value of rewards paid)
</code></pre>
<p>Measure retention, not peak TVL.</p>`,
    keys: ["Liquidity mining is fast, mercenary and expensive", "ve-tokenomics + bribes = a market for emissions", "Protocol-owned liquidity and MM vaults are durable", "Measure liquidity retained per incentive dollar"],
    src: [
      ["Curve docs and resources", "https://resources.curve.finance/", "D", "veCRV, gauges and boosts."],
      ["Balancer docs", "https://docs.balancer.fi/", "D", "Weighted pools and liquidity bootstrapping pools."],
      ["Olympus docs", "https://docs.olympusdao.finance/", "D", "Bonds and protocol-owned liquidity."],
      ["Hyperliquid docs", "https://hyperliquid.gitbook.io/hyperliquid-docs", "D", "Vaults and HLP as protocol market making."]
    ],
    build: "Using DefiLlama data, pick two protocols that ran large liquidity-mining programs. Chart TVL before, during and 90 days after rewards ended, and compute incentive efficiency for each.",
    quiz: [
      ["What did the SushiSwap 'vampire attack' show?", ["Liquidity can be bought away with incentives", "AMMs can't be forked", "Liquidity mining always fails", "veTokens are illegal"], "Sushi paid Uniswap LPs to migrate and moved large liquidity quickly."],
      ["What were the 'Curve Wars' about?", ["Protocols competing for veCRV votes to direct emissions to their pools", "A hack of Curve", "Validator elections", "A lawsuit"], "Bribes bought gauge votes, which created a market for emissions."],
      ["What's a durable alternative to renting liquidity with emissions?", ["Protocol-owned liquidity or a protocol market-making vault", "Higher APYs forever", "Hiding TVL", "Removing fees"], "Owned liquidity doesn't leave when incentives end."]
    ]
  },
  {
    id: "u13l4", t: "Market makers, listings and price discovery", min: 11,
    sum: "MM deal structures, red flags, CEX and perp listings, and how a token's first weeks of trading actually work.",
    body: `<h4>Market-maker deal types</h4>
<ul><li><b>Retainer</b>: you pay a fee, and the MM commits to KPIs (spread under X bps, depth at ±2%, uptime). Transparent and aligned.</li>
<li><b>Loan plus call option</b>: you lend the MM tokens, and it gets options to buy them at set strikes. Cheap upfront, but it can incentivize the MM to sell (hedging the options) and creates opaque supply. Demand reporting and caps.</li></ul>
<p><b>Red flags</b>: no KPI reporting, unlimited loan size, guaranteed price promises, related-party trading, and anything resembling wash trading (illegal in many places, and venue-quality analysts will catch it).</p>
<h4>Price discovery in 2025–26</h4>
<ul><li><b>Pre-launch perps</b> (Hyperliquid, Binance and others) often price a token before it exists, so the "launch price" is set weeks earlier.</li>
<li>CEX listings bring liquidity, but can mean listing fees, token allocations to launchpools and airdrops, and MM requirements.</li>
<li>Onchain launch tools (LBPs, v4 launch hooks, curated public sales) give more transparent discovery.</li></ul>
<h4>For your own DEX or perp venue</h4>
<p>Designated market-maker programs (rebates for meeting KPIs) and a protocol vault seed the book. Publish your MM program terms. Hidden deals erode trust when they're discovered.</p>`,
    keys: ["Retainer (KPIs) is cleaner than loan + call", "Demand KPI reporting and caps; avoid wash trading", "Pre-launch perps now set many launch prices", "Publish your market-maker program terms"],
    src: [
      ["Hyperliquid docs", "https://hyperliquid.gitbook.io/hyperliquid-docs", "D", "Pre-launch (hyperps) markets and vaults."],
      ["DefiLlama", "https://defillama.com/", "T", "Liquidity and volume data to verify MM claims."],
      ["Velo", "https://velo.xyz/", "T", "Derivatives data to watch pre-launch markets."]
    ],
    build: "Draft a market-maker KPI sheet for your token: spread, depth at ±1/2/5%, uptime and reporting cadence. Write a script that checks those KPIs from public order-book data on 2 venues every hour.",
    quiz: [
      ["Why can loan + call option MM deals be risky for projects?", ["The MM may sell borrowed tokens to hedge, adding opaque sell pressure", "They're always illegal", "They lower spreads too much", "They need a bridge"], "Hedging the options can mean selling the loaned tokens."],
      ["What do pre-launch perps change about token launches?", ["Price discovery happens before the token exists", "Tokens can't be listed on CEXs", "Airdrops become mandatory", "Fees go to zero"], "Traders price the token weeks before it's transferable."],
      ["Which KPI should a retainer MM report?", ["Depth within ±2% and average spread", "Twitter impressions", "GitHub stars", "Gas used"], "Depth and spread measure real liquidity."]
    ]
  },
  {
    id: "u13l5", t: "Points, airdrops and sybils", min: 11,
    sum: "Designing rewards for the users you want to keep, not the farmers you'll lose.",
    body: `<p><b>Points</b> are unpriced promises of a future airdrop. They became the dominant growth tool from 2023–25 (Blur, EigenLayer, Hyperliquid, and almost every perp DEX). They work because users speculate on the points' value. They fail when the airdrop disappoints or the token launches: Lighter's volume reportedly fell about 70% after its December 2025 launch.</p>
<h4>Reward what you want to keep</h4>
<ul><li>Fees actually paid (not raw volume, which can be washed).</li>
<li>Open interest held over time, maker volume, and liquidity provided at tight spreads.</li>
<li>Long-term retention: activity after the snapshot counts too.</li>
<li>Penalize self-trading and circular flows.</li></ul>
<h4>Sybil resistance</h4>
<ul><li>Cluster wallets by funding source, timing and behavior graphs.</li>
<li>Self-report bounties (LayerZero ran one in 2024).</li>
<li>Minimum thresholds plus concave rewards (square root of activity) to shrink the gain from splitting wallets.</li>
<li>Vesting or streaming claims to reduce instant dumps.</li></ul>
<h4>Measure the airdrop</h4>
<pre><code>retention_90d = users active 90 days after the claim / users who claimed
cost per retained user = airdrop value / retained users</code></pre>`,
    keys: ["Points speculate on future airdrops", "Reward fees, OI-time and maker activity, not raw volume", "Concave rewards and clustering fight sybils", "Track retention and cost per retained user"],
    src: [
      ["Allen et al., Airdrops: Giving Money Away Is Harder Than It Seems", "https://arxiv.org/abs/2312.02752", "P", "Empirical study of airdrop design and outcomes."],
      ["BlockEden: The perp DEX wars of 2026", "https://blockeden.xyz/blog/2026/01/29/perp-dex-wars-2026-hyperliquid-lighter-aster-edgex-paradex-decentralized-derivatives/", "N", "Incentive dynamics across perp venues."],
      ["Dune", "https://dune.com/", "T", "Query claimers and post-airdrop behavior."]
    ],
    build: "On Dune, analyze one major airdrop: how many claimers sold within 7 days, how many were still active after 90 days, and the cost per retained user. Propose a points formula that would have done better.",
    quiz: [
      ["Why reward fees paid rather than volume?", ["Volume can be wash-traded cheaply; fees cost real money", "Fees are easier to display", "Volume is always zero", "Regulators require fee-based rewards"], "Paying fees is costly, so it's a better signal of real use."],
      ["How does a concave (square-root) reward curve fight sybils?", ["Splitting activity across many wallets gives less advantage", "It bans all wallets", "It raises gas fees", "It doubles rewards for big users"], "With √, splitting doesn't multiply rewards the way a linear curve does."],
      ["Which metric best judges an airdrop's success?", ["90-day retention and cost per retained user", "Day-one claim count", "Token price at the hour of launch", "Number of tweets"], "The goal is durable users, not a launch spike."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u14", t: "Yield, restaking and prediction markets", tag: "DeFi",
  d: "LSTs and restaking, Pendle's yield tokenization, looping and vault risk, and the 2026 prediction-market boom.",
  lessons: [
  {
    id: "u14l1", t: "Liquid staking and restaking", min: 12,
    sum: "stETH, LRTs and EigenLayer: re-using staked ETH as collateral and security, and how the risks stack up.",
    body: `<p><b>Liquid staking tokens (LSTs)</b> such as Lido's stETH and Rocket Pool's rETH represent staked ETH and its rewards. stETH <b>rebases</b> (balance grows). rETH and wstETH use an <b>exchange rate</b> (value grows), which DeFi integrates more easily. Since Shapella (Apr 2023), withdrawals are possible through a queue.</p>
<p><b>Restaking</b> (EigenLayer and others) lets staked ETH or LSTs secure additional services (AVSs) for extra rewards, with extra <b>slashing</b> risk. Slashing went live on EigenLayer in 2025. <b>LRTs</b> (ether.fi's eETH, Kelp's rsETH, Renzo's ezETH) wrap restaked positions into tokens.</p>
<h4>The risk stack of an LRT</h4>
<ol><li>Ethereum validator slashing.</li>
<li>AVS slashing.</li>
<li>Smart-contract risk at the LST, the restaking protocol and the LRT.</li>
<li>Withdrawal-queue liquidity, which leads to <b>depegs</b> under stress (ezETH briefly depegged in April 2024).</li>
<li><b>Bridge risk</b> for LRTs on other chains (KelpDAO's rsETH, April 2026).</li></ol>
<p>Each layer is used as collateral in lending and Pendle, and looped. Risk compounds while the APY only adds.</p>`,
    keys: ["LSTs: rebasing vs exchange-rate designs", "Restaking adds AVS rewards and AVS slashing", "LRT risk = validator + AVS + contracts + liquidity + bridges", "Collateralizing and looping stack the risks"],
    src: [
      ["Lido docs", "https://docs.lido.fi/", "D", "stETH and wstETH mechanics and the withdrawal queue."],
      ["EigenCloud / EigenLayer docs", "https://docs.eigencloud.xyz/", "D", "Restaking, AVSs and slashing."],
      ["rekt: KelpDAO", "https://rekt.news/kelpdao-rekt", "R", "How LRT bridge risk materialized in 2026."]
    ],
    build: "Pick one LRT. Diagram every contract and offchain party between a user's ETH and the LRT on an L2, and write the worst plausible loss scenario for each layer.",
    quiz: [
      ["What's the difference between stETH and wstETH?", ["stETH rebases its balance; wstETH holds a growing exchange rate", "wstETH is a different chain", "stETH is not staked", "wstETH has no yield"], "Wrapping turns rebases into price appreciation, which is friendlier to DeFi."],
      ["What extra risk does restaking add?", ["Slashing by additional services (AVSs)", "Lower gas fees", "No withdrawal rights ever", "Forced KYC"], "You secure more services and can be slashed by them."],
      ["Why do LRTs depeg under stress?", ["Redemption goes through withdrawal queues, so secondary liquidity has to absorb sellers", "They are algorithmic", "Oracles stop", "They are pegged to USD"], "Slow exits mean the market price can fall below fair value."]
    ]
  },
  {
    id: "u14l2", t: "Pendle and onchain fixed income", min: 12,
    sum: "Splitting yield-bearing tokens into principal and yield: fixed rates, leveraged yield bets and points speculation.",
    body: `<p>Pendle splits a yield-bearing token (SY) into:</p>
<ul><li><b>PT (principal token)</b>: redeemable for 1 unit of the underlying at maturity. It trades at a discount, and that discount is the <b>fixed yield</b>.</li>
<li><b>YT (yield token)</b>: receives all yield (and points) until maturity. It's a leveraged bet on future yield and goes to zero at maturity.</li></ul>
<pre><code>PT + YT = 1 SY (before maturity)
implied APY = (1 / PT_price)^(365 / days_to_maturity) − 1
e.g. PT at 0.95 with 120 days left → (1/0.95)^(365/120) − 1 ≈ 16.9%</code></pre>
<p>Pendle's AMM is built for assets that converge: PT's price drifts toward 1 as maturity approaches, and the curve tightens over time.</p>
<h4>Why it matters</h4>
<ul><li><b>Fixed rates</b> for treasuries and risk-averse users.</li>
<li><b>Yield and points speculation</b> through YT. Points programs made YTs very popular.</li>
<li><b>PTs as collateral</b> in Morpho and Aave, which creates looped PT strategies (borrow against PT to buy more PT).</li>
<li>A huge share of Ethena's USDe supply sat in Pendle at times, so Pendle markets are a real-time view of the market's expected funding rates.</li></ul>`,
    keys: ["PT = discounted principal = fixed yield", "YT = leveraged floating yield + points", "Implied APY from PT price and time", "PTs as collateral make looped fixed-rate strategies possible"],
    src: [
      ["Pendle docs", "https://docs.pendle.finance/", "D", "SY, PT, YT and the AMM design."],
      ["Pendle core contracts", "https://github.com/pendle-finance/pendle-core-v2-public", "C", "Reference implementation."],
      ["Morpho docs", "https://docs.morpho.org/", "D", "PT collateral markets."]
    ],
    build: "Write a script that reads Pendle market data for sUSDe PTs across maturities and plots the implied yield curve. Compare it with the realized sUSDe yield over the same horizons and estimate the market's funding-rate expectations.",
    quiz: [
      ["PT trades at 0.98 with 365 days left. Implied fixed APY?", ["About 2.04%", "About 20%", "About 0.2%", "About 98%"], "(1/0.98) − 1 ≈ 2.04% for one year."],
      ["What happens to YT's value at maturity?", ["It goes to zero after paying out yield", "It becomes 1 SY", "It doubles", "It turns into PT"], "YT only carries yield until maturity."],
      ["Why are Pendle sUSDe PT prices informative?", ["They imply the market's expected Ethena yield, which is driven by perp funding", "They show gas prices", "They show the ETH price", "They are fixed by governance"], "Implied APY reflects expected future funding and staking yield."]
    ]
  },
  {
    id: "u14l3", t: "Vaults, looping and leverage", min: 11,
    sum: "Leverage loops, option-selling vaults and curated yield, and the November 2025 lesson about stacked yield collateral.",
    body: `<h4>Looping</h4>
<pre><code>deposit collateral C yielding y, borrow at rate b with loan-to-value λ, re-deposit, repeat
max leverage ≈ 1 / (1 − λ)
net APY ≈ y + (y − b) × (leverage − 1)
λ = 0.9 → up to 10x;  y = 12%, b = 9% → net ≈ 12% + 3% × 9 = 39%
if b rises above y, the loop bleeds; if C depegs 5% at 10x, equity −50%</code></pre>
<p>Loops are profitable only while <b>y > b</b> and the collateral holds its peg. Both break in exactly the stress events where everyone tries to unwind at once.</p>
<h4>Option-selling vaults</h4>
<p>DeFi option vaults (2021–22 style) sell covered calls or puts to market makers each week. The premium looks like yield, but you are <b>short volatility</b>: small steady gains, rare large losses.</p>
<h4>Curated yield and the 2025 blowups</h4>
<p>In November 2025, losses disclosed by Stream Finance (about $93M) depegged its xUSD. Vaults and stablecoins that had accepted it or looped it took losses (Elixir's deUSD among them). It was opaque yield collateral, hard-coded oracles and recursive leverage between protocols. The lesson for builders: <b>know the collateral of your collateral</b>, and refuse any you can't audit.</p>`,
    keys: ["Net APY ≈ y + (y − b)(L − 1); max L ≈ 1/(1 − λ)", "Loops die when borrow > yield or collateral depegs", "Option vaults are short volatility", "Know the collateral of your collateral"],
    src: [
      ["Morpho docs", "https://docs.morpho.org/", "D", "Vault curation and risk parameters."],
      ["DefiLlama Yields", "https://defillama.com/yields", "T", "Compare loop yields with borrow costs."],
      ["LlamaRisk", "https://llamarisk.com/", "D", "Collateral risk assessments."]
    ],
    build: "Write a loop simulator: inputs y(t), b(t), λ, collateral price path. Output equity over time and liquidation events. Replay a scenario where borrow rates spike to 30% for 3 days and the collateral depegs 3%.",
    quiz: [
      ["Max leverage with an LTV of 0.8?", ["5x", "8x", "1.25x", "10x"], "1/(1 − 0.8) = 5."],
      ["When does a yield loop lose money?", ["When the borrow rate exceeds the collateral's yield", "When gas is cheap", "When the token price is stable", "Never"], "The spread (y − b) becomes negative and is multiplied by leverage."],
      ["What exposure does an option-selling vault have?", ["Short volatility: steady premiums, rare large losses", "Long volatility", "Zero risk", "Only funding risk"], "Selling options collects premium in exchange for tail risk."]
    ]
  },
  {
    id: "u14l4", t: "Prediction markets", min: 13,
    sum: "Conditional tokens, LMSR market makers, oracle resolution, and the 2026 Kalshi–Polymarket boom moving into perps.",
    body: `<p>A binary prediction market issues <b>YES and NO tokens</b> that together are always redeemable for $1 of collateral (conditional tokens). Prices are probabilities.</p>
<h4>Market making</h4>
<ul><li><b>Order books</b>: Polymarket uses a hybrid design with offchain matching and onchain settlement.</li>
<li><b>Automated market makers</b>: Hanson's <b>LMSR</b> cost function always quotes a price, with bounded loss for the market maker.</li></ul>
<pre><code>C(q) = b · ln( Σ_i e^(q_i / b) )        price_i = e^(q_i/b) / Σ_j e^(q_j/b)
cost of a trade = C(q_after) − C(q_before)
max market-maker loss = b · ln(n)        (n outcomes; b = liquidity parameter)</code></pre>
<h4>Resolution is the hard part</h4>
<p>Who decides the outcome? Optimistic oracles (UMA for Polymarket) let anyone propose an answer with a bond, and disputes escalate to token-holder votes. Ambiguous market wording has caused high-profile disputes. Write resolution criteria like a contract.</p>
<h4>2026</h4>
<p>Prediction markets surged. Reported monthly industry volume hit records in early 2026, and Kalshi overtook Polymarket in April 2026, driven mostly by sports contracts. Both reportedly moved into <b>crypto perpetuals</b> around April 2026, and perp DEXs added event-style markets. Prediction markets, perps and sports betting are converging into one "trade anything" category. Regulation (CFTC versus state gaming law) is the main open fight.</p>`,
    keys: ["YES + NO = $1; price = probability", "LMSR: bounded loss b·ln(n)", "Resolution oracles and precise wording are critical", "2026: Kalshi > Polymarket by volume; both into perps"],
    src: [
      ["Hanson, Logarithmic Market Scoring Rules", "https://mason.gmu.edu/~rhanson/mktscore.pdf", "P", "The LMSR paper."],
      ["Polymarket docs", "https://docs.polymarket.com/", "D", "CTF tokens, CLOB and resolution."],
      ["The Block: Kalshi surges past Polymarket", "https://www.theblock.co/post/371287/kalshi-surges-past-polymarket-in-volume-grabs-global-dominance", "N", "Sept 2025: Kalshi first passes Polymarket in volume. Background for the 2026 race."]
    ],
    build: "Implement an LMSR market maker in Solidity with fixed-point exp/ln (e.g. PRBMath): create a 3-outcome market, buy and sell, and resolve via a mock optimistic oracle with a dispute window. Fuzz-test that market-maker loss never exceeds b·ln(3).",
    quiz: [
      ["In a binary market, YES trades at $0.62. What's the implied probability of YES?", ["62%", "38%", "50%", "100%"], "Since YES + NO = $1, the price is the probability."],
      ["What is the maximum loss for an LMSR market maker with liquidity b and n outcomes?", ["b · ln(n)", "b × n", "Unbounded", "Zero"], "LMSR's loss is bounded by b·ln(n)."],
      ["What's the most common source of prediction-market disputes?", ["Ambiguous resolution criteria", "Gas fees", "Slow block times", "Token decimals"], "Unclear wording leads to contested outcomes."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u15", t: "Security and risk", tag: "Risk",
  d: "Vulnerability classes, operational security against state-level attackers, the audit-to-monitoring pipeline, and economic risk management.",
  lessons: [
  {
    id: "u15l1", t: "Vulnerability classes, with 2025–26 examples", min: 14,
    sum: "The bugs that keep draining protocols, and the test that would have caught each.",
    body: `<div class="tbl"><table><thead><tr><th>Class</th><th>Recent example</th><th>Defense</th></tr></thead><tbody>
<tr><td>Rounding and precision</td><td>Balancer v2 composable stable pools (Nov 2025, about $100M+): rounding exploited across batched swaps</td><td>Round in the protocol's favor; high-iteration invariant fuzzing with tiny amounts</td></tr>
<tr><td>Integer overflow in legacy code</td><td>Truebit (Jan 2026, about $26M): a contract live for about 5 years</td><td>Re-audit old pre-0.8 code; checked math</td></tr>
<tr><td>Minting and logic flaws</td><td>Resolv (2026, about $25M): flawed minting path</td><td>Invariants on supply vs backing</td></tr>
<tr><td>Arbitrary call plus approvals</td><td>SwapNet (Jan 2026, about $13M)</td><td>Never forward user-controlled calldata; scoped approvals</td></tr>
<tr><td>Oracle manipulation</td><td>Mango (2022) and many smaller cases</td><td>Robust oracles, liquidity caps</td></tr>
<tr><td>Signature replay and verification</td><td>Wormhole (2022); reported cross-chain replay incidents in 2026</td><td>Domain separation, nonces, consumed maps</td></tr>
<tr><td>Reentrancy (incl. read-only)</td><td>Curve/Vyper compiler bug (Jul 2023)</td><td>Checks-effects-interactions; guards on view functions that others rely on</td></tr>
<tr><td>Initialization and upgrades</td><td>Nomad (2022)</td><td>Upgrade simulations; initializer tests</td></tr>
</tbody></table></div>
<p>Practice: reproduce one real exploit per week from DeFiHackLabs, and search Solodit for every pattern your protocol uses before you write it.</p>`,
    keys: ["Rounding bugs compound in batches (Balancer 2025)", "Old code still holds money (Truebit 2026)", "Never forward arbitrary calldata", "Reproduce real exploits weekly"],
    src: [
      ["DeFiHackLabs", "https://github.com/SunWeb3Sec/DeFiHackLabs", "C", "Foundry reproductions of real exploits."],
      ["Solodit", "https://solodit.cyfrin.io/", "T", "Searchable database of audit findings."],
      ["rekt.news", "https://rekt.news/", "R", "Post-mortems of every major hack."],
      ["Ethernaut", "https://ethernaut.openzeppelin.com/", "K", "Hands-on vulnerability wargame."],
      ["Course wargame: break the course contracts", "https://github.com/argenestel/basis-points-academy/tree/main/labs/evm/src/ctf", "C", "Five broken contracts (oracle, vault, reentrancy, governance, replay) as failing Foundry tests to solve."]
    ],
    build: "Reproduce 4 exploits from DeFiHackLabs covering 4 different classes in the table. For each, add the invariant test that would have failed before the attack.",
    quiz: [
      ["What made the 2025 Balancer exploit possible?", ["Precision and rounding errors amplified across many batched swaps", "A leaked admin key", "A bridge DVN", "A 51% attack"], "Tiny rounding errors repeated many times added up to large losses."],
      ["What's the core defense against arbitrary-call bugs in routers and aggregators?", ["Never execute user-supplied calldata against arbitrary targets while holding approvals", "Higher gas limits", "Using BLS signatures", "Pausing on weekends"], "Arbitrary calls let attackers spend approvals other users granted."],
      ["Why re-audit contracts that have been live for years?", ["Old code can hide bugs (e.g. pre-0.8 overflow) that new attackers find", "Old code becomes illegal", "Gas costs change", "Audits expire automatically"], "Truebit's 2026 loss came from a contract live for about 5 years."]
    ]
  },
  {
    id: "u15l2", t: "Opsec against state-level attackers", min: 12,
    sum: "DPRK-linked groups were reportedly behind Bybit, Drift and KelpDAO. Here is how they get in, and how to stop them.",
    body: `<p>Investigators attributed the largest losses of 2025–26 (Bybit about $1.5B, Drift about $285M, KelpDAO about $292M) to <b>North Korea-linked groups</b> (Lazarus, TraderTraitor, UNC4899). Their methods target <b>people and infrastructure</b>, not just code:</p>
<ul><li>Fake recruiters and job interviews that deliver malware to developers.</li>
<li>Malicious packages and dependencies, and compromised CI.</li>
<li>Long-term social engineering of team members with admin rights (Drift, per reports).</li>
<li>Compromised signing UIs (Bybit's Safe front end).</li>
<li>Infrastructure manipulation: poisoned RPC nodes plus DDoS of clean nodes, so a verifier signs forged data (KelpDAO, per LayerZero's report).</li></ul>
<h4>Controls</h4>
<ol><li><b>Signing hygiene</b>: hardware wallets, decode and verify calldata independently, simulate before signing, and use separate devices for signing.</li>
<li><b>Least privilege</b>: split roles, and add timelocks and rate limits so one compromised key can't drain everything.</li>
<li><b>Independent infrastructure</b> for verifiers and oracles: multiple RPC providers plus your own node, with cross-checking.</li>
<li><b>Hiring and dev security</b>: sandboxed take-home tests, no running unknown code on work machines, dependency pinning.</li>
<li><b>Monitoring and response</b>: anomaly alerts, a pause guardian, a pre-written incident runbook, and relationships with security firms and exchanges for freezing funds.</li></ol>`,
    keys: ["The biggest 2025–26 losses were opsec, not math", "Attackers target people, UIs and infrastructure", "Least privilege + timelocks + rate limits", "Independent infrastructure for anything that signs"],
    src: [
      ["Safe docs", "https://docs.safe.global/", "D", "Multisig setup and transaction verification."],
      ["CoinDesk: Kelp vs LayerZero post-mortem", "https://www.coindesk.com/tech/2026/04/20/kelp-dao-claims-layerzero-s-default-settings-are-what-actually-caused-the-usd290-million-disaster", "N", "RPC poisoning and verifier configuration."],
      ["Trail of Bits: Building Secure Contracts", "https://secure-contracts.com/", "K", "Development and operational security guidelines."]
    ],
    build: "Write your team's signing runbook: devices, how calldata is decoded and verified (write the script), who must co-sign what, timelock durations per action, and the first 30 minutes of incident response.",
    quiz: [
      ["What was common to the Bybit, Drift and KelpDAO incidents?", ["Attacks on people, interfaces or infrastructure rather than pure contract math", "All were Uniswap bugs", "All were 51% attacks", "All were rounding errors"], "Signers, admins and verifier infrastructure were the weak points."],
      ["How do you defend a verifier against RPC poisoning?", ["Use multiple independent RPC providers and your own node, and cross-check results", "Use one fast RPC", "Increase gas", "Disable logging"], "Independent data sources make forged views detectable."],
      ["Why combine timelocks with rate limits?", ["Even a compromised key can only move limited value before humans react", "To lower fees", "To speed up upgrades", "Because ERC-20 requires it"], "Damage is bounded in both size and time."]
    ]
  },
  {
    id: "u15l3", t: "From spec to monitoring: the security pipeline", min: 11,
    sum: "Specs, invariants, formal methods, audits, contests, bounties, guarded launch and real-time response.",
    body: `<ol><li><b>Spec and threat model</b>: write the invariants and trust assumptions first.</li>
<li><b>Internal review and tests</b>: unit, fuzz, invariant and fork tests. Coverage of failure paths, not just happy paths.</li>
<li><b>Formal methods</b>: symbolic execution or model checking for critical math and invariants (Halmos, Certora, Kontrol).</li>
<li><b>Audits</b>: at least two independent firms for anything holding serious value. Fix, then re-review.</li>
<li><b>Audit contests</b> (Code4rena, Sherlock, Cantina): many eyes, paid per finding.</li>
<li><b>Bug bounty</b> (Immunefi): a standing reward sized to the funds at risk (often 10% of potential loss, capped).</li>
<li><b>Guarded launch</b>: deposit caps, an allowlist, limited markets. Raise caps gradually.</li>
<li><b>Monitoring</b>: real-time detection of anomalous flows, invariant breaks and oracle deviations, with an <b>automatic pause</b> on critical signals.</li>
<li><b>Incident response</b>: a war room, pause, communication, coordination with exchanges and security teams, and a post-mortem.</li></ol>
<p>Audits are a snapshot. Security is the whole loop, repeated on every upgrade.</p>`,
    keys: ["Invariants first, then tests, then formal methods", "Two-plus audits, contests, and a standing bounty", "Guarded launch with caps", "Real-time monitoring with automatic pause"],
    src: [
      ["Immunefi", "https://immunefi.com/", "T", "Bug bounty platform."],
      ["Solodit", "https://solodit.cyfrin.io/", "T", "Learn from thousands of past audit findings."],
      ["Foundry", "https://www.getfoundry.sh/", "D", "Invariant testing."],
      ["Trail of Bits: Building Secure Contracts", "https://secure-contracts.com/", "K", "Testing and audit preparation guides."]
    ],
    build: "Write the security plan for your capstone: invariants list, test types, audit budget, bounty size, launch caps and the schedule for raising them, and three monitoring alerts with automatic-pause thresholds.",
    quiz: [
      ["Why launch with deposit caps?", ["To limit losses while the code meets real-world conditions", "To reduce gas", "To increase APY", "Because audits require it"], "Caps bound the damage from undiscovered bugs."],
      ["What does a bug bounty add beyond audits?", ["A continuous incentive for whitehats to report bugs instead of exploiting them", "A guarantee of no bugs", "Regulatory approval", "Faster blocks"], "Bounties make disclosure more rewarding than exploitation."],
      ["What should monitoring be able to do automatically?", ["Pause critical functions when invariants or oracles break", "Change token prices", "Mint new tokens", "Upgrade contracts instantly"], "Speed of response decides the size of the loss."]
    ]
  },
  {
    id: "u15l4", t: "Economic risk management", min: 12,
    sum: "Setting LTVs, caps and margins from volatility and liquidity, and stress-testing for October 10-style days.",
    body: `<p>Smart-contract security keeps the code honest. <b>Economic security</b> keeps the protocol solvent when markets move.</p>
<pre><code>liquidation buffer (LT − LTV, or maintenance margin) should cover:
   price move during liquidation delay   ≈ z · σ · sqrt(Δt)
 + slippage to sell the collateral size   ≈ f(size / depth)
 + oracle error / lag
supply or OI cap ≤ what can be liquidated within Δt at acceptable slippage</code></pre>
<h4>Practices</h4>
<ul><li><b>Parameter derivation</b> from volatility (use stressed σ, not average) and on-chain depth at ±2% and ±5%.</li>
<li><b>Correlation</b>: LST/ETH or stablecoin pairs look safe until a depeg. Model the depeg.</li>
<li><b>Concentration limits</b>: whale positions get special treatment.</li>
<li><b>Stress tests</b>: replay the worst days (Black Thursday, Terra, FTX, Oct 10, 2025) and synthetic −40% gaps with liquidity drying up.</li>
<li><b>Risk providers</b>: firms like Chaos Labs, LlamaRisk and Gauntlet publish parameter recommendations in governance forums. Read them to learn the craft.</li></ul>
<p>Rule: <b>caps follow liquidity, not demand</b>. Demand for leverage is highest exactly when it's most dangerous.</p>`,
    keys: ["Buffer ≥ price move during liquidation + slippage + oracle error", "Caps must follow liquidatable depth", "Model depegs and correlation", "Stress test with historical worst days"],
    src: [
      ["Chaos Labs", "https://chaoslabs.xyz/", "D", "Risk research and parameter recommendations."],
      ["Gauntlet", "https://www.gauntlet.xyz/", "D", "Simulation-based risk management."],
      ["LlamaRisk", "https://llamarisk.com/", "D", "Collateral assessments."],
      ["Aave governance forum", "https://governance.aave.com/", "D", "Real parameter-change proposals with full analysis."]
    ],
    build: "For three collateral assets, compute 30-day stressed σ, on-chain depth at ±5%, and derive LTV, LT and supply cap with the formula above. Compare your numbers with Aave's actual parameters and explain the differences.",
    quiz: [
      ["What should determine a collateral's supply cap?", ["How much can be liquidated quickly at acceptable slippage", "How much users want to deposit", "The token's market cap alone", "The team's preference"], "Caps protect solvency by matching liquidation capacity."],
      ["Why use stressed volatility rather than average volatility for margins?", ["Liquidations happen in stressed markets", "Average volatility is unknown", "Stressed σ is smaller", "Regulators require it"], "Parameters must hold on the bad days."],
      ["Why are 'correlated' pairs like stETH/ETH risky as collateral?", ["A depeg breaks the correlation exactly when leverage is highest", "They have no oracle", "They can't be liquidated", "They pay no yield"], "Correlation assumptions fail in stress."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u16", t: "Data, metrics and simulation", tag: "Data",
  d: "Read the chain directly, measure what matters, and simulate before you ship.",
  lessons: [
  {
    id: "u16l1", t: "Reading the chain", min: 11,
    sum: "RPC, logs and traces, indexers, bulk extraction and SQL: pick the right tool for each job.",
    body: `<ul><li><b>JSON-RPC</b>: eth_call (read state), eth_getLogs (events), debug_traceTransaction (internal calls). An archive node is needed for historical state.</li>
<li><b>Events vs traces</b>: events are cheap and structured, but only what the contract chose to emit. Traces show every internal call, which is how you reconstruct MEV and exploits.</li>
<li><b>Indexers for products</b>: Ponder (TypeScript, local-first), Envio (fast multichain), The Graph (subgraphs).</li>
<li><b>Bulk research</b>: cryo extracts blocks, transactions, logs and traces to Parquet. Query it with DuckDB or Polars.</li>
<li><b>Hosted SQL</b>: Dune, Allium, Flipside.</li>
<li><b>Non-EVM</b>: Hyperliquid's info API and websocket (order books, trades, funding, vaults). Solana via Geyser plugins or RPC providers.</li></ul>
<pre><code># cryo + duckdb: daily Uniswap v3 swap count for a pool
cryo logs --blocks 20000000:20100000 --contract 0x88e6...5640 --event-signature "Swap(address,address,int256,int256,uint160,uint128,int24)"
duckdb -c "select date_trunc('day', to_timestamp(block_timestamp)) d, count(*) from 'logs*.parquet' group by d order by d"</code></pre>`,
    keys: ["eth_getLogs for events; traces for internal calls", "Ponder, Envio or The Graph for product backends", "cryo + DuckDB for research", "Dune or Allium for quick SQL"],
    src: [
      ["cryo", "https://github.com/paradigmxyz/cryo", "C", "Bulk chain data extraction to Parquet."],
      ["Ponder", "https://ponder.sh/", "D", "TypeScript indexing framework."],
      ["Envio docs", "https://docs.envio.dev/", "D", "High-performance multichain indexer."],
      ["The Graph docs", "https://thegraph.com/docs/en/", "D", "Subgraphs."],
      ["Dune", "https://dune.com/", "T", "Hosted SQL over decoded chain data."],
      ["Allium", "https://www.allium.so/", "T", "Enterprise chain data and research."],
      ["DefiLlama API docs", "https://api-docs.defillama.com/", "D", "Free API for TVL, fees, volumes, yields and perps data."]
    ],
    build: "Index every swap of one Uniswap v3 pool for 30 days with Ponder into Postgres, and separately with cryo + DuckDB. Compare the developer time, run time and query flexibility.",
    quiz: [
      ["What can traces show that events can't?", ["Every internal call, including ones that emit no events", "Gas price", "Block number", "Token names"], "Internal value flows only appear in traces."],
      ["Which tool suits bulk historical research into Parquet files?", ["cryo", "A browser wallet", "Etherscan's UI", "A block explorer screenshot"], "cryo extracts large ranges efficiently."],
      ["What do you need to query a contract's state at a past block?", ["An archive node (or a provider with archive access)", "A light client", "A hardware wallet", "Nothing special"], "Full nodes prune historical state. Archive nodes keep it."]
    ]
  },
  {
    id: "u16l2", t: "Metrics that matter", min: 10,
    sum: "TVL, volume, fees, revenue, earnings and retention: which numbers are real and which can be faked.",
    body: `<div class="tbl"><table><thead><tr><th>Metric</th><th>What it measures</th><th>How it lies</th></tr></thead><tbody>
<tr><td>TVL</td><td>Assets deposited</td><td>Moves with token prices; double counting via LSTs and loops</td></tr>
<tr><td>Volume</td><td>Trading activity</td><td>Wash trading; incentive farming (DefiLlama delisted Aster's volume in 2025)</td></tr>
<tr><td>Fees</td><td>What users pay in total</td><td>Includes LP and supply-side shares</td></tr>
<tr><td>Revenue</td><td>What the protocol keeps</td><td>Can be inflated by one-offs</td></tr>
<tr><td>Earnings</td><td>Revenue − token incentives</td><td>Often negative. The honest number</td></tr>
<tr><td>Open interest</td><td>Margin-backed positions</td><td>Harder to fake</td></tr>
<tr><td>Retention</td><td>Users or capital that stay</td><td>Rarely reported. Compute it yourself</td></tr>
</tbody></table></div>
<pre><code>take rate = protocol revenue / volume              (e.g. bps per $ traded)
capital efficiency = volume / TVL (or fees / TVL)
volume/OI ratio far above peers → suspect washing</code></pre>`,
    keys: ["Earnings = revenue − incentives", "Prefer OI, fees and retention over volume and TVL", "Take rate and capital efficiency compare venues", "Odd volume/OI ratios flag washing"],
    src: [
      ["Token Terminal", "https://tokenterminal.com/", "T", "Fees, revenue and earnings by protocol."],
      ["DefiLlama", "https://defillama.com/", "T", "TVL, fees and volume with methodology notes."],
      ["Artemis", "https://www.artemis.ai/", "T", "Fundamental crypto data."]
    ],
    build: "Pick 5 DEXs or perp venues. Pull fees, revenue, incentives, volume and TVL for 6 months, compute earnings, take rate and fees/TVL, and rank them. Write which ones are actually profitable.",
    quiz: [
      ["What does 'earnings' subtract from revenue?", ["Token incentives paid out", "Gas", "Taxes", "Oracle fees"], "Revenue that costs more in emissions isn't profit."],
      ["Why is TVL a weak measure of success?", ["It moves with token prices and can be double-counted", "It's always zero", "It can't be measured", "It equals revenue"], "TVL isn't income, and it often isn't sticky."],
      ["A venue's volume/OI is 10x its peers'. What does that suggest?", ["Possible wash trading or incentive farming", "Excellent liquidity", "Lower fees", "Better oracles"], "Real traders don't churn positions that much more than everyone else."]
    ]
  },
  {
    id: "u16l3", t: "Simulation and backtesting", min: 12,
    sum: "Agent-based models, Monte Carlo price paths, historical replay and fork simulations, plus the traps to avoid.",
    body: `<ul><li><b>Monte Carlo price paths</b>: geometric Brownian motion plus jumps (crypto has fat tails). Use them to test liquidation thresholds and LP strategies across thousands of scenarios.</li>
<li><b>Historical replay</b>: feed real trades and order books (Oct 10, 2025, for instance) into your margin engine or AMM. Real data has the microstructure that models miss.</li>
<li><b>Agent-based models</b>: simulate traders, LPs, arbitrageurs and liquidators with simple strategies, so system behavior emerges from their interaction. cadCAD and plain Python both work.</li>
<li><b>Fork simulations</b>: run your contracts against real mainnet state on anvil, to catch integration effects.</li></ul>
<h4>Traps</h4>
<ul><li><b>Look-ahead bias</b>: using information that wasn't available yet.</li>
<li><b>Infinite liquidity</b>: assuming you can trade any size at mid.</li>
<li><b>Ignoring reflexivity</b>: your protocol's own liquidations move the price.</li>
<li><b>Overfitting</b> parameters to one period.</li></ul>
<pre><code># GBM with jumps, per step dt
dS/S = μ dt + σ dW + J dN,   N ~ Poisson(λ dt),  J ~ Normal(μ_J, σ_J)</code></pre>`,
    keys: ["Monte Carlo with jumps for tail risk", "Replay real crash days", "Agent-based sims for emergent behavior", "Avoid look-ahead, infinite liquidity and overfitting"],
    src: [
      ["cadCAD", "https://cadcad.org/", "K", "Complex adaptive dynamics simulation framework."],
      ["Foundry (anvil)", "https://www.getfoundry.sh/", "D", "Fork simulations."],
      ["Hyperliquid API docs", "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api", "D", "Historical data for replay."],
      ["arXiv: trading and market microstructure (q-fin.TR)", "https://arxiv.org/list/q-fin.TR/recent", "P", "New papers on AMMs, MEV, perps and market making as they appear."]
    ],
    build: "Build an agent-based sim of your capstone protocol with 4 agent types (traders, LPs, arbs, liquidators). Run 1,000 Monte Carlo paths with jumps and report the probability of bad debt for 3 parameter sets.",
    quiz: [
      ["Why add jumps to a GBM price model for crypto?", ["Crypto returns have fat tails and sudden gaps", "GBM can't go up", "Jumps lower volatility", "To simplify the math"], "Jumps capture crash-style moves."],
      ["What is look-ahead bias?", ["Using information in a backtest that wasn't available at that time", "Looking at too much data", "Using future block numbers on purpose", "Ignoring gas"], "It makes backtests look far better than reality."],
      ["Why are agent-based models useful for protocol design?", ["System-level behavior emerges from interacting strategies you can vary", "They replace audits", "They're required by law", "They predict prices exactly"], "Feedback loops between agents show up in the simulation."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u17", t: "Capstone: design and launch your protocol", tag: "Capstone",
  d: "Pull it all together: a design canvas, a track with milestones, and a launch checklist.",
  lessons: [
  {
    id: "u17l1", t: "The protocol design canvas", min: 12,
    sum: "Ten questions every protocol must answer in writing before a line of production code.",
    body: `<ol>
<li><b>User and job</b>: who uses it, and what do they get that they can't get elsewhere?</li>
<li><b>Counterparty</b>: who is on the other side of every trade or loan, and why would they be?</li>
<li><b>Price source</b>: where does each price come from, and what does it cost to manipulate?</li>
<li><b>Risk engine</b>: margins, LTVs, caps. How are they derived from volatility and liquidity?</li>
<li><b>Loss waterfall</b>: who absorbs losses, in what order, up to what limits?</li>
<li><b>Liquidity plan</b>: day-one liquidity, and how it sticks without permanent subsidies.</li>
<li><b>Value accrual</b>: how the protocol earns, where the money goes, and whether a token is needed at all.</li>
<li><b>Trust assumptions</b>: keys, upgrades, oracles, bridges, sequencer, chain. Each one with its cost-of-attack.</li>
<li><b>Failure modes</b>: the top 10 ways it dies (cascade, depeg, exploit, admin compromise, regulation) and the mitigation for each.</li>
<li><b>Legal and jurisdiction</b>: who can use it, what entity runs it, what it is legally.</li></ol>
<p>Write it as a 4–6 page design doc. If any answer is "we'll figure it out later", that's the part that will break.</p>`,
    keys: ["Write the canvas before production code", "Name the counterparty and the price source", "Define the loss waterfall and liquidity plan", "List failure modes with costs of attack"],
    src: [
      ["Paradigm research", "https://www.paradigm.xyz/writing", "P", "Examples of rigorous mechanism write-ups."],
      ["a16z crypto research", "https://a16zcrypto.com/posts/", "P", "Design and economics essays."],
      ["ethresear.ch", "https://ethresear.ch/", "P", "How researchers write and critique designs in public."]
    ],
    build: "Write your protocol's design canvas (all 10 sections). Then ask the tutor below to attack it: paste each section and ask 'what breaks this?'",
    quiz: [
      ["Why must you name the counterparty explicitly?", ["Every trade or loan has someone on the other side whose incentives decide whether it works", "For marketing", "Because ERC-20 requires it", "For gas optimization"], "Unclear counterparties hide who is really bearing the risk."],
      ["What does the 'loss waterfall' define?", ["Who absorbs losses, in what order and up to what limits", "The token unlock schedule", "Block ordering", "The UI layout"], "It's the solvency plan for bad days."],
      ["Which answer on the canvas is a red flag?", ["'We'll figure out the oracle later'", "'Prices come from a robust median of 5 deep venues'", "'Caps follow liquidatable depth'", "'Upgrades are timelocked for 7 days'"], "Deferred core design is where failures happen."]
    ]
  },
  {
    id: "u17l2", t: "Choose your track", min: 10,
    sum: "Six capstone tracks, each with a milestone path that uses earlier units.",
    body: `<div class="tbl"><table><thead><tr><th>Track</th><th>Milestones</th><th>Units used</th></tr></thead><tbody>
<tr><td><b>A. Perp DEX</b></td><td>Margin engine sim → order book on your chain (Unit 3) or a HIP-3-style market spec → oracle and mark → liquidations, backstop vault and ADL → MM program</td><td>1, 3, 9, 11, 13, 15</td></tr>
<tr><td><b>B. Isolated lending market</b></td><td>Morpho-style core → IRM → oracle adapter → liquidation bot → curator vault → caps from depth</td><td>5, 7, 15</td></tr>
<tr><td><b>C. LVR-aware AMM (v4 hook)</b></td><td>Dynamic-fee or auction hook → backtest vs fixed fees → MEV-tax variant on an L2 → LP dashboard</td><td>6, 11, 16</td></tr>
<tr><td><b>D. Intent bridge or solver</b></td><td>ERC-7683 orders → relayer with inventory → settlement and verification → rate limits and watchers</td><td>6, 12</td></tr>
<tr><td><b>E. CDP stablecoin</b></td><td>Vaults and stability pool → redemptions → oracle → peg arbitrage bot → depeg stress tests</td><td>7, 8, 15</td></tr>
<tr><td><b>F. Equity-perp or RWA venue</b></td><td>Session-aware mark → off-hours margins → compliance hooks → gap-risk sims</td><td>9, 10</td></tr>
</tbody></table></div>
<p>Pick one track. The Builds tab has detailed checklists for the pieces, and your progress there is saved.</p>`,
    keys: ["Pick one track and go deep", "Each milestone reuses earlier units", "Ship runnable code at every step", "Track progress in the Builds tab"],
    src: [
      ["Hyperliquid docs", "https://hyperliquid.gitbook.io/hyperliquid-docs", "D", "Track A reference."],
      ["Morpho Blue", "https://github.com/morpho-org/morpho-blue", "C", "Track B reference."],
      ["Uniswap v4 template", "https://github.com/Uniswap/v4-template", "C", "Track C starting point."],
      ["ERC-7683", "https://eips.ethereum.org/EIPS/eip-7683", "D", "Track D standard."],
      ["Liquity docs", "https://docs.liquity.org/", "D", "Track E reference."]
    ],
    build: "Choose your track and write a 12-week plan with one demoable milestone every two weeks. Put it in your repo's README.",
    quiz: [
      ["Which track mainly builds on Units 6 and 11?", ["C: an LVR-aware AMM hook", "E: a CDP stablecoin", "B: a lending market", "F: an RWA venue"], "AMM design plus MEV capture."],
      ["What must every milestone produce?", ["Runnable, tested code you can demo", "A tweet", "A token", "A whitepaper only"], "Working code builds understanding and credibility."],
      ["For an equity-perp venue (Track F), what's the signature problem?", ["Pricing and margining when the underlying market is closed", "Gas costs", "NFT royalties", "Validator rewards"], "Session-aware design is the core challenge."]
    ]
  },
  {
    id: "u17l3", t: "Launch checklist", min: 9,
    sum: "Everything between 'it works on my fork' and 'it holds other people's money'.",
    body: `<h4>Before mainnet</h4>
<ul class="check">
<li>Design canvas reviewed by someone hostile to the idea.</li>
<li>Invariant and fork tests green. Formal checks on the core math.</li>
<li>Two independent audits, findings fixed and re-reviewed, then a contest.</li>
<li>Bug bounty live, sized to the value at risk.</li>
<li>Admin: multisig with independent signers, timelocks, role separation, written signing runbook.</li>
<li>Oracles: primary plus fallback, staleness and deviation guards, cost-of-attack documented.</li>
<li>Monitoring and automatic pause wired up, with a tested incident runbook.</li>
<li>Guarded launch: caps, a limited asset list, a schedule for raising caps.</li>
<li>Liquidity plan: market makers or a protocol vault, incentive budget and retention metrics.</li>
<li>Legal review of the entity, the jurisdictions served, the token (if any) and the interface.</li>
<li>Docs: risks disclosed plainly, contract addresses, audits, parameters.</li></ul>
<h4>After launch</h4>
<ul class="check">
<li>Weekly risk review of parameters against volatility and liquidity.</li>
<li>Public dashboards (fees, revenue, OI or TVL, bad debt).</li>
<li>Progressive decentralization: reduce admin powers as confidence grows.</li>
<li>Post-mortems for every incident, including near misses.</li></ul>`,
    keys: ["Audits + bounty + monitoring + pause", "Guarded launch with caps", "Liquidity plan and legal review before launch", "Reduce admin powers over time"],
    src: [
      ["Immunefi", "https://immunefi.com/", "T", "Bounties."],
      ["Safe docs", "https://docs.safe.global/", "D", "Multisig operations."],
      ["L2BEAT stages", "https://l2beat.com/stages", "T", "A model for progressive decentralization."]
    ],
    build: "Turn this checklist into a GitHub issue template in your capstone repo, and fill in an owner and a date for every item.",
    quiz: [
      ["What should a guarded launch include?", ["Caps and a limited asset list, raised on a schedule", "Unlimited deposits from day one", "No monitoring", "Anonymous admin keys"], "Limit exposure while the system proves itself."],
      ["Why publish risk disclosures plainly in the docs?", ["Users deserve to understand what can go wrong, and it builds trust", "It's required for gas", "It raises APY", "It hides bugs"], "Clear risks prevent surprise and reputational damage."],
      ["What does progressive decentralization mean?", ["Reducing admin powers over time as the system proves safe", "Launching on more chains", "Adding more tokens", "Removing audits"], "Start with guardrails, then remove trusted control."]
    ]
  }
  ]
});
