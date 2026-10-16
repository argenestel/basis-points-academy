window.BP_UNITS = [];
window.BP_UNITS.push({
  id: "u1", t: "Money, markets and mechanisms", tag: "Economics",
  d: "The economist's toolkit: balance sheets, runs, microstructure, derivatives, yield, liquidity spirals and auctions.",
  lessons: [
  {
    id: "u1l1", t: "Every protocol is a balance sheet", min: 10,
    sum: "Stablecoins, lending pools and LP positions are promises. Learn to read them the way a banker reads a balance sheet.",
    body: `<p>Before you design anything, get the banker's mental model. Almost every DeFi product is a <b>balance sheet making a promise</b>. A stablecoin promises redemption at $1. A lending pool promises you can withdraw. An LP position promises to trade at whatever price a formula says.</p>
<p>Perry Mehrling's <i>money view</i> describes finance as a hierarchy of promises. Central-bank money sits at the top, bank deposits below it, then money-market funds, then everything else. Each layer holds the layer above as reserves, and it trades at par only while people believe conversion will work.</p>
<p>Stablecoins slot straight into that hierarchy:</p>
<ul><li><b>USDC/USDT</b> work like narrow banks: token liabilities backed by T-bills, repo and bank deposits.</li>
<li><b>DAI/USDS and LUSD</b> are collateralized credit issuers: they lend against crypto collateral.</li>
<li><b>USDe</b> is a hedge-fund trade (long spot, short perps) packaged as a dollar.</li></ul>
<p>When confidence breaks, they suffer what banks suffer: a <b>run</b>. Diamond and Dybvig (1983) showed that even a solvent institution with illiquid assets can fail. If redemption is first-come-first-served, running is the rational move for every holder.</p>
<h4>Two distinctions you will use constantly</h4>
<ul><li><b>Par is a mechanism, not a fact.</b> It holds only because someone can arbitrage it (mint or redeem at $1) and wants to.</li>
<li><b>Solvency is not liquidity.</b> Solvent means assets exceed liabilities. Liquid means you can pay redemptions today. Many crypto failures began as liquidity failures and turned into solvency failures through fire sales.</li></ul>`,
    keys: ["Write every protocol as assets, liabilities and equity", "Stablecoins are private money sitting below bank money", "Runs happen when assets are illiquid and redemption is first-come-first-served", "Solvency and liquidity are different failure modes"],
    src: [
      ["Economics of Money and Banking (Perry Mehrling, free course)", "https://www.coursera.org/learn/money-banking", "K", "The money view: hierarchy of money, par, dealers. The best economics primer for stablecoin designers."],
      ["Diamond and Dybvig, Bank Runs, Deposit Insurance, and Liquidity (1983)", "https://www.jstor.org/stable/1837095", "P", "The canonical model of runs as a coordination failure."],
      ["Gorton and Zhang, Taming Wildcat Stablecoins", "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3888752", "P", "Compares stablecoins to 19th-century private banknotes and their discounts."],
      ["Lyons and Viswanath-Natraj, What Keeps Stablecoins Stable?", "https://www.nber.org/papers/w27136", "P", "Empirical work on arbitrage and peg deviations."]
    ],
    build: "In a spreadsheet, write a simple balance sheet for USDC, DAI and USDe. For each one, list the events that would make a holder receive less than $1, and who absorbs the loss first.",
    quiz: [
      ["In Diamond–Dybvig, why can a solvent bank still fail?", ["First-come-first-served redemption makes running rational when assets are illiquid", "Interest rates are too low to pay depositors", "Banks must keep 100% reserves", "Deposits are not recorded on a blockchain"], "If everyone expects others to run, the illiquid assets get fire-sold, so running first is individually rational even when the bank was solvent."],
      ["What keeps a fiat-backed stablecoin near $1 on secondary markets?", ["Arbitrageurs who can mint and redeem at par with the issuer", "An algorithm that changes supply every block", "A governance vote on the price", "A legal requirement for market makers to quote $1"], "Below $1, arbs buy and redeem. Above $1, they mint and sell. Par holds only while that loop works."],
      ["Which is a liquidity problem rather than a solvency problem?", ["A lender holding $120 of long-dated loans faces $100 of same-day withdrawals", "A lender's loans are worth $80 against $100 of deposits", "A stablecoin's reserves were stolen", "A protocol's token goes to zero"], "Assets exceed liabilities, so it is solvent, but it cannot pay withdrawals today without selling at a loss."]
    ]
  },
  {
    id: "u1l2", t: "Market microstructure: who you trade against", min: 12,
    sum: "Spreads, adverse selection and markouts. This is how market makers think, and it is why AMM LPs lose money to arbitrageurs.",
    body: `<p>Microstructure studies how trades actually happen. An <b>order book</b> holds resting limit orders: bids to buy and asks to sell. A taker crossing the spread pays the <b>half-spread</b> plus <b>price impact</b> as it walks the book.</p>
<p>The spread exists for three reasons:</p>
<ul><li><b>Inventory risk.</b> The market maker holds positions it did not choose.</li>
<li><b>Adverse selection.</b> Glosten–Milgrom (1985): some traders know more than you. You lose to them and recover it from uninformed flow through the spread.</li>
<li><b>Operating cost:</b> gas, infrastructure, capital.</li></ul>
<p>Kyle (1985) models an informed trader who splits orders so the information leaks into the price slowly. The price-impact coefficient <b>λ</b> measures how much each unit of flow moves the price.</p>
<h4>Markouts: the one metric to learn</h4>
<pre><code>markout(t) = side × (mid[t_fill + t] − fill_price) / fill_price
side = +1 if you bought, −1 if you sold
Positive markouts mean you traded well. Consistently negative markouts mean your fills are being picked off (toxic flow).</code></pre>
<p><b>In DeFi:</b> an AMM LP is a passive market maker that never updates its quotes, and the arbitrageurs are the informed traders. That is the intuition behind LVR (Unit 6). Onchain order books such as Hyperliquid's put cancels ahead of taker orders within each block, which protects makers. The venue's ordering rules are part of the product.</p>`,
    keys: ["Spread pays for inventory risk, adverse selection and costs", "Informed flow is toxic to makers", "Measure fill quality with markouts", "AMM LPs are market makers who never update their quotes"],
    src: [
      ["Glosten and Milgrom (1985), Bid, ask and transaction prices", "https://www.sciencedirect.com/science/article/pii/0304405X85900443", "P", "Spread as the price of adverse selection."],
      ["Kyle (1985), Continuous Auctions and Insider Trading", "https://www.jstor.org/stable/1913210", "P", "Kyle's lambda: price impact from informed order flow."],
      ["Budish, Cramton, Shim, The HFT Arms Race (Frequent Batch Auctions)", "https://academic.oup.com/qje/article/130/4/1547/1916146", "P", "Why continuous-time matching creates latency races. Batch auctions as the fix."],
      ["Hyperliquid API docs", "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api", "D", "Free L2 order-book and trade data for your own experiments."]
    ],
    build: "Pull Hyperliquid BTC order-book snapshots every second for one hour. Compute the spread in bps, the depth within ±10 bps of mid, and the 1-minute markouts of public trades split by aggressor side.",
    quiz: [
      ["In Glosten–Milgrom, what does the bid–ask spread mainly compensate the market maker for?", ["Losses to better-informed traders", "Gas fees", "Regulatory capital", "Exchange listing fees"], "The maker loses to informed flow and prices that expected loss into the spread charged to everyone."],
      ["Your fills show consistently negative 1-minute markouts. What does that mean?", ["Your fills are being adversely selected (toxic flow)", "You are earning the spread", "Latency does not matter for you", "Your inventory is perfectly hedged"], "Negative markouts mean the price moves against you right after you trade: someone knew more or was faster."],
      ["In AMM terms, who plays the 'informed trader'?", ["Arbitrageurs who trade the pool back to the external market price", "Liquidity providers", "Governance token holders", "Block explorers"], "Arbs only trade when the pool's price is stale relative to CEX prices, so they always profit at LPs' expense."]
    ]
  },
  {
    id: "u1l3", t: "Derivatives: futures, basis, options and leverage", min: 14,
    sum: "Cost of carry, basis trades, option convexity and margin. Perps, Ethena and LP positions are all built from these parts.",
    body: `<p>A <b>future</b> is an agreement to trade later at a price fixed now. No-arbitrage ties it to spot through the <b>cost of carry</b>:</p>
<pre><code>F = S · e^((r − q) · T)
r = funding cost of holding spot, q = yield the spot pays (staking, dividends)
basis = F − S   (positive = contango, negative = backwardation)</code></pre>
<p><b>Cash-and-carry:</b> if futures trade rich, buy spot and short the future, then collect the basis at expiry. A <b>perpetual</b> is a future that never expires, so there is no expiry to force convergence. It uses <b>funding payments</b> to pull its price toward spot instead (Unit 9). Ethena's USDe runs this carry trade at scale.</p>
<h4>Options and convexity</h4>
<p>A call pays max(S − K, 0). Black–Scholes prices it from volatility, which is why options traders say <i>volatility is the price</i>. The key idea for DeFi builders is that <b>an AMM LP position is short an option (short gamma)</b>. It sells winners and buys losers as the price moves, and it collects fees as the premium. Paradigm's <i>Everlasting Options</i> and <i>Power Perpetuals</i> show how funding can make any payoff perpetual.</p>
<h4>Leverage and margin</h4>
<pre><code>leverage = position notional / equity
equity   = collateral + unrealized PnL
liquidation when equity < maintenance margin × notional</code></pre>
<p>Everything in perps and lending comes back to that last line.</p>`,
    keys: ["F = S·e^((r−q)T): carry ties futures to spot", "Basis trades harvest the gap between futures and spot", "LPs are short convexity and paid in fees", "Leverage = notional / equity; liquidation is a margin threshold"],
    src: [
      ["Black and Scholes (1973), The Pricing of Options and Corporate Liabilities", "https://www.jstor.org/stable/1831029", "P", "The original option-pricing paper."],
      ["Paradigm, Everlasting Options", "https://www.paradigm.xyz/writing/everlasting-options", "P", "Perpetual options built from funding payments."],
      ["Paradigm, Power Perpetuals", "https://www.paradigm.xyz/writing/power-perpetuals", "P", "Perps on S² and other payoffs. The basis for Squeeth."],
      ["He, Manela, Ross, von Wachter, Fundamentals of Perpetual Futures", "https://arxiv.org/abs/2212.06888", "P", "No-arbitrage bounds for perps and evidence of large deviations."]
    ],
    build: "Write a Python function that prices a European call with Black–Scholes, then simulate a Uniswap v2 LP's value across prices and plot it next to a short straddle. Find the fee rate at which they break even at 60% volatility.",
    quiz: [
      ["Spot ETH is $3,000, the 1-year rate is 5% and ETH staking yields 3%. Roughly where should the 1-year future trade?", ["About $3,060", "About $3,150", "About $2,940", "Exactly $3,000"], "F ≈ 3000·e^(0.05−0.03) ≈ 3000·1.0202 ≈ $3,061."],
      ["Why is an AMM LP position described as short gamma?", ["It sells the asset as the price rises and buys as it falls, like a short option", "It always holds 100% stablecoins", "It gains from volatility without fees", "It only trades at expiry"], "The rebalancing goes against the move, so the payoff is concave and the LP needs fees to compensate."],
      ["What makes a perpetual future converge toward spot, given that it never expires?", ["Periodic funding payments between longs and shorts", "A final settlement date", "Governance setting the price daily", "The exchange buying the asset itself"], "Funding pays the side that pushes the perp back toward the index, which keeps the two prices tied."]
    ]
  },
  {
    id: "u1l4", t: "Where yield actually comes from", min: 9,
    sum: "If you can't name who pays, you are the yield. Decompose any APY into its real sources.",
    body: `<p>Every yield has a payer. Here are the legitimate sources, roughly from most to least sustainable:</p>
<ul><li><b>Borrowers</b> paying interest for leverage or to short (lending markets).</li>
<li><b>Traders</b> paying fees, spread or funding (AMM fees, perp funding, liquidation penalties).</li>
<li><b>Protocol issuance and block rewards</b>: staking yield is new issuance plus priority fees plus MEV.</li>
<li><b>Offchain cash flows</b> routed onchain: T-bill yield in tokenized funds and stablecoin reserves.</li>
<li><b>Token emissions</b>: subsidies paid in the protocol's own token. Emissions are marketing spend, not yield.</li></ul>
<h4>The decomposition habit</h4>
<pre><code>APY = base (fees/interest/funding) + rewards (emissions) + points (unpriced promise)
real yield ≈ base − expected losses (depeg, exploit, liquidation, slippage)</code></pre>
<p>Benchmark everything against the <b>risk-free rate</b>, the T-bill yield you can get through tokenized money-market funds. A 6% stablecoin vault while T-bills pay 4% is offering you 2% for every risk in its stack: smart contract, curator, oracle, bridge and counterparty.</p>
<p><b>Funding rates are the price of leverage in crypto.</b> When perps funding is high, longs are paying for exposure. That money flows to shorts and to products like USDe. When funding turns negative, those yields reverse.</p>`,
    keys: ["Name the payer for every yield", "Emissions are a subsidy, not income", "Compare against the T-bill rate", "Funding rates are crypto's price of leverage"],
    src: [
      ["DefiLlama Yields", "https://defillama.com/yields", "T", "Splits APY into base and reward for thousands of pools."],
      ["DefiLlama perps dashboard", "https://defillama.com/perps", "T", "Track the venues whose funding feeds delta-neutral yields."],
      ["Ethena docs", "https://docs.ethena.fi/", "D", "A worked example of turning funding plus staking yield into a dollar product."]
    ],
    build: "Pick 10 pools from DefiLlama Yields. For each, record base APY, reward APY, TVL and the actual payer. Flag every pool whose base APY is below the T-bill rate.",
    quiz: [
      ["A vault shows 25% APY: 3% base and 22% token rewards. What is the sustainable part?", ["Mostly the 3% base, and only after subtracting expected losses", "All 25%", "The 22% rewards", "None, because APY is always fake"], "Rewards are subsidies that end and get sold. The base is the cash flow that someone is paying."],
      ["Where does Ethereum staking yield come from?", ["New issuance plus priority fees plus MEV", "Interest paid by stablecoin issuers", "Token emissions from Lido only", "Gas refunds"], "Validators earn consensus-layer issuance and execution-layer tips and MEV."],
      ["Why should a stablecoin vault be compared with the T-bill rate?", ["T-bills are the near-risk-free alternative, so any excess is a risk premium", "Because vaults invest only in T-bills", "Regulators require it", "T-bills are on Ethereum by default"], "Return above the risk-free rate is compensation for extra risks, so identify which risks you are being paid for."]
    ]
  },
  {
    id: "u1l5", t: "Market liquidity vs funding liquidity", min: 12,
    sum: "Brunnermeier–Pedersen liquidity spirals explain liquidation cascades like October 10, 2025, and how to design against them.",
    body: `<p>Brunnermeier and Pedersen (2009) separate two kinds of liquidity:</p>
<ul><li><b>Market liquidity</b>: how cheaply you can trade an asset (spread, depth, impact).</li>
<li><b>Funding liquidity</b>: how easily traders can finance positions (margin, haircuts, borrowing).</li></ul>
<p>The two feed each other in <b>liquidity spirals</b>:</p>
<ul><li><b>Loss spiral.</b> Prices fall, leveraged traders lose capital, they must sell, prices fall further.</li>
<li><b>Margin spiral.</b> Volatility rises, so margins and haircuts rise, so everyone must deleverage at once, which drains market liquidity.</li></ul>
<h4>The crypto version</h4>
<p>Crypto automates the spiral with liquidation engines. On <b>October 10, 2025</b>, a tariff headline triggered about <b>$19B of liquidations</b>, the largest day on record. Reports put Hyperliquid's share at about $10B and say it ran ADL for the first time in over two years. USDe briefly depegged on Binance, where Binance's internal pricing of collateral sped up liquidations. Read the CoinGecko explainer and compare the venues.</p>
<h4>What a protocol designer controls</h4>
<ul><li>Margin requirements that rise <i>before</i> volatility arrives, not during it.</li>
<li>Oracle design: which price triggers liquidations? Avoid using your own thin order book.</li>
<li>Liquidation pacing: partial liquidations, Dutch auctions, backstop vaults.</li>
<li>Loss absorption order: trader margin, then insurance fund, then backstop LP, then ADL or socialized loss.</li>
<li>Withdrawal design for your own LPs: queues, utilization caps, cooldowns. That is the protocol's own funding liquidity.</li></ul>`,
    keys: ["Market liquidity and funding liquidity reinforce each other", "Loss spirals and margin spirals drive cascades", "Oct 10, 2025: about $19B liquidated in a day", "Design the loss waterfall before you launch"],
    src: [
      ["Brunnermeier and Pedersen, Market Liquidity and Funding Liquidity", "https://www.nber.org/papers/w12939", "P", "The liquidity-spiral paper. Essential for anyone building leverage."],
      ["CoinGecko, The October 10 crypto crash explained", "https://www.coingecko.com/learn/october-10-crypto-crash-explained", "R", "Timeline, venue breakdown and the USDe/Binance pricing issue."],
      ["Hyperliquid docs: auto-deleveraging", "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/auto-deleveraging", "D", "How a venue closes winners' positions when losses exceed backstops."]
    ],
    build: "Simulate 1,000 leveraged accounts with random entry prices and leverage. Apply a 15% price drop with price impact proportional to liquidated volume, and show how impact turns a 15% move into a much bigger cascade. Then add a partial-liquidation rule and compare.",
    quiz: [
      ["What is a 'margin spiral'?", ["Rising volatility raises margins, forcing deleveraging that worsens volatility", "Margins falling so traders add leverage", "A spiral staircase in a trading pit", "Funding rates rising for longs"], "Higher margins force sales during stress, which drains market liquidity, which raises volatility again."],
      ["Which design choice most directly dampens a liquidation cascade?", ["Partial liquidations with a backstop instead of dumping whole positions on the book", "Higher maximum leverage", "Using the venue's own thinnest order book as the oracle", "Removing the insurance fund"], "Partial liquidation and backstops reduce the forced flow hitting the market at once."],
      ["Funding liquidity is about…", ["How easily traders can finance positions (margin, haircuts, borrowing)", "How deep the order book is", "How fast blocks are produced", "How many tokens a protocol holds"], "Market liquidity is about trading an asset. Funding liquidity is about financing positions in it."]
    ]
  },
  {
    id: "u1l6", t: "Mechanism design, auctions and attack costs", min: 11,
    sum: "Design rules so that self-interested actors produce the outcome you want, and price what it costs to break them.",
    body: `<p><b>Mechanism design</b> is game theory run backwards. You choose the rules so that rational, selfish participants produce the outcome you want. The core vocabulary:</p>
<ul><li><b>Incentive compatibility</b>: telling the truth or behaving honestly is the best strategy.</li>
<li><b>Nash equilibrium</b>: nobody gains by deviating alone.</li>
<li><b>Schelling point</b>: the obvious choice people coordinate on. Oracle and governance designs depend on these.</li></ul>
<h4>Auctions you will reuse</h4>
<ul><li><b>Dutch auctions</b> (price falls until someone takes it): Maker/Sky liquidations, UniswapX orders, NFT drops.</li>
<li><b>Sealed-bid and second-price auctions</b>: truthful bidding is a dominant strategy in second-price.</li>
<li><b>Batch auctions</b>: all orders in a window clear at one price, which removes speed races (CoW Protocol, Budish's frequent batch auctions).</li>
<li><b>Posted price with burns</b>: EIP-1559 replaced a first-price gas auction with a base fee that adjusts algorithmically (Roughgarden's analysis).</li></ul>
<h4>Cost of corruption</h4>
<pre><code>secure if  cost_to_attack  >  profit_from_attack
e.g. oracle manipulation: cost = capital × slippage to move price for N blocks
     profit = value you can borrow or liquidate at the fake price</code></pre>
<p>Write this inequality for every trust assumption in your protocol: oracles, governance, bridges, sequencers. Most exploits in Unit 15 happened because it failed.</p>`,
    keys: ["Design rules so honesty is the best strategy", "Dutch, second-price and batch auctions each fix a different problem", "EIP-1559 is a posted-price mechanism", "Security means cost of attack exceeds profit from attack"],
    src: [
      ["Roughgarden, Transaction Fee Mechanism Design for the Ethereum Blockchain (EIP-1559)", "https://arxiv.org/abs/2012.00854", "P", "A formal analysis of EIP-1559's incentives."],
      ["Budish, Cramton, Shim, Frequent Batch Auctions", "https://academic.oup.com/qje/article/130/4/1547/1916146", "P", "Why batch auctions remove latency arbitrage."],
      ["CoW Protocol docs", "https://docs.cow.fi/", "D", "A production batch-auction DEX with solver competition."]
    ],
    build: "Pick a lending market on DefiLlama. For its largest collateral asset, estimate how much capital it would take to move that asset's main DEX price by 20% for 10 minutes, and compare that with how much could be borrowed against it.",
    quiz: [
      ["What is the main benefit of a batch auction over continuous matching?", ["It removes the advantage of being microseconds faster", "It always gives higher prices", "It needs no solvers", "It eliminates fees"], "Orders in a batch clear at one uniform price, so speed within the window doesn't matter."],
      ["A protocol is economically secure against oracle manipulation when…", ["The cost of moving the price exceeds the profit from exploiting the moved price", "The oracle is decentralized in name", "The token has high market cap", "The team is doxxed"], "Security is an inequality between attack cost and attack profit, checked continuously."],
      ["Which mechanism did EIP-1559 replace in Ethereum's fee market?", ["A first-price auction for gas", "Proof-of-work mining", "A batch auction", "A lottery"], "Users used to bid in a first-price auction. EIP-1559 added an algorithmic base fee that is burned, plus a tip."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u2", t: "Blockchain foundations", tag: "Technology",
  d: "Cryptography, Bitcoin, Ethereum, the life of a transaction and alternative chain designs.",
  lessons: [
  {
    id: "u2l1", t: "Hashes, signatures and Merkle trees", min: 12,
    sum: "The three primitives behind every chain, light client and bridge.",
    body: `<p><b>Hash functions</b> (SHA-256 in Bitcoin, Keccak-256 in Ethereum) map any input to a fixed digest. They must be collision-resistant, preimage-resistant and avalanche-y. Blocks commit to their parent and their contents through hashes, so changing history changes every later hash.</p>
<p><b>Signatures</b> prove authorization:</p>
<ul><li><b>ECDSA on secp256k1</b>: Bitcoin and Ethereum accounts. An Ethereum address is the last 20 bytes of keccak256(pubkey).</li>
<li><b>Ed25519</b>: Solana, Cosmos and many newer chains.</li>
<li><b>BLS</b>: aggregatable signatures. Ethereum validators aggregate thousands of attestations into one.</li></ul>
<p>Replay protection matters. Include a chain id (EIP-155) and a nonce, and use domain separation for offchain signatures (EIP-712). Signature replay across chains caused real bridge losses, including a reported ~$127M cross-chain incident in June 2026.</p>
<h4>Merkle trees</h4>
<p>Hash pairs of leaves up to one root. A <b>Merkle proof</b> shows a leaf is included using only log₂(n) sibling hashes. Ethereum uses a Merkle-Patricia trie for state. Light clients, airdrops and bridges all verify Merkle proofs against a trusted root.</p>
<pre><code>def merkle_root(leaves):
    layer = [keccak(l) for l in leaves]
    while len(layer) > 1:
        if len(layer) % 2: layer.append(layer[-1])
        layer = [keccak(min(a,b) + max(a,b)) for a, b in zip(layer[::2], layer[1::2])]
    return layer[0]   # sorted pairs = OpenZeppelin MerkleProof convention</code></pre>`,
    keys: ["Hashes chain blocks together and commit to data", "secp256k1 ECDSA, Ed25519 and BLS each have a role", "Replay protection: chain id, nonce, EIP-712 domain", "Merkle proofs are O(log n) inclusion proofs"],
    src: [
      ["Mastering Bitcoin (free on GitHub)", "https://github.com/bitcoinbook/bitcoinbook", "K", "Keys, addresses, hashing and the full Bitcoin stack."],
      ["learn me a bitcoin", "https://learnmeabitcoin.com", "K", "Byte-level walkthroughs of keys, transactions and Merkle roots."],
      ["EIP-712: Typed structured data signing", "https://eips.ethereum.org/EIPS/eip-712", "D", "How to sign offchain messages safely, with domain separation."],
      ["EIP-155: Replay protection", "https://eips.ethereum.org/EIPS/eip-155", "D", "Chain id in signatures."]
    ],
    build: "Implement a Merkle tree with proof generation in Python or TypeScript. Write a Solidity contract that verifies the proofs with OpenZeppelin's MerkleProof, and fuzz-test it with Foundry.",
    quiz: [
      ["How many hashes does a Merkle proof need for one leaf among 1,024?", ["About 10", "1,024", "512", "1"], "log₂(1024) = 10 sibling hashes."],
      ["Why is BLS used for Ethereum validator attestations?", ["Many signatures can be aggregated into one", "It is the only quantum-safe scheme", "It needs no private keys", "It is faster to compute than hashing"], "Aggregation lets thousands of attestations be checked as one signature."],
      ["What does EIP-712 add to offchain signatures?", ["A typed, domain-separated structure so a signature can't be replayed elsewhere", "Encryption of the message", "Faster block times", "Gas refunds"], "Domain separation binds the signature to a contract, chain id and version."]
    ]
  },
  {
    id: "u2l2", t: "Bitcoin: UTXOs and Nakamoto consensus", min: 12,
    sum: "Proof of work, longest-chain rule, probabilistic finality and the attacks that shape them.",
    body: `<p>Bitcoin solved double-spending without a trusted party by combining <b>proof of work</b> with the <b>most-work chain rule</b>. Miners search for a nonce so that the block hash is below a target. Difficulty adjusts every 2,016 blocks to keep blocks about 10 minutes apart.</p>
<p><b>The UTXO model:</b> there are no accounts, only unspent outputs. A transaction consumes outputs and creates new ones, and scripts define the spending conditions. UTXOs parallelize naturally and make privacy easier, but make complex shared state harder.</p>
<h4>Finality is probabilistic</h4>
<p>Each confirmation makes a reorg exponentially less likely, as long as attackers hold under 50% of hashpower. Exchanges wait about 6 blocks. Bridges from PoW chains must choose a confirmation depth, which is a security parameter priced against attack cost.</p>
<h4>Attacks to know</h4>
<ul><li><b>51% attack</b>: majority hashpower rewrites history and double-spends. Cheap on small PoW chains with rentable hashpower.</li>
<li><b>Selfish mining</b> (Eyal and Sirer): withholding blocks can pay with less than 50% of hashpower.</li>
<li><b>Fee sniping</b>: once block subsidies shrink, reorging to steal fees becomes attractive.</li></ul>`,
    keys: ["PoW plus most-work rule gives consensus without identities", "UTXOs are outputs, not balances", "Finality is probabilistic, measured in confirmations", "Attack cost is hashpower rental times duration"],
    src: [
      ["Nakamoto, Bitcoin: A Peer-to-Peer Electronic Cash System", "https://bitcoin.org/bitcoin.pdf", "P", "Nine pages. Read it twice."],
      ["Eyal and Sirer, Majority is not Enough (selfish mining)", "https://arxiv.org/abs/1311.0243", "P", "Why incentive compatibility needs more than an honest majority."],
      ["Programming Bitcoin (Jimmy Song)", "https://github.com/jimmysong/programmingbitcoin", "K", "Build elliptic curves, transactions and Script from scratch in Python."]
    ],
    build: "Work through Programming Bitcoin chapters 1–7: implement secp256k1 and sign and verify a transaction yourself.",
    quiz: [
      ["Why does Bitcoin's difficulty adjust every 2,016 blocks?", ["To keep average block time near 10 minutes as hashpower changes", "To reward early miners", "To reduce the supply cap", "To change the hash function"], "More hashpower means faster blocks, so difficulty rises to restore the 10-minute target."],
      ["What does a UTXO represent?", ["An unspent transaction output that can be spent once", "An account balance", "A smart contract's storage", "A validator's stake"], "Bitcoin tracks discrete outputs. Spending one consumes it and creates new outputs."],
      ["What does selfish mining show?", ["A miner can profit with under 50% of hashpower by withholding blocks", "Bitcoin needs 100% honest miners", "PoW is impossible to attack", "Fees always exceed block rewards"], "Strategic withholding can earn more than a fair share, so honest mining isn't always the best strategy."]
    ]
  },
  {
    id: "u2l3", t: "Ethereum: accounts, the EVM and gas", min: 14,
    sum: "The world computer: account state, the EVM's stack machine, gas metering and the EIP-1559 fee market.",
    body: `<p>Ethereum uses an <b>account model</b>. Externally owned accounts (keys) and contract accounts (code plus storage) each have a nonce and a balance. The state is a big map from addresses to accounts, committed by the state root in every block.</p>
<p>The <b>EVM</b> is a stack machine with 256-bit words, volatile memory, persistent storage and calldata. It is deterministic and single-threaded. <b>Gas</b> meters every opcode. Gas sidesteps the halting problem (execution always ends) and prices scarce resources. Storage is the expensive one: a fresh SSTORE costs 20,000 gas, and cold access costs extra since EIP-2929.</p>
<h4>EIP-1559 fee market</h4>
<pre><code>max fee per gas = base fee + priority tip (capped by maxFeePerGas)
base fee adjusts up to ±12.5% per block toward a 50%-full target
base fee is burned; the tip goes to the block proposer</code></pre>
<p>That is why fees spike smoothly rather than chaotically, and why ETH can be net-deflationary when usage is high.</p>
<h4>Why this matters for protocol design</h4>
<ul><li>Every storage write is a cost your users pay forever. Design compact state (pack structs, use events for history).</li>
<li>Rollups post data to Ethereum. Since EIP-4844, <b>blobs</b> have their own fee market (Unit 4).</li>
<li>Composability, meaning synchronous calls between contracts in one transaction, is Ethereum's superpower and its main attack surface (reentrancy, flash loans).</li></ul>`,
    keys: ["Account model: balances, nonces, code and storage", "EVM: 256-bit stack machine with gas metering", "EIP-1559: algorithmic base fee (burned) plus tip", "Storage is the expensive resource"],
    src: [
      ["Ethereum whitepaper", "https://ethereum.org/whitepaper", "P", "Vitalik's 2014 design rationale."],
      ["Ethereum yellow paper", "https://ethereum.github.io/yellowpaper/paper.pdf", "P", "The formal spec of the EVM and state transition."],
      ["evm.codes", "https://www.evm.codes", "T", "Opcode reference with gas costs and a playground."],
      ["EIP-1559", "https://eips.ethereum.org/EIPS/eip-1559", "D", "The fee-market change itself."],
      ["Ethereum developer docs", "https://ethereum.org/developers/docs/", "K", "Official docs covering accounts, transactions, gas and the EVM."]
    ],
    build: "Write a contract in Foundry that stores 100 values unpacked, then packed into a struct. Compare gas with forge test --gas-report and explain the difference using evm.codes.",
    quiz: [
      ["Under EIP-1559, what happens to the base fee?", ["It is burned", "It goes to the validator", "It goes to the Ethereum Foundation", "It is refunded to the user"], "The base fee is burned. Only the priority tip goes to the proposer."],
      ["Blocks keep coming in completely full. What happens to the base fee?", ["It rises up to 12.5% per block", "It stays fixed", "It drops to zero", "It doubles every block"], "Above the target, the base fee rises by up to 12.5% per block."],
      ["Why does gas exist?", ["To bound computation and price scarce resources such as storage", "To pay developers royalties", "To encrypt transactions", "To choose the block proposer"], "Gas guarantees termination and makes users pay for the resources they consume."]
    ]
  },
  {
    id: "u2l4", t: "From transaction to finality", min: 12,
    sum: "Mempools, builders, relays, proposers, attestations and Casper FFG finality: where MEV and settlement risk live.",
    body: `<p>Here is the life of an Ethereum transaction after the Merge:</p>
<ol><li>The wallet signs a transaction and sends it to an RPC.</li>
<li>It enters the <b>public mempool</b>, or goes to a <b>private relay or orderflow auction</b>.</li>
<li><b>Builders</b> assemble blocks that maximize value (fees plus MEV) and bid for inclusion.</li>
<li><b>Relays</b> pass the best header to the <b>proposer</b> through MEV-Boost. Glamsterdam's ePBS moves this into the protocol (Unit 4).</li>
<li>The block is proposed in a <b>12-second slot</b>. Committees <b>attest</b> to it.</li>
<li>After two epochs (2 × 32 slots, about 12.8 minutes) Casper FFG <b>finalizes</b> it. Reverting a finalized block would require at least a third of stake to be slashed.</li></ol>
<p>The fork choice before finality is <b>LMD-GHOST</b>. Short reorgs are possible before finality and impossible after it without mass slashing.</p>
<h4>What builders should take from this</h4>
<ul><li><b>Ordering is a market.</b> Whoever orders transactions can extract value (Unit 11).</li>
<li><b>Finality is a dial.</b> A bridge or exchange waiting for "safe" or "finalized" trades latency for safety.</li>
<li>Validators stake 32 ETH minimum. Pectra (May 2025) raised the maximum effective balance to 2,048 ETH (EIP-7251).</li></ul>`,
    keys: ["Wallet → mempool or relay → builder → proposer → attestations", "12-second slots, 32-slot epochs, finality in about 2 epochs", "LMD-GHOST fork choice plus Casper FFG finality = Gasper", "Ordering rights are where MEV comes from"],
    src: [
      ["Buterin et al., Combining GHOST and Casper (Gasper)", "https://arxiv.org/abs/2003.03052", "P", "The formal description of Ethereum's consensus."],
      ["Ethereum proof-of-stake docs", "https://ethereum.org/developers/docs/consensus-mechanisms/pos/", "K", "Slots, epochs, attestations and finality."],
      ["Flashbots docs", "https://docs.flashbots.net/", "D", "MEV-Boost, builders, relays and Protect RPC."],
      ["EIP-7251: Increase MAX_EFFECTIVE_BALANCE", "https://eips.ethereum.org/EIPS/eip-7251", "D", "Validator consolidation in Pectra."]
    ],
    build: "Use the beacon API or a block explorer to follow one transaction: find its slot, proposer, the builder that won the block, the relay, and the slot at which it was finalized.",
    quiz: [
      ["About how long does Ethereum take to finalize a block?", ["About 12.8 minutes (two epochs)", "12 seconds", "1 hour", "Instantly"], "Finality comes after two epochs of 32 twelve-second slots."],
      ["In MEV-Boost, who assembles the block contents?", ["Builders", "Proposers", "Light clients", "Wallets"], "Builders compete to build the most valuable block. Proposers just pick the best bid through relays."],
      ["Gasper combines…", ["LMD-GHOST fork choice with Casper FFG finality", "Proof of work with proof of stake", "Tendermint with HotStuff", "Optimistic and ZK rollups"], "Gasper uses LMD-GHOST for the head of the chain and Casper FFG for checkpoint finality."]
    ]
  },
  {
    id: "u2l5", t: "Other designs: Solana, Move and appchains", min: 12,
    sum: "Parallel execution, local fee markets, resource-oriented languages, and why serious perp venues run their own chains.",
    body: `<p><b>Solana</b> is one global state machine optimized for throughput and latency. Transactions <b>declare the accounts they touch</b>, so the runtime (Sealevel) can run non-conflicting transactions in parallel. Slots are about 400 ms. Hot accounts get <b>local fee markets</b>: contention on one pool doesn't raise fees for everyone. A second validator client (Firedancer) and a new consensus protocol (Alpenglow, approved by validators in 2025) aim for much faster finality.</p>
<p><b>Move</b> (Aptos, Sui) treats assets as <i>resources</i> that cannot be copied or implicitly dropped, which rules out whole classes of token bugs. Aptos runs <b>Block-STM</b>: execute optimistically in parallel, detect conflicts, re-execute. Monad brings a similar optimistic-parallel approach to the EVM.</p>
<h4>Appchains: why perp venues want their own chain</h4>
<ul><li><b>Control of ordering.</b> Put cancels ahead of takers to protect makers (Hyperliquid does this within each block).</li>
<li><b>No gas per order.</b> Market makers send thousands of updates per second.</li>
<li><b>Native matching engine</b> in the state machine instead of a contract.</li>
<li><b>Latency</b>: sub-second blocks with BFT finality.</li></ul>
<p>Hyperliquid (HyperBFT, a HotStuff variant, plus HyperCore order books and HyperEVM), dYdX v4 (Cosmos SDK) and Lighter (a zk rollup for verifiable matching) are three different answers to the same problem.</p>`,
    keys: ["Solana: declared account access enables parallelism and local fee markets", "Move: assets as resources; Block-STM: optimistic parallel execution", "Appchains control ordering, latency and fees", "Hyperliquid, dYdX and Lighter = three architectures for onchain order books"],
    src: [
      ["Solana docs", "https://solana.com/docs", "D", "Accounts, programs, transactions and fees."],
      ["Gelashvili et al., Block-STM", "https://arxiv.org/abs/2203.06871", "P", "Optimistic parallel execution with deterministic results."],
      ["Hyperliquid docs", "https://hyperliquid.gitbook.io/hyperliquid-docs", "D", "HyperBFT, HyperCore, HyperEVM and order-book design."],
      ["dYdX v4 docs", "https://docs.dydx.xyz/", "D", "A Cosmos appchain with offchain order books and onchain settlement."]
    ],
    build: "Write a 1-page comparison of Solana, an Ethereum L2 and a Cosmos appchain for hosting a perp order book. Cover latency, ordering control, cost per order update, composability and decentralization.",
    quiz: [
      ["What lets Solana execute transactions in parallel?", ["Transactions declare up front which accounts they read and write", "Every transaction runs on its own chain", "There is no shared state", "Validators skip signature checks"], "Declared access lists let the runtime schedule non-conflicting transactions in parallel."],
      ["Why might a perp DEX build its own chain?", ["To control transaction ordering, latency and per-order costs", "Because smart contracts cannot do arithmetic", "To avoid having validators", "Because order books are illegal on Ethereum"], "Market makers need cheap, fast cancels and fair ordering, which an appchain can guarantee natively."],
      ["How does Block-STM achieve parallelism?", ["It runs transactions optimistically and re-executes those that conflict", "It requires a declared access list for each transaction", "It shards state across chains", "It uses proof of work"], "Block-STM speculates, validates the read and write sets, and re-runs conflicts, preserving a deterministic order."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u3", t: "Build a chain from scratch", tag: "Chains",
  d: "State machines, consensus, networking, execution and storage, then frameworks and a full build plan for your own L1.",
  lessons: [
  {
    id: "u3l1", t: "A blockchain is a replicated state machine", min: 10,
    sum: "Define the state, the transition function and the block format. Everything else exists to agree on ordering.",
    body: `<p>Strip away the branding and a blockchain is <b>state machine replication</b>. Every node starts from the same genesis state, applies the same ordered transactions with the same deterministic function, and so ends with the same state.</p>
<pre><code>S_{n+1} = STF(S_n, block_{n+1})
block = { header: { parent_hash, height, timestamp, proposer,
                    tx_root, state_root, (receipts_root) },
          txs: [...] }</code></pre>
<p>The rest of the system just gets everyone to agree on that ordered list of blocks:</p>
<ul><li><b>Networking</b> spreads transactions and blocks.</li>
<li><b>Mempool</b> holds pending transactions and orders them.</li>
<li><b>Consensus</b> agrees on the next block.</li>
<li><b>Execution</b> applies the STF.</li>
<li><b>Storage</b> persists state and history.</li>
<li><b>RPC</b> lets users and apps query and submit.</li></ul>
<p>The <b>state root</b> commits to the full state in one hash. That lets light clients and bridges verify facts about the chain (a balance, an event) with only a header and a Merkle proof.</p>
<h4>Determinism rules</h4>
<p>No floating point. No wall-clock time except the block timestamp. No random iteration order (Go maps!). No external I/O inside the STF. One nondeterministic line splits your network.</p>
<pre><code>// Rust sketch
struct Tx { from: Addr, to: Addr, amount: u128, nonce: u64, sig: Sig }
fn apply(state: &mut State, tx: &Tx) -> Result&lt;(), Err&gt; {
    verify_sig(tx)?;
    let acct = state.get_mut(&tx.from)?;
    ensure!(acct.nonce == tx.nonce && acct.balance >= tx.amount);
    acct.nonce += 1; acct.balance -= tx.amount;
    state.credit(&tx.to, tx.amount); Ok(())
}</code></pre>`,
    keys: ["A chain is deterministic state-machine replication", "Consensus exists to agree on ordering", "The state root lets light clients verify facts", "Determinism bugs fork your network"],
    src: [
      ["Building Blockchain in Go (Jeiwan)", "https://jeiwan.net/posts/building-blockchain-in-go-part-1/", "K", "A classic step-by-step toy chain: blocks, PoW, persistence, transactions."],
      ["CometBFT docs (ABCI)", "https://docs.cometbft.com/", "D", "Plug your own state machine into a production BFT engine."],
      ["Ethereum yellow paper", "https://ethereum.github.io/yellowpaper/paper.pdf", "P", "A full formal STF to compare against yours."]
    ],
    build: "Implement Tx, Block and State structs plus a deterministic apply_block() in Rust or Go. Property-test it: two independent State instances applying the same random blocks must always produce the same state root.",
    quiz: [
      ["What must the state transition function always be?", ["Deterministic", "Randomized", "Parallel", "Encrypted"], "Every node must compute the same result from the same inputs, or the network forks."],
      ["What does the state root in a block header let you do?", ["Verify any piece of state with a Merkle proof, without the full state", "Skip signature verification", "Decrypt transactions", "Reduce block time"], "It is a single commitment to the whole state, which is what light clients and bridges rely on."],
      ["Which of these breaks determinism in an STF?", ["Iterating a hash map whose order is randomized", "Using u128 integers", "Checking nonces", "Verifying signatures"], "Random iteration order can produce different results on different nodes."]
    ]
  },
  {
    id: "u3l2", t: "Consensus: Nakamoto vs BFT", min: 16,
    sum: "Safety, liveness, finality, PBFT, Tendermint and HotStuff: the engines behind Cosmos, Aptos and Hyperliquid.",
    body: `<p>Consensus protocols trade off two properties:</p>
<ul><li><b>Safety</b>: honest nodes never finalize conflicting blocks.</li>
<li><b>Liveness</b>: the chain keeps making progress.</li></ul>
<p>Under network partitions you can't fully have both (FLP and CAP intuitions). <b>Nakamoto</b> consensus favors liveness (it keeps producing blocks, finality is probabilistic). <b>BFT</b> protocols favor safety (they halt rather than fork).</p>
<h4>Classical BFT</h4>
<ul><li>Needs <b>n ≥ 3f + 1</b> validators to tolerate f Byzantine ones. Quorums are 2f + 1, and any two quorums overlap in an honest node.</li>
<li><b>PBFT</b> (1999): pre-prepare, prepare, commit. O(n²) messages and a complex view change.</li>
<li><b>Tendermint / CometBFT</b>: propose, prevote, precommit, with locking for safety and rotating proposers. Finality is instant once more than two thirds precommit. Used by Cosmos chains and dYdX v4.</li>
<li><b>HotStuff</b>: linear communication, pipelined phases and a simple leader change. Its descendants run Aptos and Hyperliquid's HyperBFT.</li></ul>
<h4>Proof of stake around BFT</h4>
<p>Stake weights votes. <b>Slashing</b> punishes provable equivocation (double-signing). Long-range attacks with old keys are handled by <b>weak subjectivity</b>: new nodes start from a recent trusted checkpoint.</p>
<pre><code>// Tendermint round, simplified
propose(block) → each validator prevotes(block or nil)
if > 2/3 prevotes for B: lock B, precommit(B)
if > 2/3 precommits for B: COMMIT B (final)
else timeout → next round with next proposer</code></pre>`,
    keys: ["BFT needs n ≥ 3f+1 and 2f+1 quorums", "Nakamoto favors liveness, BFT favors safety", "Tendermint: instant finality; HotStuff: linear, pipelined", "Slashing and weak subjectivity secure PoS"],
    src: [
      ["Castro and Liskov, Practical Byzantine Fault Tolerance (1999)", "https://css.csail.mit.edu/6.824/2014/papers/castro-practicalbft.pdf", "P", "The paper that made BFT practical."],
      ["Buchman, Kwon, Milosevic, The latest gossip on BFT consensus (Tendermint)", "https://arxiv.org/abs/1807.04938", "P", "Tendermint's algorithm and proofs."],
      ["Yin et al., HotStuff", "https://arxiv.org/abs/1803.05069", "P", "Linear BFT with pipelining. The ancestor of many modern engines."],
      ["CometBFT docs", "https://docs.cometbft.com/", "D", "A production Tendermint implementation."],
      ["Malachite (Rust Tendermint library)", "https://github.com/circlefin/malachite", "C", "Modern Rust BFT consensus, now maintained under Circle for Arc."]
    ],
    build: "Implement a single-height Tendermint round with 4 in-process validators using channels. Make one validator Byzantine (it votes for two blocks) and show that safety holds. Then crash 2 validators and show that liveness stops, as it should.",
    quiz: [
      ["How many validators do you need to tolerate 3 Byzantine ones in classical BFT?", ["10", "7", "4", "6"], "n ≥ 3f+1 = 10."],
      ["During a network partition, what does Tendermint do?", ["Halts rather than finalizing conflicting blocks", "Forks into two chains", "Falls back to proof of work", "Finalizes both sides"], "BFT protocols prioritize safety, so without a 2/3 quorum they stop."],
      ["What is HotStuff's main improvement over PBFT?", ["Linear communication and simple pipelined leader rotation", "It uses proof of work", "It needs no signatures", "It tolerates 50% Byzantine nodes"], "HotStuff reduces view-change complexity and per-phase messaging to O(n)."]
    ]
  },
  {
    id: "u3l3", t: "Networking and the mempool", min: 11,
    sum: "Peer discovery, gossip, DoS defense and mempool ordering, where fairness and MEV start.",
    body: `<p>Nodes need to find peers and spread data quickly without being DoS'd.</p>
<ul><li><b>Discovery</b>: Kademlia-style DHTs (Ethereum discv5).</li>
<li><b>Gossip</b>: libp2p gossipsub meshes. Each node forwards to a subset of peers, with scoring to punish spammers.</li>
<li><b>Block propagation</b>: compact blocks, or erasure-coded shreds (Solana Turbine), to cut bandwidth and latency.</li></ul>
<h4>The mempool is a policy</h4>
<ul><li><b>Admission</b>: valid signature, nonce, balance for max fee, size limits.</li>
<li><b>Ordering</b>: by priority fee, with nonce gaps held back.</li>
<li><b>Replacement</b>: the same nonce with a higher fee (usually at least a 10% bump).</li>
<li><b>Eviction</b>: lowest fee first when full.</li></ul>
<p>A public mempool leaks intent, which is where sandwiching comes from. Exchange chains often skip a public mempool: validators take orders directly, apply deterministic ordering rules, and treat cancels specially.</p>
<h4>Design questions for your chain</h4>
<ol><li>Who can see pending transactions, and when?</li>
<li>What ordering rule does the proposer have to follow, and can anyone verify it?</li>
<li>How do you rate-limit without a gas fee per order?</li></ol>`,
    keys: ["Discovery (DHT) + gossip (gossipsub) + efficient block propagation", "The mempool is admission + ordering + replacement + eviction", "A public mempool leaks intent and enables MEV", "Exchange chains customize ordering and rate limits"],
    src: [
      ["libp2p docs", "https://libp2p.io/docs/", "D", "Networking stack used by Ethereum consensus clients, Polkadot, Filecoin and others."],
      ["Ethereum devp2p specs", "https://github.com/ethereum/devp2p", "D", "discv5, RLPx and the eth wire protocol."],
      ["Flashbots writings", "https://writings.flashbots.net/", "P", "Research on mempools, orderflow and private transaction routing."]
    ],
    build: "Add networking to your toy chain: 4 nodes over TCP or libp2p, gossiping transactions and blocks. Add a mempool with nonce ordering and fee-bump replacement, then flood it with spam and add per-peer rate limits.",
    quiz: [
      ["Why do mempools need replacement rules, such as requiring at least a 10% fee bump?", ["To stop spam re-broadcasts with tiny fee changes", "To make blocks larger", "To guarantee inclusion", "To enforce KYC"], "Without a minimum bump, attackers could make nodes re-gossip near-identical transactions for free."],
      ["What does a public mempool reveal that enables sandwich attacks?", ["Pending trades before they execute", "Validators' private keys", "Block rewards", "The state root"], "Seeing a pending swap lets a searcher trade in front of it and behind it."],
      ["What problem does gossipsub peer scoring address?", ["Spammy or misbehaving peers degrading the network", "Slow hashing", "Large state roots", "Gas pricing"], "Scoring removes peers that send invalid or excessive messages."]
    ]
  },
  {
    id: "u3l4", t: "Execution, state and storage", min: 13,
    sum: "VM choices, gas metering, state commitments, databases and parallel execution.",
    body: `<p><b>Choose the execution environment first.</b> It determines who can build on your chain.</p>
<ul><li><b>EVM</b>: largest developer base and tooling. Reth and Geth are embeddable.</li>
<li><b>SVM</b>: parallel, high throughput.</li>
<li><b>Move VM</b>: resource safety.</li>
<li><b>WASM</b> (CosmWasm, Arbitrum Stylus): multi-language.</li>
<li><b>Native modules</b> (Hyperliquid core, Cosmos SDK modules): fastest, but no third-party contracts unless you add a VM next to them.</li></ul>
<h4>Metering</h4>
<p>Any chain that runs untrusted code needs metering (gas) and per-block resource limits. Price storage writes much higher than compute, because state lasts forever.</p>
<h4>State commitments</h4>
<ul><li><b>Merkle-Patricia trie</b> (Ethereum): flexible but I/O-heavy.</li>
<li><b>IAVL</b> (Cosmos), <b>Jellyfish Merkle</b> (Aptos), <b>sparse Merkle trees</b>: each is a different trade-off.</li>
<li>Databases underneath: RocksDB and MDBX (Reth). Flat key-value storage plus a separate commitment computation is the modern pattern.</li></ul>
<h4>Parallelism and performance</h4>
<ul><li>Declared access lists (Solana), optimistic execution like Block-STM (Aptos, Monad), and Ethereum's Block-Level Access Lists (EIP-7928, in Glamsterdam) all aim at parallel execution.</li>
<li>State sync and snapshots let new nodes join without replaying all history.</li>
<li>Plan for pruning and state growth from day one.</li></ul>`,
    keys: ["The VM choice determines your developer audience", "Meter everything; price storage above compute", "MPT, IAVL, JMT and SMT are commitment-scheme trade-offs", "Parallel execution via access lists or optimistic re-execution"],
    src: [
      ["Reth book", "https://reth.rs/", "D", "A modular Rust Ethereum client you can embed or extend (ExEx)."],
      ["Cosmos SDK docs", "https://docs.cosmos.network/", "D", "Modules, keepers, IAVL store and ABCI."],
      ["Block-STM paper", "https://arxiv.org/abs/2203.06871", "P", "Parallel execution with deterministic output."],
      ["EIP-7928: Block-Level Access Lists", "https://eips.ethereum.org/EIPS/eip-7928", "D", "Ethereum's path to parallel execution in Glamsterdam."]
    ],
    build: "Persist your toy chain's state in RocksDB (or sled/pebble), compute a sparse Merkle root over accounts, and add a /proof endpoint that returns a Merkle proof for any balance. Verify it with a separate light-client script.",
    quiz: [
      ["Why should storage writes cost far more gas than arithmetic?", ["State persists forever and every node must store it", "Arithmetic is free in CPUs", "Storage is encrypted", "Regulators require it"], "Permanent state growth is the scarcest resource a chain has."],
      ["What does EIP-7928 (Block-Level Access Lists) enable?", ["Parallel execution and faster validation using declared state access", "Larger blobs", "Account abstraction", "Validator consolidation"], "Knowing every block's state access up front lets clients parallelize and prefetch."],
      ["What is the trade-off of building a chain from native modules only, with no VM?", ["Maximum performance, but third parties can't deploy contracts", "Slower blocks", "No signatures", "Higher gas costs"], "Native modules are fast and safe, but closed. Hyperliquid added HyperEVM next to HyperCore for this reason."]
    ]
  },
  {
    id: "u3l5", t: "Frameworks: pick your stack", min: 12,
    sum: "Cosmos SDK, OP Stack, Arbitrum Orbit, Polkadot SDK, Reth SDK, Commonware and Sovereign SDK, and when to use each.",
    body: `<p>Build a toy chain to learn. Build production on a framework unless you have a specific reason not to.</p>
<div class="tbl"><table><thead><tr><th>Stack</th><th>What you get</th><th>Pick it when</th></tr></thead><tbody>
<tr><td>Cosmos SDK + CometBFT</td><td>Sovereign L1, Go modules, IBC, instant finality</td><td>You need your own validator set and native modules (dYdX v4)</td></tr>
<tr><td>OP Stack</td><td>EVM L2 on Ethereum, Superchain interop, fault proofs</td><td>You want Ethereum security, EVM tooling, fast launch (Base and many others)</td></tr>
<tr><td>Arbitrum Orbit / Nitro</td><td>EVM L2 or L3, Stylus WASM, BoLD fraud proofs</td><td>EVM plus Rust/C++ contracts, custom gas token</td></tr>
<tr><td>Polkadot SDK</td><td>Substrate runtime (FRAME), shared security</td><td>Runtime upgrades without forks, Rust pallets</td></tr>
<tr><td>Reth SDK / ExEx</td><td>Composable Rust Ethereum node</td><td>A custom EVM chain or indexer close to the node</td></tr>
<tr><td>Commonware</td><td>Rust primitives: consensus, p2p, storage, broadcast</td><td>A bespoke high-performance chain (exchange-style)</td></tr>
<tr><td>Sovereign SDK</td><td>Rollups in Rust, any DA layer, ZK or optimistic</td><td>Custom-logic rollups with Rust state machines</td></tr>
</tbody></table></div>
<h4>The decision in one paragraph</h4>
<p>Want composability with Ethereum DeFi and its users? Use a <b>rollup stack</b>. Need a custom matching engine, cancel priority and sub-second blocks? Use an <b>appchain</b> (Cosmos SDK or a bespoke Rust chain). Building a perp DEX? Study how Hyperliquid paired a native order book (HyperCore) with an EVM (HyperEVM) so third parties can still compose.</p>`,
    keys: ["Toy chain to learn; framework to ship", "Rollup stacks give Ethereum security and EVM tooling", "Appchains give control over ordering and performance", "Hybrid: native engine plus EVM for composability"],
    src: [
      ["OP Stack docs", "https://docs.optimism.io/", "D", "Run your own OP chain; fault proofs; Superchain."],
      ["Arbitrum docs", "https://docs.arbitrum.io/", "D", "Nitro, Orbit chains, Stylus and BoLD."],
      ["Cosmos SDK docs", "https://docs.cosmos.network/", "D", "Build a sovereign appchain."],
      ["Polkadot developer docs", "https://docs.polkadot.com/", "D", "Polkadot SDK and parachains."],
      ["Commonware", "https://commonware.xyz/", "C", "Rust primitives for building specialized blockchains."],
      ["Sovereign SDK", "https://github.com/Sovereign-Labs/sovereign-sdk", "C", "A rollup framework in Rust."]
    ],
    build: "Spin up a local OP Stack devnet or an Arbitrum Orbit devnode AND a Cosmos SDK chain scaffolded with Ignite. Deploy the same counter app to both and write down the developer experience, block times and the trust assumptions of each.",
    quiz: [
      ["You want EVM compatibility, Ethereum settlement and the fastest path to launch. Which stack?", ["A rollup stack such as OP Stack or Arbitrum Orbit", "A from-scratch BFT chain", "Bitcoin Script", "A centralized database"], "Rollup stacks inherit Ethereum security and EVM tooling out of the box."],
      ["Why did dYdX v4 choose Cosmos SDK?", ["To run its own validator set with a custom order-book module and fast finality", "To use proof of work", "Because Cosmos has no fees", "To avoid having any validators"], "Its validators run in-memory order books, and Cosmos lets it customize the chain's logic."],
      ["What is Hyperliquid's answer to 'native performance vs composability'?", ["HyperCore native order books plus HyperEVM for third-party contracts", "Only smart contracts", "A centralized server", "Running on Bitcoin"], "Hyperliquid pairs its native engine with an EVM so others can build on top."]
    ]
  },
  {
    id: "u3l6", t: "Project: ship your own L1, end to end", min: 15,
    sum: "A milestone plan from ledger to a 4-validator BFT chain with a native order book, explorer and chaos tests.",
    body: `<p>This is the capstone of the chain track. Each milestone should run and be tested before you start the next.</p>
<ol>
<li><b>Ledger STF</b>: accounts, nonces, transfers, signatures (Ed25519).</li>
<li><b>Blocks and commitments</b>: header, tx root, state root (sparse Merkle), genesis file.</li>
<li><b>Single-node producer plus RPC</b>: JSON-RPC sendTx, getBalance, getBlock, getProof.</li>
<li><b>BFT consensus with 4 validators</b>. Fastest path: write an <b>ABCI app</b> and let CometBFT handle consensus. Learning path: your own Tendermint or HotStuff over libp2p.</li>
<li><b>Persistence and state sync</b>: RocksDB, snapshots, restart recovery.</li>
<li><b>Native order book module</b>: price-time priority, deterministic matching, cancels processed before takers in each block, fixed-point prices (no floats).</li>
<li><b>Perp margin module</b>: oracle price posted by validators (median), funding every hour, liquidations (Unit 9).</li>
<li><b>Observability</b>: block explorer page, Prometheus metrics, structured logs.</li>
<li><b>Chaos tests</b>: kill nodes, partition the network, add a Byzantine double-signer, check safety, liveness and slashing.</li>
<li><b>Bridge in</b>: lock USDC on an Anvil "L1", mint on your chain via a validator-signed attestation (Unit 12).</li>
</ol>
<p>At the end you have built a simplified Hyperliquid or dYdX. Every design debate in this course will make more sense afterwards.</p>`,
    keys: ["Ship in milestones that each run and pass tests", "ABCI + CometBFT is the fastest path to real consensus", "Fixed-point math and deterministic matching", "Chaos-test safety and liveness"],
    src: [
      ["CometBFT docs (ABCI spec)", "https://docs.cometbft.com/", "D", "Implement CheckTx, FinalizeBlock and Commit for your app."],
      ["Building Blockchain in Go", "https://jeiwan.net/posts/building-blockchain-in-go-part-1/", "K", "Milestones 1–3 in Go."],
      ["Malachite", "https://github.com/circlefin/malachite", "C", "Rust consensus if you want milestone 4 in Rust."],
      ["Hyperliquid docs", "https://hyperliquid.gitbook.io/hyperliquid-docs", "D", "A reference design for milestones 6–7."]
    ],
    build: "Do milestones 1–4 this month. Write a README with an architecture diagram, run a 4-node local network with docker compose, and record a demo of a transfer finalizing.",
    quiz: [
      ["Why use fixed-point integers instead of floats in a matching engine?", ["Floats can differ across platforms and break determinism", "Floats are slower to sort", "Integers use less storage", "Floats can't be negative"], "Rounding differences across CPUs or compilers would make nodes disagree."],
      ["What is the fastest way to give your state machine production BFT consensus?", ["Implement it as an ABCI application on CometBFT", "Write PBFT from scratch", "Use proof of work", "Run a single sequencer"], "ABCI separates the app from consensus, so CometBFT handles networking and agreement."],
      ["Which test checks safety in your chain?", ["A Byzantine validator double-signs and honest nodes never commit conflicting blocks", "Measuring RPC latency", "Counting transactions per second", "Checking the explorer UI"], "Safety means no conflicting commits even with faulty nodes present."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u4", t: "Scaling: rollups, data availability and ZK", tag: "Chains",
  d: "Optimistic and ZK rollups, blobs and DA, L2BEAT trust levels, proofs for engineers, and Ethereum's 2025–26 upgrades.",
  lessons: [
  {
    id: "u4l1", t: "Rollups: optimistic vs ZK", min: 13,
    sum: "Execute offchain, post data onchain, and prove (or allow challenges of) the result.",
    body: `<p>A <b>rollup</b> executes transactions on its own chain, posts the transaction data to a base layer, and settles state roots there. Users can always reconstruct the state from that data, and withdraw even if the operator disappears.</p>
<ul><li><b>Optimistic rollups</b> (OP Stack, Arbitrum) assume state roots are valid unless someone proves fraud during a <b>challenge window</b> (about 7 days on Ethereum). Withdrawals through the canonical bridge wait out that window. Fast-bridge LPs front the money for a fee.</li>
<li><b>ZK rollups</b> (zkSync, Starknet, Scroll, Linea, and Lighter for order books) post a <b>validity proof</b> with each batch. Once verified on L1, the state is final. Withdrawals are fast, but proving costs compute.</li></ul>
<h4>The parts</h4>
<ul><li><b>Sequencer</b>: orders transactions. Usually one operator today, which means censorship and liveness risk, mitigated by forced inclusion through L1.</li>
<li><b>Batcher</b>: posts data to L1 (blobs).</li>
<li><b>Proposer</b>: posts state roots.</li>
<li><b>Prover or challenger</b>: produces validity proofs, or disputes fraudulent roots.</li>
<li><b>Bridge contracts</b> on L1: hold deposits and process withdrawals.</li></ul>
<p>An "L2" without working proofs, or with an instant-upgrade multisig, is a multisig with extra steps. That's why L2BEAT's stages exist.</p>`,
    keys: ["Rollups = offchain execution + onchain data + settlement", "Optimistic: fraud proofs and about 7-day withdrawals", "ZK: validity proofs and fast finality, but expensive proving", "Sequencers are the main centralization point"],
    src: [
      ["L2BEAT", "https://l2beat.com/", "T", "Risk analysis of every rollup: proofs, DA, upgradeability, exits."],
      ["OP Stack docs", "https://docs.optimism.io/", "D", "Fault proofs, batcher, proposer and sequencer."],
      ["Arbitrum docs", "https://docs.arbitrum.io/", "D", "Nitro, BoLD and the delayed inbox (forced inclusion)."]
    ],
    build: "On L2BEAT, compare three rollups: proof system, exit window, upgrade delay and DA. Then bridge testnet ETH through a canonical bridge and trace the deposit and the L1 withdrawal transactions.",
    quiz: [
      ["Why do canonical withdrawals from optimistic rollups take about 7 days?", ["To leave time for fraud proofs to challenge invalid state roots", "Because L1 blocks are slow", "Because of KYC checks", "Because blobs expire"], "The challenge window must pass before a state root can be trusted."],
      ["What protects users if a rollup's sequencer censors them?", ["Forced inclusion through an L1 inbox", "Nothing", "Validity proofs alone", "The token price"], "Users can submit transactions to L1 contracts that the rollup must eventually include."],
      ["What does a ZK rollup post to make its state final once verified?", ["A validity proof", "A multisig signature", "A 7-day timelock", "A fraud proof"], "The proof shows the new state root follows correctly from the data."]
    ]
  },
  {
    id: "u4l2", t: "Data availability and blobs", min: 11,
    sum: "Why publishing data is the real cost of a rollup, and how EIP-4844 and PeerDAS scale it.",
    body: `<p>Validity isn't enough. If the data behind a state root is withheld, nobody can rebuild the state or produce fraud proofs. <b>Data availability (DA)</b> means the data was really published, so anyone can download it.</p>
<h4>Ethereum's DA roadmap</h4>
<ul><li><b>EIP-4844 (Dencun, March 2024)</b>: blobs of about 128 KB each, with their own fee market, pruned after about 18 days. Rollup costs fell by roughly an order of magnitude.</li>
<li><b>Pectra (May 2025)</b>: raised the blob target and max to 6 and 9 (EIP-7691).</li>
<li><b>Fusaka (Dec 2025)</b>: <b>PeerDAS</b> (EIP-7594). Nodes sample erasure-coded pieces of blobs instead of downloading everything, which allows further blob-count increases through blob-parameter-only forks.</li></ul>
<h4>Alt-DA</h4>
<p>Celestia (data-availability sampling with light nodes), EigenDA and Avail sell cheaper DA with different trust assumptions. If an "L2" posts its data off Ethereum, its safety depends on that DA layer, or on a data-availability committee.</p>
<h4>Data-availability sampling, intuitively</h4>
<p>Erasure-code the data so any 50% of it recovers 100%. Light nodes download random small pieces. If they all succeed, it is overwhelmingly likely that the whole block is recoverable.</p>`,
    keys: ["DA = data really published and downloadable", "Blobs (EIP-4844) made rollups much cheaper", "PeerDAS (Fusaka, Dec 2025) adds sampling to scale blobs", "Alt-DA changes the trust model"],
    src: [
      ["EIP-4844: Shard Blob Transactions", "https://eips.ethereum.org/EIPS/eip-4844", "D", "The blob transaction type and fee market."],
      ["EIP-7594: PeerDAS", "https://eips.ethereum.org/EIPS/eip-7594", "D", "Peer data-availability sampling, shipped in Fusaka."],
      ["EIP-7691: Blob throughput increase", "https://eips.ethereum.org/EIPS/eip-7691", "D", "Pectra's blob target and max increase."],
      ["Celestia docs", "https://docs.celestia.org/", "D", "Modular DA with data-availability sampling."]
    ],
    build: "Query blob base fees over the last 30 days (e.g. a Dune dashboard) and estimate what posting 1 MB per hour costs your rollup with blobs versus calldata.",
    quiz: [
      ["Why isn't a validity proof alone enough without data availability?", ["Users couldn't rebuild state or exit if the data were withheld", "Proofs can be forged", "Blobs are encrypted", "Validity proofs are optional"], "Without the data, users can't know their balances or build withdrawal proofs."],
      ["What did PeerDAS (Fusaka) change?", ["Nodes sample pieces of blob data instead of downloading all of it", "It removed blobs", "It added account abstraction", "It reduced the slot time to 1 second"], "Sampling lets the network raise blob counts without every node downloading everything."],
      ["Roughly how long do Ethereum nodes keep blobs?", ["About 18 days", "Forever", "One block", "One year"], "Blobs are pruned after about 4,096 epochs (roughly 18 days). Long-term storage is someone else's job."]
    ]
  },
  {
    id: "u4l3", t: "Trust levels: stages, sequencers, based rollups", min: 11,
    sum: "How to judge whether an L2 really inherits Ethereum security, and where sequencing is heading.",
    body: `<p>L2BEAT's <b>stages</b> framework grades rollup decentralization:</p>
<ul><li><b>Stage 0</b>: training wheels. The operator or a multisig can override everything.</li>
<li><b>Stage 1</b>: working proof system. A security council can intervene only under constraints, and users get an exit window before most upgrades.</li>
<li><b>Stage 2</b>: fully permissionless proofs. Governance can't override proofs, and upgrades come with long exit windows.</li></ul>
<h4>Sequencing options</h4>
<ul><li><b>Centralized sequencer</b>: fast pre-confirmations, but one operator controls ordering and MEV.</li>
<li><b>Shared sequencers</b>: one sequencer set across rollups, giving atomic cross-rollup inclusion.</li>
<li><b>Based rollups</b>: L1 proposers sequence the rollup. You inherit L1 liveness and neutrality, at the cost of L1 block times unless you add preconfirmations.</li></ul>
<h4>A checklist for any chain you build on or bridge to</h4>
<ol><li>Who can upgrade the contracts, and with what delay?</li>
<li>Do proofs work, and who can submit them?</li>
<li>Where is the data?</li>
<li>Can I force-include a transaction, and can I exit without the operator?</li></ol>`,
    keys: ["Stage 0 → 1 → 2: from multisig control to permissionless proofs", "The sequencer controls ordering, MEV and censorship", "Based rollups use L1 proposers as sequencers", "Always check upgrade keys, proofs, DA and exits"],
    src: [
      ["L2BEAT stages", "https://l2beat.com/stages", "T", "Live classification of rollups by stage."],
      ["Justin Drake, Based rollups (ethresear.ch)", "https://ethresear.ch/t/based-rollups-superpowers-from-l1-sequencing/15016", "P", "The proposal for L1-sequenced rollups."],
      ["ethresear.ch", "https://ethresear.ch/", "P", "Ongoing research on preconfirmations, sequencing and interop."]
    ],
    build: "Write a one-page trust report for the L2 you'd deploy your protocol on: stage, upgrade keys and delays, proof system, DA, forced inclusion, and what happens to your users if the sequencer goes offline for 24 hours.",
    quiz: [
      ["What mainly separates Stage 2 from Stage 1?", ["Proofs are permissionless and governance can't override them", "It uses ZK proofs", "It has a token", "It has more TVL"], "At Stage 2 the code, not a council, has the final word, with long exit windows for upgrades."],
      ["Who sequences a based rollup?", ["L1 block proposers", "A single company", "A multisig", "Light clients"], "Sequencing is delegated to the base layer's proposers."],
      ["What's the main risk of a single centralized sequencer?", ["Censorship, downtime and capture of ordering and MEV", "Higher DA costs", "Slower proofs", "Bigger blobs"], "One operator controls who gets in and in what order."]
    ]
  },
  {
    id: "u4l4", t: "Zero-knowledge proofs for engineers", min: 14,
    sum: "SNARKs, STARKs and zkVMs: what a proof guarantees, what it costs, and where it shows up in DeFi.",
    body: `<p>A <b>succinct proof</b> convinces a verifier that a computation was done correctly, in far less time than redoing it. "Zero-knowledge" additionally hides the inputs, but most blockchain uses care about <b>succinctness</b>, not privacy.</p>
<ul><li><b>SNARKs</b> (Groth16, PLONK-family): tiny proofs and cheap onchain verification. Some need a trusted setup.</li>
<li><b>STARKs</b>: no trusted setup, hash-based (plausibly post-quantum), larger proofs. Often wrapped in a SNARK for cheap L1 verification.</li>
<li><b>zkVMs</b> (SP1, RISC Zero and others): write normal Rust, prove its RISC-V execution. This made ZK accessible to application engineers.</li></ul>
<h4>Where you'll use proofs</h4>
<ul><li><b>ZK rollups</b> and verifiable order-book matching (Lighter).</li>
<li><b>ZK light clients</b> for trust-minimized bridges: prove "this header was finalized by the source chain's validators."</li>
<li><b>Coprocessors</b>: prove historical chain data offchain, verify it onchain (e.g. a TWAP over 30 days, or a user's trading volume).</li>
<li><b>Privacy</b>: shielded pools, private order flow.</li></ul>
<h4>Cost model</h4>
<pre><code>prover time ≫ execution time (often 1,000x+ for general zkVMs, improving fast)
verifier time ≈ constant; onchain verification ≈ a few hundred thousand gas (SNARK)</code></pre>`,
    keys: ["Proofs give succinct verification of computation", "SNARKs are small and cheap to verify; STARKs avoid trusted setup", "zkVMs let you prove normal Rust programs", "Uses: rollups, light-client bridges, coprocessors, privacy"],
    src: [
      ["Thaler, Proofs, Arguments, and Zero-Knowledge (free book)", "https://people.cs.georgetown.edu/jthaler/ProofsArgsAndZK.html", "K", "The best rigorous text on proof systems."],
      ["ZK MOOC (Berkeley)", "https://zk-learning.org/", "K", "Free lecture series from basics to modern SNARKs."],
      ["SP1 docs (Succinct)", "https://docs.succinct.xyz/", "D", "Prove Rust programs with a RISC-V zkVM."],
      ["RISC Zero docs", "https://dev.risczero.com/", "D", "Another zkVM, with Ethereum verification contracts."]
    ],
    build: "With SP1 or RISC Zero, prove a Rust program that computes the Merkle root of 1,000 balances, then verify the proof in a Foundry test on a local chain. Record prover time and verification gas.",
    quiz: [
      ["Which property matters most for ZK rollups?", ["Succinctness: verification is far cheaper than re-execution", "Hiding all inputs", "Quantum resistance", "Small source code"], "Rollups use proofs mainly to compress verification, not for privacy."],
      ["What's a key difference between STARKs and Groth16 SNARKs?", ["STARKs need no trusted setup but have larger proofs", "STARKs are smaller", "SNARKs are hash-based", "STARKs can't be verified onchain"], "STARKs are transparent and hash-based. Groth16 has tiny proofs but a circuit-specific trusted setup."],
      ["How does a ZK light-client bridge reduce trust?", ["It proves the source chain's consensus finalized a header, instead of trusting a multisig", "It removes the need for any chain", "It encrypts bridge messages", "It speeds up block times"], "The destination verifies a proof of the source chain's consensus rules."]
    ]
  },
  {
    id: "u4l5", t: "Ethereum 2025–2026: Pectra, Fusaka, Glamsterdam", min: 10,
    sum: "What shipped, what's coming, and what each upgrade changes for protocol builders.",
    body: `<p><b>Pectra (May 7, 2025)</b>:</p>
<ul><li><b>EIP-7702</b>: EOAs can delegate to smart-contract code (batching, sponsorship, session keys).</li>
<li><b>EIP-7251</b>: maximum effective balance raised to 2,048 ETH.</li>
<li>Blob target and max doubled (6 and 9).</li></ul>
<p><b>Fusaka (Dec 3, 2025)</b>:</p>
<ul><li><b>PeerDAS</b> (EIP-7594) for data-availability sampling.</li>
<li>Blob-parameter-only forks to keep raising blob throughput.</li>
<li>A gas-limit increase path.</li></ul>
<p><b>Glamsterdam (in testing as of Oct 2026)</b>, with two headliners:</p>
<ul><li><b>ePBS (EIP-7732)</b>: proposer–builder separation moves into the protocol. A payload-timeliness committee attests that the builder revealed the payload on time, which reduces reliance on trusted relays.</li>
<li><b>Block-Level Access Lists (EIP-7928)</b>: enable parallel validation and a path to much higher gas limits (reports cite a 200M gas target).</li></ul>
<p>It was scheduled for the Sepolia testnet on Oct 6, 2026. Mainnet had no date as of early October, with the target in the second half of 2026. Check the latest before you rely on it.</p>
<h4>What it means for you</h4>
<ul><li>Higher gas limits and parallelism mean onchain order books and heavier DeFi become cheaper on L1.</li>
<li>ePBS changes the MEV supply chain (relays and builders) that your liquidation or arb bots depend on.</li>
<li>7702 means users' EOAs can run smart-account logic. Re-check any code that assumed tx.origin == msg.sender implies an EOA.</li></ul>`,
    keys: ["Pectra: EIP-7702, maxEB 2048, more blobs", "Fusaka: PeerDAS (Dec 2025)", "Glamsterdam: ePBS (7732) + BALs (7928), testnet Oct 2026", "Re-check EOA assumptions after 7702"],
    src: [
      ["Ethereum roadmap", "https://ethereum.org/roadmap/", "K", "Official overview of upgrades."],
      ["EIP-7732: Enshrined PBS", "https://eips.ethereum.org/EIPS/eip-7732", "D", "ePBS specification."],
      ["EIP-7702: Set EOA account code", "https://eips.ethereum.org/EIPS/eip-7702", "D", "Smart-account features for EOAs."],
      ["The Defiant: Glamsterdam final devnet and 200M gas target", "https://thedefiant.io/news/blockchains/ethereum-glamsterdam-final-devnet-200m-gas-limit-target", "N", "2026 status report (check for updates)."],
      ["Kiln: Glamsterdam explained", "https://www.kiln.fi/post/glamsterdam-ethereums-next-hard-fork-explained", "N", "A staking-operator view of the fork."]
    ],
    build: "Use Foundry's 7702 cheatcodes (or a 7702-capable devnet) to give an EOA batch-execution code, then batch an approve and a swap into one transaction. Write a test showing why an onlyEOA modifier based on tx.origin no longer means what it used to.",
    quiz: [
      ["What does EIP-7702 let EOAs do?", ["Delegate to smart-contract code for features like batching and sponsorship", "Stake 2,048 ETH", "Post blobs", "Run validators"], "EOAs can set a delegation to contract code, getting smart-account features without moving funds."],
      ["Which Glamsterdam EIP moves proposer–builder separation into the protocol?", ["EIP-7732 (ePBS)", "EIP-4844", "EIP-1559", "EIP-7251"], "ePBS enshrines the builder–proposer relationship and reduces reliance on relays."],
      ["What did Fusaka ship for data availability?", ["PeerDAS (EIP-7594)", "Account abstraction", "Proof of work", "The Merge"], "PeerDAS lets nodes sample blob data, enabling further blob scaling."]
    ]
  }
  ]
});
