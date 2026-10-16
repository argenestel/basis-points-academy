window.BP_UNITS.push({
  id: "u5", t: "Smart contract engineering", tag: "Technology",
  d: "Foundry, token standards, upgradeability and admin keys, account abstraction and oracles.",
  lessons: [
  {
    id: "u5l1", t: "Foundry: test like an attacker", min: 12,
    sum: "Unit tests, fuzzing, invariants and mainnet-fork tests. The workflow every serious DeFi team uses.",
    body: `<p><b>Foundry</b> (forge, cast, anvil, chisel) lets you write tests in Solidity, run them fast, and fork mainnet state locally.</p>
<ul><li><b>Unit tests</b>: one function, one expectation.</li>
<li><b>Fuzz tests</b>: forge generates random inputs for any test with parameters. Use bound() to keep inputs realistic.</li>
<li><b>Invariant tests</b>: define properties that must always hold (total supply equals the sum of balances, the pool is never insolvent). Forge then calls random sequences of functions through a handler contract, trying to break them.</li>
<li><b>Fork tests</b>: vm.createSelectFork(rpcUrl, block) gives you real Aave, Uniswap and Chainlink state to integrate and attack.</li></ul>
<pre><code>function invariant_solvent() public {
    assertGe(token.balanceOf(address(pool)), pool.totalOwedToLPs());
}
function testFuzz_swapNeverGivesFreeMoney(uint96 amtIn) public {
    amtIn = uint96(bound(amtIn, 1e6, 1e24));
    uint out = pool.swap(amtIn);
    assertLe(out * pool.price(), amtIn * 1e18); // no free value
}</code></pre>
<p>Mindset: write the invariant before the feature. If you can't state what must never happen, you can't secure it.</p>`,
    keys: ["Fuzz with bounded inputs", "Invariants + handlers = stateful fuzzing", "Fork mainnet to test real integrations", "State invariants before writing features"],
    src: [
      ["Foundry", "https://www.getfoundry.sh/", "D", "Docs for forge, cast, anvil and chisel."],
      ["Foundry repo", "https://github.com/foundry-rs/foundry", "C", "Source and examples."],
      ["Cyfrin Updraft courses", "https://updraft.cyfrin.io/courses", "K", "Free Solidity, Foundry and security courses."],
      ["Solidity docs", "https://docs.soliditylang.org/", "D", "The language reference."]
    ],
    build: "Write a minimal ERC-4626 vault and an invariant test suite with a handler: totalAssets >= the sum of redeemable assets; deposit followed by redeem never returns more than deposited (minus rounding). Run 10,000 invariant runs.",
    quiz: [
      ["What does an invariant test do that a fuzz test doesn't?", ["It calls random sequences of functions and checks properties after each", "It only tests one function with random inputs", "It deploys to mainnet", "It checks gas usage"], "Invariant testing is stateful: it explores sequences of calls."],
      ["Why use bound() in fuzz tests?", ["To keep random inputs in realistic ranges so tests explore meaningful states", "To make tests slower", "To skip assertions", "To reduce coverage"], "Unbounded inputs mostly revert. Bounding focuses the fuzzer."],
      ["What does vm.createSelectFork give you?", ["Local execution against real chain state at a chosen block", "A new testnet", "A gas refund", "A deployed contract on mainnet"], "Fork tests let you integrate with and attack live protocols safely."]
    ]
  },
  {
    id: "u5l2", t: "Tokens and approvals", min: 12,
    sum: "ERC-20 quirks, permits, Permit2, ERC-4626 vaults, and why unlimited approvals keep getting drained.",
    body: `<p><b>ERC-20</b> looks simple, but real tokens break assumptions:</p>
<ul><li>Fee-on-transfer and rebasing tokens.</li>
<li>Tokens that don't return a bool (old USDT): use SafeERC20.</li>
<li>Decimals other than 18 (USDC has 6).</li>
<li>Blocklists and pausable transfers.</li>
<li>Hooks (ERC-777) that enable reentrancy.</li></ul>
<p><b>Approvals</b> are standing permissions. <b>EIP-2612 permit</b> lets a user approve with an offchain signature. <b>Permit2</b> (Uniswap) centralizes approvals with expiries and per-transaction signatures. Unlimited approvals to a buggy contract are a classic drain vector: in January 2026 an aggregator with an arbitrary-call bug (SwapNet, about $13M) let an attacker pull funds from every wallet that had approved it.</p>
<h4>ERC-4626 vaults</h4>
<p>This is the standard interface for yield-bearing vaults: deposit and withdraw assets, mint and redeem shares, and convertToShares/convertToAssets. Watch for the <b>inflation (donation) attack</b>. The first depositor mints 1 wei of shares, then donates assets to inflate the share price, so the next depositor's shares round down to 0. Mitigate with virtual shares or offsets (OpenZeppelin), dead shares, or a minimum first deposit.</p>
<pre><code>shares = assets * (totalSupply + 10**offset) / (totalAssets + 1)   // virtual offset
always round in the vault's favor: down on deposit and redeem, up on mint and withdraw</code></pre>`,
    keys: ["Never assume standard ERC-20 behavior; use SafeERC20", "Approvals are standing risk; prefer Permit2 and expiries", "ERC-4626 is the vault interface", "Round in the protocol's favor; defend against inflation attacks"],
    src: [
      ["ERC-20", "https://eips.ethereum.org/EIPS/eip-20", "D", "The token standard."],
      ["EIP-2612: permit", "https://eips.ethereum.org/EIPS/eip-2612", "D", "Gasless approvals with signatures."],
      ["Permit2", "https://github.com/Uniswap/permit2", "C", "Signature-based approval manager with expiries."],
      ["ERC-4626: Tokenized Vaults", "https://eips.ethereum.org/EIPS/eip-4626", "D", "The vault interface standard."],
      ["OpenZeppelin Contracts", "https://github.com/OpenZeppelin/openzeppelin-contracts", "C", "Reference ERC-20, ERC-4626 (with virtual offset) and SafeERC20."]
    ],
    build: "Reproduce the ERC-4626 inflation attack against a naive vault in Foundry, then fix it with OpenZeppelin's decimals offset and show that the attack becomes unprofitable.",
    quiz: [
      ["Why use SafeERC20 instead of calling transfer directly?", ["Some tokens don't return a bool or revert inconsistently", "It's cheaper", "It encrypts transfers", "It's required by EIP-1559"], "SafeERC20 normalizes non-standard return behavior."],
      ["In the ERC-4626 inflation attack, what does the attacker do after minting tiny shares?", ["Donates assets directly to the vault to inflate the share price", "Calls selfdestruct", "Front-runs the oracle", "Votes in governance"], "The donation makes the next depositor's shares round down to near zero."],
      ["Which way should a vault round when computing shares minted on deposit?", ["Down, in the vault's favor", "Up, in the user's favor", "To the nearest integer", "It doesn't matter"], "Rounding against the user prevents value leaking out of the vault through rounding."]
    ]
  },
  {
    id: "u5l3", t: "Upgradeability, access control and admin keys", min: 12,
    sum: "Proxies, timelocks and multisigs. The 2025–26 mega-hacks were mostly key and ops failures, not math bugs.",
    body: `<p><b>Proxies</b> separate storage (proxy) from logic (implementation):</p>
<ul><li><b>Transparent proxy</b>: the admin's calls go to the proxy, everyone else's go to the logic.</li>
<li><b>UUPS</b>: the upgrade function lives in the implementation. Cheaper, but a bad upgrade can brick the contract.</li>
<li><b>Beacon</b>: many proxies share one upgrade pointer.</li>
<li><b>Diamond</b>: many facets.</li></ul>
<p>Storage-layout collisions and uninitialized implementations are classic bugs. Use ERC-7201 namespaced storage and _disableInitializers().</p>
<h4>Access control is your real attack surface</h4>
<ul><li><b>Bybit (Feb 2025, about $1.5B)</b>: attackers compromised the Safe wallet UI that signers used, so signers approved a malicious transaction.</li>
<li><b>Drift (Apr 1, 2026, about $285–295M)</b>: privileged admin access was gained through long-running social engineering, according to reports attributing it to DPRK-linked actors. Drift later rebuilt and rebranded as Velocity.</li>
<li><b>Step Finance (Jan 2026, about $27M)</b>: treasury keys compromised.</li></ul>
<h4>Controls that actually help</h4>
<ul><li>Timelocks on upgrades and parameter changes (users can exit before a change lands).</li>
<li>Multisigs with independent signers on hardware wallets who verify calldata themselves.</li>
<li>Role separation (pauser ≠ upgrader ≠ treasury).</li>
<li>Rate limits and caps on outflows.</li>
<li>Monitoring with automatic pause.</li>
<li>Minimal admin powers, then removing them (immutability) once mature.</li></ul>`,
    keys: ["Proxies: transparent, UUPS, beacon; watch storage layout", "Admin keys are the biggest real-world risk", "Timelocks + independent signers + rate limits", "Aim to remove admin powers over time"],
    src: [
      ["OpenZeppelin Contracts", "https://github.com/OpenZeppelin/openzeppelin-contracts", "C", "Proxy, AccessControl, TimelockController implementations."],
      ["Safe docs", "https://docs.safe.global/", "D", "Multisig smart accounts; transaction verification."],
      ["Trail of Bits: Building Secure Contracts", "https://secure-contracts.com/", "K", "Upgradeability pitfalls and secure development guidelines."],
      ["The Defiant: Drift rebrands to Velocity after exploit", "https://thedefiant.io/news/defi/drift-protocol-rebrands-to-velocity-dex-ahead-of-relaunch", "N", "2026 post-exploit rebuild."]
    ],
    build: "Deploy a UUPS-upgradeable contract behind an OpenZeppelin TimelockController owned by a 2-of-3 Safe on a local fork. Write a script that decodes and prints the calldata of a pending upgrade so signers can verify it independently of any UI.",
    quiz: [
      ["What was the root cause of the 2025 Bybit hack?", ["Signers were shown a manipulated transaction through a compromised wallet UI", "An integer overflow in Uniswap", "A 51% attack on Ethereum", "An oracle manipulation"], "The signers approved a malicious transaction. It was a key and ops failure, not a contract math bug."],
      ["Why put upgrades behind a timelock?", ["Users get time to see a change and exit before it executes", "It makes upgrades cheaper", "It hides upgrades from attackers", "It's required by ERC-20"], "Timelocks turn instant admin power into a visible, exit-able event."],
      ["What does _disableInitializers() in an implementation's constructor prevent?", ["Someone initializing the implementation contract directly and taking control", "Gas refunds", "Proxy upgrades", "Token transfers"], "Uninitialized implementations have been hijacked in the past."]
    ]
  },
  {
    id: "u5l4", t: "Account abstraction: 4337 and 7702", min: 10,
    sum: "Smart accounts, paymasters, session keys and batched calls: UX primitives you can build into your protocol.",
    body: `<p><b>ERC-4337</b> brings smart-contract wallets without a consensus change:</p>
<ul><li>Users sign <b>UserOperations</b>. <b>Bundlers</b> package them and send them to the <b>EntryPoint</b> contract.</li>
<li>The EntryPoint calls the account's validation logic (any signature scheme: passkeys, multisig, session keys).</li>
<li><b>Paymasters</b> can sponsor gas or accept gas payment in ERC-20s.</li></ul>
<p><b>EIP-7702 (Pectra)</b> lets an existing EOA delegate to contract code. Users keep their address but gain batching, sponsorship and scoped permissions.</p>
<h4>For protocol builders</h4>
<ul><li><b>Session keys</b>: let a trading UI place orders without a wallet popup each time, with limits on market, size and expiry. This is how onchain perps approach CEX-level UX. Hyperliquid's "API wallets" (agent keys) are the same idea natively.</li>
<li><b>Batching</b>: approve + deposit + open position in one click.</li>
<li><b>Sponsored onboarding</b>: pay the first transactions' gas so users never need ETH.</li>
<li><b>Security</b>: don't use tx.origin, assume msg.sender could be a contract, and be careful with signature checks (support EIP-1271 for contract signatures).</li></ul>`,
    keys: ["4337: UserOps, bundlers, EntryPoint, paymasters", "7702: EOAs gain smart-account code", "Session keys = CEX-like UX for onchain trading", "Support EIP-1271; never rely on tx.origin"],
    src: [
      ["ERC-4337", "https://eips.ethereum.org/EIPS/eip-4337", "D", "Account abstraction via an alt mempool."],
      ["EIP-7702", "https://eips.ethereum.org/EIPS/eip-7702", "D", "EOA code delegation."],
      ["Hyperliquid API docs", "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api", "D", "API wallets: scoped trading keys done natively."]
    ],
    build: "Build a session-key module: a smart account that lets a secondary key call only placeOrder() on one market, with a notional limit and a 24-hour expiry. Prove with tests that it can't withdraw funds.",
    quiz: [
      ["What does a paymaster do in ERC-4337?", ["Sponsors gas or accepts ERC-20s for gas", "Mines blocks", "Signs blocks", "Acts as an oracle"], "Paymasters remove the 'you need ETH first' onboarding problem."],
      ["Why do session keys matter for onchain trading?", ["They allow fast order placement without a wallet prompt, within strict limits", "They make trades private", "They remove fees", "They replace oracles"], "Scoped keys give CEX-like speed while limiting what a compromised key can do."],
      ["Your contract checks signatures. What should you support for smart-account users?", ["EIP-1271 contract signature validation", "Only ecrecover", "tx.origin checks", "Proof of work"], "Smart accounts sign via isValidSignature (EIP-1271), not raw ECDSA."]
    ]
  },
  {
    id: "u5l5", t: "Oracles and price manipulation", min: 13,
    sum: "Push vs pull oracles, TWAPs, and how Mango Markets lost $100M+ to a manipulated price.",
    body: `<p>Your protocol is only as safe as the price it believes.</p>
<ul><li><b>Push oracles</b> (Chainlink Data Feeds): a decentralized oracle network posts updates on a deviation threshold or heartbeat. Simple to read, but they can lag in fast markets.</li>
<li><b>Pull oracles</b> (Pyth, Chainlink Data Streams): signed prices are fetched offchain and verified onchain in the same transaction. They are fresher and cheaper, but you must check staleness and confidence intervals.</li>
<li><b>DEX TWAPs</b> (Uniswap v3 oracle): manipulation-resistant over long windows, lagging over short ones, and cheap to manipulate on thin pools or on PoS chains where a proposer controls consecutive blocks.</li>
<li><b>Validator-posted oracles</b> (Hyperliquid): validators submit external exchange prices and the protocol takes a weighted median.</li></ul>
<h4>Mango Markets (Oct 2022)</h4>
<p>The attacker pumped MNGO's price on the thin markets Mango's oracle read from. That inflated the value of the attacker's own perp position used as collateral, so they could borrow out more than $100M of the protocol's assets. Lesson: <b>never let collateral value come from a market the attacker can cheaply move</b>.</p>
<h4>Checklist</h4>
<pre><code>require(block.timestamp - updatedAt <= maxStaleness);
require(price > 0 && conf / price <= maxConfidenceRatio);
use min(oracleA, oracleB) for collateral and max(...) for debt when in doubt
cap borrowable amount by onchain liquidity (depth), not just oracle price
circuit breaker if |price change| > X% within one update</code></pre>`,
    keys: ["Push vs pull oracles; always check staleness", "TWAPs resist short manipulation but lag", "Collateral must not be priced from manipulable markets", "Cap exposure by real liquidity"],
    src: [
      ["Chainlink Data Feeds docs", "https://docs.chain.link/data-feeds", "D", "Push oracle feeds, heartbeat and deviation parameters."],
      ["Pyth docs", "https://docs.pyth.network/", "D", "Pull oracle with confidence intervals."],
      ["rekt: Mango Markets", "https://rekt.news/mango-markets-rekt", "R", "The oracle-manipulation post-mortem."],
      ["Hyperliquid docs: oracle", "https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/oracle", "D", "Validator-published weighted-median oracle."]
    ],
    build: "On a mainnet fork, build a toy lending pool that prices collateral from a thin Uniswap pool's spot price, then write the exploit that drains it with a flash loan. Fix it with a Chainlink feed plus a liquidity-based borrow cap and show that the exploit fails.",
    quiz: [
      ["What made Mango Markets exploitable?", ["Collateral was priced from thin markets the attacker could cheaply pump", "A reentrancy bug", "A leaked private key", "A bridge failure"], "The attacker raised the oracle price of their own collateral and borrowed against it."],
      ["What must you check when consuming a pull-oracle price like Pyth?", ["Staleness and the confidence interval", "Only that the price is non-zero", "The token's name", "Gas price"], "Pull oracles let anyone post a valid-but-old price unless you enforce freshness."],
      ["A short-window TWAP on a low-liquidity pool is…", ["Cheap to manipulate", "Impossible to manipulate", "Always the best oracle", "Equivalent to Chainlink"], "TWAP security scales with liquidity and window length."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u6", t: "AMMs and DEX design", tag: "DeFi",
  d: "Constant-product math, LVR, concentrated liquidity, StableSwap and CFMM theory, Uniswap v4 hooks, aggregators and intents.",
  lessons: [
  {
    id: "u6l1", t: "Constant product: x · y = k", min: 12,
    sum: "The swap formula, price impact and fees, implemented in a few lines.",
    body: `<p>A constant-product AMM holds reserves x and y and allows any trade that keeps <b>x · y = k</b> (after fees). The marginal price is y/x.</p>
<pre><code>// swap dx of X for Y, fee f (0.003 = 0.30%)
dx_eff = dx * (1 - f)
dy     = y * dx_eff / (x + dx_eff)
x' = x + dx ;  y' = y - dy           // k grows slightly from fees

// Solidity (Uniswap v2 style, fee 30 bps)
uint amountInWithFee = amountIn * 997;
uint amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);</code></pre>
<p><b>Price impact</b> grows with trade size relative to reserves. With a trade of fraction p of reserve x, the execution price is about (1+p)× worse than the marginal price, so a trade equal to 1% of the pool pays about 1% impact.</p>
<p><b>LP shares</b>: the first deposit mints sqrt(x·y) shares. Later deposits mint proportionally. Fees stay in the pool, so each share claims a growing k.</p>
<h4>Why it works</h4>
<p>It always quotes a price, for any size, with no order book or market makers. Arbitrageurs keep the price aligned with other markets. The cost of that convenience is that the LP always trades at a stale price against better-informed flow (next lesson).</p>`,
    keys: ["x·y=k; marginal price = y/x", "dy = y·dx_eff/(x+dx_eff)", "Impact grows with size/reserves", "Arbitrage keeps price aligned with external markets"],
    src: [
      ["Uniswap v2 whitepaper", "https://app.uniswap.org/whitepaper.pdf", "P", "Constant product, flash swaps, TWAP oracle."],
      ["RareSkills Uniswap v2 book", "https://rareskills.io/uniswap-v2-book", "K", "Line-by-line walkthrough of v2 core."],
      ["Uniswap v2-core", "https://github.com/Uniswap/v2-core", "C", "About 400 lines. Read the whole thing."],
      ["Angeris et al., An analysis of Uniswap markets", "https://arxiv.org/abs/1911.03380", "P", "Formal analysis of CPMM arbitrage and price tracking."]
    ],
    build: "Implement a Uniswap v2-style pair from scratch in Solidity (mint, burn, swap, with the 0.3% fee and the K check). Fuzz-test that k never decreases across swaps.",
    quiz: [
      ["Pool: 100 ETH and 300,000 USDC, no fee. Roughly how much USDC do you get for 1 ETH?", ["About 2,970 USDC", "3,000 USDC exactly", "About 3,030 USDC", "About 2,700 USDC"], "dy = 300000·1/(100+1) ≈ 2,970.3, about 1% impact for a 1%-of-pool trade."],
      ["Where do swap fees go in Uniswap v2?", ["They stay in the reserves, growing each LP share's claim", "They are burned", "They go to the token issuer", "They pay validators"], "Fees increase k, so LP shares redeem for more over time."],
      ["What keeps an AMM's price in line with the global market?", ["Arbitrageurs trading against it", "An oracle that resets the price", "Governance", "The LPs adjusting quotes"], "Any price gap is an arb opportunity, and the arb's trade closes it."]
    ]
  },
  {
    id: "u6l2", t: "Impermanent loss and LVR", min: 14,
    sum: "Why passive LPs bleed to arbitrageurs, quantified. The most important paper for AMM designers.",
    body: `<p><b>Impermanent loss (IL)</b> compares an LP position with simply holding the tokens. For a price ratio change r = P₁/P₀ in a 50/50 CPMM:</p>
<pre><code>IL(r) = 2·sqrt(r)/(1 + r) − 1
r = 2 (price doubles)  →  IL ≈ −5.7%
r = 4                  →  IL = −20%</code></pre>
<p>IL depends only on where the price ends, so it misses the path. <b>Loss-versus-rebalancing (LVR)</b>, from Milionis, Moallemi, Roughgarden and Zhang, compares the LP with a strategy that holds the same portfolio but rebalances at <b>market prices</b>. The difference is exactly what arbitrageurs extract by trading against stale AMM quotes.</p>
<pre><code>For x·y=k:   LVR rate ≈ (σ² / 8) · V   per unit time
σ = volatility, V = pool value
e.g. σ = 80%/yr, V = $10M  →  LVR ≈ 0.64/8 · 10M = $800k per year</code></pre>
<p>LPs profit only if <b>fees > LVR</b>. That inequality explains:</p>
<ul><li>Why volatile pairs need high fees.</li>
<li>Why LVR scales with σ², so it rises faster than volatility.</li>
<li>Why designs that <b>recapture arbitrage</b> matter: dynamic fees, auction-managed AMMs, MEV taxes, hooks that auction first trade rights.</li>
<li>Why shorter block times reduce LVR, since arbs get less stale prices.</li></ul>`,
    keys: ["IL(r) = 2√r/(1+r) − 1", "LVR = what arbs extract from stale quotes", "CPMM LVR ≈ σ²/8 × pool value per unit time", "LPs win only if fees > LVR"],
    src: [
      ["Milionis et al., Automated Market Making and Loss-Versus-Rebalancing", "https://arxiv.org/abs/2208.06046", "P", "Defines LVR and gives closed forms. Required reading."],
      ["Angeris and Chitra, Improved Price Oracles: CFMMs", "https://arxiv.org/abs/2003.10001", "P", "Why arbitrage makes CFMMs good price oracles."],
      ["Paradigm, Priority Is All You Need", "https://www.paradigm.xyz/writing/priority-is-all-you-need", "P", "MEV taxes: letting apps capture their own arbitrage."]
    ],
    build: "Pull a month of ETH/USDC Uniswap v3 pool swaps from Dune or an RPC. Compute realized fees versus estimated LVR (using realized σ) per day, and plot when LPs were net positive.",
    quiz: [
      ["The price quadruples (r = 4). What's the impermanent loss of a 50/50 CPMM LP?", ["−20%", "−5.7%", "−50%", "0%"], "2·√4/(1+4) − 1 = 4/5 − 1 = −20%."],
      ["What does LVR measure?", ["Value lost to arbitrageurs trading against stale AMM prices", "Gas costs", "Token emissions", "Fees earned"], "LVR compares the LP with rebalancing at true market prices. The gap is the arb's profit."],
      ["If volatility doubles, what happens to LVR?", ["It roughly quadruples (∝ σ²)", "It doubles", "It halves", "It stays the same"], "LVR scales with variance."]
    ]
  },
  {
    id: "u6l3", t: "Concentrated liquidity (Uniswap v3)", min: 16,
    sum: "Ticks, sqrtPriceX96 and range positions: a liquidity provider becomes a range-bound market maker.",
    body: `<p>v3 lets LPs provide liquidity only within a price range [Pa, Pb]. Inside the range the position behaves like a much larger x·y=k pool, using <b>virtual reserves</b>. Outside it the position is 100% one asset and earns nothing.</p>
<pre><code>price p = 1.0001^tick        (tick spacing set per fee tier)
sqrtPriceX96 = sqrt(p) · 2^96  (fixed-point Q64.96)
L = liquidity; within range:
  Δx = L · (1/√P_current − 1/√Pb)
  Δy = L · (√P_current − √Pa)
swaps walk tick by tick; crossing an initialized tick changes active L</code></pre>
<p><b>Capital efficiency</b> rises sharply for narrow ranges, and so do LVR and IL per dollar. Concentrated LPs are <b>active market makers</b>. Many lose money net of LVR, while sophisticated rebalancers or vault managers (and JIT liquidity providers who add liquidity just for one big swap) capture fees.</p>
<h4>Implementation notes</h4>
<ul><li>Fee growth is tracked globally and "outside" each tick, so positions compute fees owed without loops.</li>
<li>TickBitmap finds the next initialized tick efficiently.</li>
<li>All math is fixed-point with careful rounding: mulDiv, rounding up for amounts owed to the pool.</li></ul>`,
    keys: ["Ranges create virtual reserves", "p = 1.0001^tick; sqrtPriceX96 fixed point", "Higher efficiency means higher IL and LVR per dollar", "Fee growth inside and outside ticks avoids loops"],
    src: [
      ["Uniswap v3 whitepaper", "https://app.uniswap.org/whitepaper-v3.pdf", "P", "Concentrated liquidity, ticks and the oracle."],
      ["Uniswap V3 Development Book", "https://uniswapv3book.com/", "K", "Build v3 from scratch, milestone by milestone."],
      ["Uniswap v3-core", "https://github.com/Uniswap/v3-core", "C", "Reference implementation: TickMath, SqrtPriceMath, SwapMath."]
    ],
    build: "Work through the Uniswap V3 Development Book through milestone 3 (cross-tick swaps). Then write a Python script that converts between tick, price and sqrtPriceX96 and computes token amounts for a given L and range.",
    quiz: [
      ["What is the price at tick 0?", ["1.0", "0", "2^96", "Undefined"], "p = 1.0001^0 = 1."],
      ["What does a v3 position hold when the price is above its range?", ["100% of the quote token (token1)", "100% of token0", "50/50", "Nothing"], "As the price rises through the range the LP sells token0 for token1, so above the range it is all token1."],
      ["Why are narrow ranges riskier for passive LPs?", ["Higher effective liquidity means more LVR and IL per dollar, and the price exits the range more often", "They earn no fees", "They can't be withdrawn", "They are only for stablecoins"], "Concentration magnifies both fee income and adverse selection."]
    ]
  },
  {
    id: "u6l4", t: "StableSwap, weighted pools and CFMM theory", min: 12,
    sum: "Curve's invariant for pegged assets, Balancer's weighted pools, and the general theory of trading functions.",
    body: `<p><b>Curve StableSwap</b> blends constant-sum (x + y = const, zero slippage) and constant-product. An amplification coefficient <b>A</b> controls how flat the curve is near the peg:</p>
<pre><code>A·nⁿ·Σxᵢ + D = A·D·nⁿ + D^(n+1) / (nⁿ·Πxᵢ)
high A → near-zero slippage around the peg; curve steepens away from it</code></pre>
<p>It is ideal for USDC/USDT or ETH/stETH, but a depeg drains the pool of the good asset while LPs end up holding the bad one.</p>
<p><b>Balancer weighted pools</b> generalize to Π xᵢ^wᵢ = k, for example 80/20 pools that keep more exposure to one token. <b>Liquidity bootstrapping pools (LBPs)</b> shift weights over time for token launches (Unit 13).</p>
<h4>CFMM theory</h4>
<p>Angeris and Chitra show that any trading function with certain convexity properties gives a market where arbitrage keeps the price accurate. You can design a curve for a target payoff, and replicate many option-like payoffs with the right CFMM. This is the toolkit behind custom curves in Uniswap v4 hooks and in specialized AMMs.</p>
<p><b>Rounding risk</b>: in November 2025 Balancer v2's composable stable pools lost about $100M+ to an exploit built on precision and rounding errors in the invariant math, repeated many times in batched swaps. Invariant code needs adversarial, high-iteration fuzzing.</p>`,
    keys: ["StableSwap: amplified curve flat near the peg", "Weighted pools: Π xᵢ^wᵢ = k", "CFMM theory: the curve determines the payoff", "Invariant rounding bugs compound across batched swaps"],
    src: [
      ["Curve StableSwap paper", "https://classic.curve.finance/files/stableswap-paper.pdf", "P", "The original StableSwap invariant."],
      ["Curve contracts", "https://github.com/curvefi/curve-contract", "C", "Vyper reference implementation."],
      ["Balancer docs", "https://docs.balancer.fi/", "D", "Weighted, stable and boosted pools; LBPs."],
      ["Angeris and Chitra, Improved Price Oracles: CFMMs", "https://arxiv.org/abs/2003.10001", "P", "General conditions for CFMMs to track prices."]
    ],
    build: "Implement StableSwap's get_D and get_y with Newton's method in Python. Plot slippage for a $1M trade at A = 10, 100 and 1000, then simulate a depeg to 0.95 and show what LPs end up holding.",
    quiz: [
      ["What does a high amplification A in StableSwap do?", ["Flattens the curve near the peg for very low slippage", "Raises fees", "Makes the pool constant-product", "Removes the peg"], "High A behaves like constant-sum near balance."],
      ["During a depeg in a StableSwap pool, what do LPs end up holding?", ["Mostly the depegged asset", "Mostly the healthy asset", "Equal amounts always", "Only the LP token's governance rights"], "Arbs sell the cheap asset into the pool and remove the good one."],
      ["A Balancer 80/20 pool keeps…", ["80% of its value in one token and 20% in the other", "80% fees", "20% slippage", "80% of LPs locked"], "Weights set the value share of each token."]
    ]
  },
  {
    id: "u6l5", t: "Uniswap v4: hooks, singleton and the fee switch", min: 13,
    sum: "Programmable pools, flash accounting, and how the UNIfication vote turned on protocol fees.",
    body: `<p><b>Uniswap v4</b> (live since January 2025) changed the architecture:</p>
<ul><li><b>Singleton PoolManager</b>: all pools live in one contract, so multi-hop swaps don't move tokens between contracts.</li>
<li><b>Flash accounting</b>: balances are tracked as deltas in <b>transient storage</b> (EIP-1153) and settled at the end of an unlock() callback.</li>
<li><b>Hooks</b>: each pool can attach a contract called at lifecycle points (before/after initialize, add/remove liquidity, swap, donate). Permissions are encoded in the hook's address bits.</li>
<li><b>Dynamic fees</b> and native ETH.</li></ul>
<h4>What people build with hooks</h4>
<ul><li>Dynamic fees driven by volatility (fighting LVR).</li>
<li>Limit orders and TWAMM.</li>
<li>MEV-capturing auctions for the first trade in each block.</li>
<li>Oracle hooks.</li>
<li>KYC-gated pools for RWAs.</li>
<li>Custom curves via beforeSwap return deltas.</li>
<li>Launch mechanics (anti-snipe, fair launches).</li></ul>
<p>Hooks are new attack surface: a malicious or buggy hook can trap liquidity or skew swaps.</p>
<h4>Value accrual</h4>
<p>After years of debate, Uniswap governance passed <b>UNIfication</b> in December 2025. It turned on protocol fees (on v2 pools, 0.05 percentage points of the 0.30% fee; a partial take on major v3 pools) that fund UNI buybacks and burns, and burned 100M UNI from the treasury. This is the "fee switch" debate from Unit 13, resolved in practice.</p>`,
    keys: ["Singleton + flash accounting (transient storage)", "Hooks = programmable pool lifecycle", "Use hooks to fight LVR and capture MEV", "UNIfication (Dec 2025) turned on protocol fees and burns"],
    src: [
      ["Uniswap v4 whitepaper", "https://app.uniswap.org/whitepaper-v4.pdf", "P", "Hooks, singleton and flash accounting."],
      ["Uniswap v4-core", "https://github.com/Uniswap/v4-core", "C", "PoolManager and libraries."],
      ["Uniswap v4-periphery", "https://github.com/Uniswap/v4-periphery", "C", "Position manager and routers."],
      ["v4 hook template", "https://github.com/Uniswap/v4-template", "C", "Start a hook project with Foundry."],
      ["Uniswap docs", "https://developers.uniswap.org/docs", "D", "Official developer documentation."],
      ["Uniswap governance forum", "https://gov.uniswap.org/", "D", "Fee-switch and UNIfication discussions."]
    ],
    build: "Using v4-template, write a dynamic-fee hook that sets the fee from an EWMA of recent absolute price changes, so the fee rises with volatility. Backtest it against fixed 5 and 30 bps fees on historical swaps.",
    quiz: [
      ["What does flash accounting in v4 rely on?", ["Transient storage (EIP-1153) to track deltas until settlement", "Flash loans from Aave", "Optimistic rollups", "Off-chain signatures"], "Deltas live in transient storage during unlock and must net to zero by the end."],
      ["How does v4 know which hook functions to call?", ["Permission flags encoded in the hook contract's address", "A registry contract", "Governance votes", "The token's metadata"], "Hook addresses are mined so their bits encode which callbacks are enabled."],
      ["What did Uniswap's UNIfication proposal (Dec 2025) do?", ["Turned on protocol fees that fund UNI buybacks and burns", "Launched Uniswap v1", "Moved Uniswap to Solana", "Removed LP fees entirely"], "It activated the long-debated fee switch and tied it to burns."]
    ]
  },
  {
    id: "u6l6", t: "Aggregators, RFQ and intents", min: 11,
    sum: "Users say what they want; solvers compete to deliver it. The architecture that is replacing direct pool routing.",
    body: `<p>Few users trade directly against one pool:</p>
<ul><li><b>Aggregators</b> (1inch, 0x, Jupiter on Solana) split orders across venues to minimize total cost.</li>
<li><b>RFQ</b>: professional market makers sign firm quotes offchain, settled onchain. Liquidity comes without LVR, since the maker updates prices continuously.</li>
<li><b>Intents</b>: users sign the outcome they want (sell 10 ETH for at least X USDC by time T). <b>Solvers</b> compete to fill it from any source: AMMs, their own inventory, CEXs, other users (coincidence of wants).</li></ul>
<h4>Designs to study</h4>
<ul><li><b>CoW Protocol</b>: batch auctions with uniform clearing prices and solver competition, which protects users from MEV.</li>
<li><b>UniswapX</b>: Dutch-auction orders filled by fillers, including cross-chain.</li>
<li><b>ERC-7683</b>: a common cross-chain intent order format (Across and Uniswap). The Ethereum Foundation's Open Intents Framework builds on it.</li></ul>
<h4>Economics</h4>
<p>Order flow becomes a product. Wallets and apps route it to whoever pays best (payment for order flow, OFA rebates). Ask who captures the surplus: the user, the solver, the app, or the validator.</p>`,
    keys: ["Aggregators split; RFQ uses pro quotes; intents state outcomes", "Solvers compete across all liquidity sources", "Batch auctions give uniform prices and MEV protection", "Order flow is valuable; know who captures surplus"],
    src: [
      ["CoW Protocol docs", "https://docs.cow.fi/", "D", "Batch auctions and solver competition."],
      ["ERC-7683: Cross Chain Intents", "https://eips.ethereum.org/EIPS/eip-7683", "D", "Standard order format for cross-chain intents."],
      ["Across docs", "https://docs.across.to/", "D", "Intent-based bridging with relayers."],
      ["Budish et al., Frequent Batch Auctions", "https://academic.oup.com/qje/article/130/4/1547/1916146", "P", "Theory behind batch auctions."]
    ],
    build: "Write a toy solver: given 20 signed limit orders (some opposing) and two AMM pools, find coincidences of wants first, route the remainder through the pools, and compute the uniform clearing price and the surplus delivered.",
    quiz: [
      ["What is a 'coincidence of wants' in CoW Protocol?", ["Two users' opposite orders settled directly against each other", "Two solvers agreeing on a price", "An oracle update", "A governance vote"], "Matching opposite orders avoids AMM fees and LVR entirely."],
      ["Why does RFQ liquidity avoid LVR?", ["Makers quote fresh prices per trade, so they aren't picked off on stale quotes", "RFQ has no fees", "RFQ uses x·y=k", "RFQ is always onchain"], "Stale quotes are the source of LVR. RFQ makers update continuously."],
      ["What does ERC-7683 standardize?", ["A cross-chain intent order format and settlement interface", "A token standard", "Validator rewards", "Blob sizes"], "It lets solvers serve many intent protocols with one integration."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u7", t: "Lending and credit", tag: "DeFi",
  d: "Rate curves, health factors and liquidations, isolated markets and curators, Aave v4, and flash loans.",
  lessons: [
  {
    id: "u7l1", t: "Pool lending and interest-rate curves", min: 13,
    sum: "Utilization-driven rates, index accounting and the kinked curve every lending market uses.",
    body: `<p>In pool-based lending (Compound, Aave), suppliers deposit into a shared pool and borrowers draw from it against collateral. Rates are set algorithmically from <b>utilization</b>:</p>
<pre><code>U = totalBorrows / totalSupply
if U ≤ U_opt:  borrowRate = base + slope1 · U / U_opt
else:          borrowRate = base + slope1 + slope2 · (U − U_opt) / (1 − U_opt)
supplyRate = borrowRate · U · (1 − reserveFactor)</code></pre>
<p>The <b>kink</b> at U_opt (often 80–92%) makes rates jump steeply when the pool nears full utilization. That attracts new supply and pushes borrowers to repay, so suppliers can always withdraw. This is the pool's <b>funding-liquidity</b> defense.</p>
<h4>Index accounting (no loops)</h4>
<pre><code>borrowIndex_t = borrowIndex_{t-1} · (1 + rate · Δt)
user debt = scaledDebt · borrowIndex_now
(aTokens / cTokens: balances scale with a liquidity index)</code></pre>
<p>Every user's interest accrues implicitly through one global index updated on each interaction. That's how you scale to millions of positions with O(1) updates.</p>`,
    keys: ["Rates are a function of utilization", "The kink protects withdrawal liquidity", "Supply rate = borrow rate × U × (1 − reserve factor)", "Global indices give O(1) interest accrual"],
    src: [
      ["Compound whitepaper", "https://compound.finance/documents/Compound.Whitepaper.pdf", "P", "The original algorithmic money market."],
      ["Gudgeon et al., DeFi Protocols for Loanable Funds", "https://arxiv.org/abs/2006.13922", "P", "Interest-rate models, utilization and market efficiency."],
      ["Aave docs", "https://aave.com/docs", "D", "Rate strategies, reserves and parameters."],
      ["Aave v3 origin (code)", "https://github.com/aave-dao/aave-v3-origin", "C", "Current Aave v3 codebase."]
    ],
    build: "Implement a kinked rate model and index accounting in Solidity. Fuzz-test that the sum of user debts (scaled × index) always equals total borrows within rounding, across random sequences of borrow, repay and time warps.",
    quiz: [
      ["U = 90%, U_opt = 80%, base = 0, slope1 = 4%, slope2 = 60%. What's the borrow rate?", ["34%", "4%", "64%", "24%"], "4% + 60% × (0.9 − 0.8)/(1 − 0.8) = 4% + 30% = 34%."],
      ["Why do lending pools have a steep slope above the kink?", ["To keep enough liquidity for suppliers to withdraw", "To punish suppliers", "To fund the team", "To lower borrowing demand to zero"], "Expensive borrowing at high U brings in supply and pushes repayments."],
      ["How do protocols accrue interest for millions of users efficiently?", ["Through a global index applied to scaled balances", "By looping over every user each block", "Off-chain spreadsheets", "By minting new tokens per user"], "One index update makes everyone's balance accrue implicitly."]
    ]
  },
  {
    id: "u7l2", t: "Collateral, health factor and liquidations", min: 14,
    sum: "LTV, liquidation thresholds, close factors and bonuses, and what happens when liquidations fail (bad debt).",
    body: `<p>Every borrow is overcollateralized:</p>
<pre><code>health factor HF = Σ (collateral_i × price_i × liquidationThreshold_i) / total debt value
HF < 1  →  liquidatable
max borrow uses LTV (e.g. 80%); liquidation uses LT (e.g. 83%): the gap is a safety buffer
liquidator repays up to closeFactor of debt (Aave v3: 50%, or 100% if HF < 0.95)
and receives collateral worth repaid × (1 + bonus) (e.g. 5%)</code></pre>
<p>Liquidations are a public, permissionless MEV opportunity. Bots monitor HF and race to liquidate, usually with flash loans.</p>
<h4>When liquidations fail</h4>
<ul><li><b>Gas spikes and congestion</b>: on Black Thursday (Mar 12, 2020), MakerDAO keepers failed and auctions cleared at $0 bids, leaving millions in bad debt.</li>
<li><b>Illiquid collateral</b>: the bonus doesn't cover slippage, so nobody liquidates.</li>
<li><b>Oracle lag</b>: the price falls faster than updates arrive.</li>
<li><b>Correlated collateral</b> (LSTs/LRTs vs ETH): looks safe until a depeg.</li></ul>
<p><b>Bad debt</b> (debt > collateral) is socialized to suppliers or covered by a safety module or reserves. Aave froze rsETH markets in April 2026 after stolen rsETH from the KelpDAO bridge exploit was used as collateral to borrow WETH. Bridge risk becomes lending risk.</p>`,
    keys: ["HF = Σ collateral × price × LT / debt", "LTV < LT gives a buffer", "Liquidations are MEV: bonus vs slippage", "Bad debt appears when liquidations can't keep up"],
    src: [
      ["Qin et al., An Empirical Study of DeFi Liquidations", "https://arxiv.org/abs/2106.06389", "P", "Liquidation mechanisms, profits and risks across protocols."],
      ["Aave docs", "https://aave.com/docs", "D", "Health factor, liquidation and E-Mode details."],
      ["rekt: KelpDAO", "https://rekt.news/kelpdao-rekt", "R", "The 2026 bridge exploit that spilled into lending markets."]
    ],
    build: "Write a liquidation bot against a forked Aave v3 market: index borrowers from events, compute HF off-chain, and when HF < 1 execute a flash-loan-funded liquidation that swaps the seized collateral back. Print the profit after gas.",
    quiz: [
      ["$10,000 ETH collateral, LT 83%, $8,500 debt. Is it liquidatable?", ["Yes, HF ≈ 0.976", "No, HF ≈ 1.18", "No, HF = 1", "Only if governance votes"], "HF = 10000 × 0.83 / 8500 ≈ 0.976 < 1."],
      ["Why might nobody liquidate an unhealthy position?", ["The liquidation bonus doesn't cover slippage and gas on illiquid collateral", "Liquidations are illegal", "HF can't drop below 1", "Oracles never update"], "Liquidators act only if profitable. Thin markets break that."],
      ["What happened on MakerDAO's Black Thursday (2020)?", ["Keepers failed during congestion and auctions cleared at $0 bids", "MakerDAO was hacked through a bridge", "DAI rose to $2", "Ethereum switched to PoS"], "Network congestion broke the auction system and left bad debt."]
    ]
  },
  {
    id: "u7l3", t: "Isolated markets, vaults and curators", min: 12,
    sum: "Morpho Blue, Euler v2 and the curator model, and what the 2025 vault blowups taught about leverage stacking.",
    body: `<p>Shared pools mean one bad asset can hurt everyone. The 2024–26 trend is <b>isolated, immutable markets</b> plus <b>curated vaults</b> on top:</p>
<ul><li><b>Morpho Blue</b>: a market is (loan asset, collateral asset, oracle, IRM, LLTV). It is permissionless to create and immutable once deployed, with a tiny core contract. <b>MetaMorpho vaults</b> (ERC-4626) let a curator allocate deposits across markets under caps.</li>
<li><b>Euler v2</b>: modular vaults connected by the Ethereum Vault Connector. Each vault sets its own collateral and risk rules.</li></ul>
<h4>The curator risk layer</h4>
<p>Curators decide which collateral and oracles depositors are exposed to. That is credit underwriting with a DeFi UI. In November 2025 a chain of failures showed what can go wrong. A fund manager at Stream Finance reported losses of about $93M, its xUSD depegged, and vaults and stablecoins that had looped or accepted xUSD as collateral (for example Elixir's deUSD) took losses. Leverage stacked on yield-bearing collateral is fragile.</p>
<h4>Questions to ask any vault</h4>
<ol><li>What collateral is accepted, and what backs it?</li>
<li>Which oracle prices it? Is it hard-coded to $1?</li>
<li>What are the caps and the curator's timelock?</li>
<li>Can I exit when utilization is 100%?</li></ol>`,
    keys: ["Isolated markets contain contagion", "Curators are underwriters; check their choices", "Hard-coded oracles on yield tokens hide risk", "Looping leverage on yield collateral is fragile"],
    src: [
      ["Morpho Blue (code)", "https://github.com/morpho-org/morpho-blue", "C", "A small, immutable lending core. Read it end to end."],
      ["Morpho docs", "https://docs.morpho.org/", "D", "Markets, vaults, curators and the risk framework."],
      ["Euler docs", "https://docs.euler.finance/", "D", "Euler v2 vaults and the EVC."],
      ["Euler Vault Kit", "https://github.com/euler-xyz/euler-vault-kit", "C", "Build your own lending vault."]
    ],
    build: "Read Morpho Blue's Morpho.sol fully. Then deploy a local market (your own token as collateral, USDC as the loan asset, a mock oracle) and write tests covering supply, borrow, liquidation and bad-debt realization.",
    quiz: [
      ["What defines a Morpho Blue market?", ["Loan asset, collateral asset, oracle, interest-rate model and LLTV", "A governance vote", "A Uniswap pool", "A validator set"], "Markets are permissionless tuples that are immutable once created."],
      ["What does a vault curator decide?", ["Which markets and collateral deposits are exposed to, under what caps", "The ETH price", "Block ordering", "Gas fees"], "Curators allocate liquidity, which is effectively credit underwriting."],
      ["Why are hard-coded $1 oracles on yield-bearing stablecoins dangerous?", ["Losses in the underlying don't trigger liquidations until it's too late", "They are too expensive", "They change too often", "They can't be read by contracts"], "The market price can fall while the oracle still says $1."]
    ]
  },
  {
    id: "u7l4", t: "Aave v4 and lending architecture in 2026", min: 9,
    sum: "Hub-and-spoke liquidity: shared capital, per-market risk. Launched on Ethereum in March 2026.",
    body: `<p><b>Aave V4</b> launched on Ethereum mainnet on <b>March 30, 2026</b>, after more than two years of development. Its <b>hub-and-spoke</b> architecture separates where liquidity sits from how it's risk-managed:</p>
<ul><li><b>Hubs</b> hold shared liquidity.</li>
<li><b>Spokes</b> are lending markets with their own collateral lists, risk parameters and liquidation rules, all drawing from the hub's capital.</li></ul>
<p>The launch reportedly started with three hubs (Core, Prime and Plus) and about ten spokes, with conservative launch-day caps. It targets more specialized credit as well: fixed-rate, structured and tokenized-asset-backed lending.</p>
<h4>Why it matters for design</h4>
<p>This is the industry converging. <b>Shared liquidity</b> (capital efficiency, deep markets) combined with <b>isolated risk</b> (one spoke's bad collateral shouldn't sink the hub). Morpho reached a similar place bottom-up (isolated markets + vaults). Aave got there top-down (hub + spokes). If you build a lender, decide where you sit on that spectrum, and how losses in a spoke reach hub depositors, if they can at all.</p>`,
    keys: ["Aave V4 live on Ethereum since March 30, 2026", "Hubs = shared liquidity; spokes = isolated risk", "Convergence: shared capital with isolated risk", "Design how spoke losses can and can't reach hub suppliers"],
    src: [
      ["The Block: Aave V4 launches on Ethereum mainnet", "https://www.theblock.co/post/395617/aave-v4-launches-ethereum-mainnet", "N", "Launch coverage and architecture summary."],
      ["Aave governance forum", "https://governance.aave.com/", "D", "V4 activation proposals and risk-provider analyses."],
      ["LlamaRisk", "https://llamarisk.com/", "D", "Independent risk research on Aave and others."]
    ],
    build: "Draw a hub-and-spoke diagram for a lender you'd build: one hub (USDC), three spokes (blue-chip, LST, RWA). Write the exact rule for how a spoke's bad debt is absorbed (spoke reserve, then spoke-specific suppliers, then hub?) and argue for it.",
    quiz: [
      ["In Aave V4's design, what does a 'spoke' control?", ["Its own collateral, risk parameters and liquidation rules", "The hub's total liquidity", "Ethereum consensus", "Token emissions"], "Spokes define risk and draw liquidity from hubs."],
      ["What's the main benefit of hub-and-spoke?", ["Shared capital efficiency while isolating risk per market", "No oracles needed", "No liquidations needed", "Unlimited leverage"], "Liquidity is pooled, but risk settings are per spoke."],
      ["When did Aave V4 go live on Ethereum mainnet?", ["March 2026", "May 2020", "January 2025", "It hasn't launched"], "It launched March 30, 2026."]
    ]
  },
  {
    id: "u7l5", t: "Flash loans and composability", min: 10,
    sum: "Uncollateralized loans that must be repaid in the same transaction: a tool for arbitrage, refinancing and attacks.",
    body: `<p>A <b>flash loan</b> lends any amount with no collateral, on one condition: it must be repaid (plus a fee) by the end of the same transaction. Otherwise everything reverts.</p>
<pre><code>function executeOperation(asset, amount, premium, initiator, params) external returns (bool) {
    // 1. you now hold \`amount\`
    // 2. do anything: arbitrage, liquidate, refinance, swap collateral
    // 3. approve repayment
    IERC20(asset).approve(address(POOL), amount + premium);
    return true;
}</code></pre>
<p><b>Legitimate uses</b>: liquidations without capital, collateral swaps, debt refinancing between protocols, arbitrage, self-liquidation.</p>
<p><b>Attacks</b>: flash loans make every attack <b>capital-free</b>. Price manipulation, governance attacks that borrow voting power, and inflation attacks all become possible for anyone. Never assume "nobody has $100M". Everyone does, for one transaction.</p>
<h4>Design rules</h4>
<ul><li>Don't read prices or balances that can be moved within one transaction (spot DEX prices, raw token balances).</li>
<li>Snapshot voting power (block-based checkpoints).</li>
<li>Guard against reentrancy across protocol calls, including read-only reentrancy.</li></ul>`,
    keys: ["Borrow anything, repay in the same tx or revert", "Liquidation, refinancing and arbitrage without capital", "Attackers effectively have unlimited capital", "Never trust same-tx-movable prices or balances"],
    src: [
      ["Qin et al., Attacking the DeFi Ecosystem with Flash Loans for Fun and Profit", "https://arxiv.org/abs/2003.03810", "P", "Analysis of the bZx flash-loan attacks."],
      ["DeFiHackLabs", "https://github.com/SunWeb3Sec/DeFiHackLabs", "C", "Reproductions of hundreds of real exploits in Foundry."],
      ["Damn Vulnerable DeFi", "https://www.damnvulnerabledefi.xyz/", "K", "Flash-loan and oracle challenges to solve yourself."]
    ],
    build: "Solve the Damn Vulnerable DeFi challenges 'Unstoppable', 'Naive Receiver', 'Truster' and 'Side Entrance'. For each, write one sentence on the design rule that would have prevented it.",
    quiz: [
      ["What happens if a flash loan isn't repaid by the end of the transaction?", ["The whole transaction reverts", "The borrower's collateral is seized", "Governance votes on it", "It becomes a normal loan"], "The atomic repayment check makes default impossible."],
      ["Why do flash loans change threat modeling?", ["Any attacker can access huge capital for one transaction", "They make gas free", "They hide transactions", "They remove oracles"], "Capital requirements no longer protect you."],
      ["Which governance design resists flash-loan voting attacks?", ["Voting power snapshotted at an earlier block", "Counting balances at vote time", "No quorum", "Anonymous votes"], "Snapshots stop borrowed tokens from counting."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u8", t: "Stablecoins", tag: "DeFi",
  d: "Designs, peg mechanics and runs, Ethena and the basis trade, regulation and the 2026 stablechain race.",
  lessons: [
  {
    id: "u8l1", t: "A taxonomy of stablecoins", min: 11,
    sum: "Fiat-backed, overcollateralized, delta-neutral, algorithmic and yield-bearing: what backs each, and how each fails.",
    body: `<div class="tbl"><table><thead><tr><th>Type</th><th>Examples</th><th>Backing</th><th>Main failure mode</th></tr></thead><tbody>
<tr><td>Fiat-backed</td><td>USDT, USDC</td><td>T-bills, repo, bank deposits</td><td>Bank or custody failure (USDC/SVB, Mar 2023), freezes, regulation</td></tr>
<tr><td>Crypto-overcollateralized (CDP)</td><td>DAI/USDS (Sky), LUSD/BOLD (Liquity)</td><td>ETH and other collateral at 110–150%+</td><td>Liquidation failure in crashes (Black Thursday)</td></tr>
<tr><td>Delta-neutral / synthetic</td><td>USDe (Ethena)</td><td>Spot crypto + short perps</td><td>Negative funding, exchange or custody failure</td></tr>
<tr><td>Algorithmic (reflexive)</td><td>UST (Terra)</td><td>Mint/burn against a volatile token</td><td>Death spiral (May 2022)</td></tr>
<tr><td>Yield-bearing wrappers</td><td>sUSDS, sUSDe, tokenized T-bill funds</td><td>Underlying stable + yield source</td><td>Whatever the yield source's risk is</td></tr>
</tbody></table></div>
<p>Two more axes matter for designers:</p>
<ul><li><b>Who can redeem at par, and how fast?</b> Permissioned redemption (USDT/USDC through KYC'd firms) means secondary markets rely on those firms arbitraging.</li>
<li><b>Where does the yield go?</b> Fiat issuers keep T-bill yield, which is why they're so profitable. Yield-bearing designs pass it through, but may be securities.</li></ul>`,
    keys: ["Name the backing and the failure mode", "Redemption access drives peg strength", "The issuer keeps the reserve yield unless designed otherwise", "Algorithmic designs fail by reflexivity"],
    src: [
      ["Sky developer docs", "https://developers.sky.money/", "D", "USDS/DAI, vaults, PSM and the savings rate."],
      ["Sky/Maker DSS (code)", "https://github.com/sky-ecosystem/dss", "C", "The original multi-collateral DAI contracts."],
      ["Liquity docs", "https://docs.liquity.org/", "D", "Immutable CDP stablecoin with stability pool and redemptions."],
      ["Ethena docs", "https://docs.ethena.fi/", "D", "USDe mechanics and risks."]
    ],
    build: "Fork Liquity v1 or v2 concepts into a minimal CDP: open a vault with ETH, mint a stable at 150% CR, a stability pool that absorbs liquidations, and redemptions at $1 against the riskiest vaults. Test a 40% ETH crash.",
    quiz: [
      ["What backs USDe?", ["Spot crypto positions hedged with short perpetual futures", "US Treasury bills only", "Nothing", "Gold"], "It is delta-neutral: long collateral, short perps."],
      ["Why are fiat-backed stablecoin issuers so profitable when rates are high?", ["They keep the yield on reserves while paying holders nothing", "They charge high transfer fees", "They mine Bitcoin", "They sell governance tokens"], "Reserve yield accrues to the issuer by default."],
      ["What failure mode destroyed UST?", ["A reflexive death spiral between UST redemptions and LUNA's price", "A smart contract bug", "A bank collapse", "A 51% attack"], "Redemptions minted LUNA, which crashed its price, which weakened confidence further."]
    ]
  },
  {
    id: "u8l2", t: "Pegs, runs and the Terra collapse", min: 12,
    sum: "How pegs are defended, how they break, and the dynamics of a $40B+ collapse.",
    body: `<p>A peg is defended by <b>arbitrage</b> (mint and redeem at $1), <b>reserves</b> (a PSM or treasury that buys below $1), and <b>credibility</b> (beliefs about the first two).</p>
<h4>Terra/UST (May 2022)</h4>
<ul><li>UST could always be burned for $1 of newly minted LUNA. That's arbitrage backed by a volatile token whose value depended on UST's success.</li>
<li>Anchor paid about 20% on UST deposits, subsidized and unsustainable, which attracted most of UST's supply.</li>
<li>Large withdrawals and sales broke the peg. Arbs burned UST for LUNA and sold the LUNA, crashing its price, so each redemption needed more LUNA. Hyperinflation followed, and roughly $40B+ was wiped out within days.</li></ul>
<p>It was a <b>run</b> on a balance sheet whose only asset was confidence in itself.</p>
<h4>Other peg events</h4>
<ul><li><b>USDC</b> fell to about $0.88 when SVB failed (Mar 2023) and recovered once deposits were guaranteed.</li>
<li><b>USDe on Binance</b> briefly traded far below $1 on Oct 10, 2025 because of thin local liquidity and venue-specific pricing, while it held closer to $1 on deeper onchain venues.</li></ul>
<h4>Design lessons</h4>
<ul><li>Backing must be exogenous to the stablecoin's own success.</li>
<li>Redemption queues and fees slow runs, but signal weakness.</li>
<li>Price your collateral on deep markets.</li></ul>`,
    keys: ["Pegs = arbitrage + reserves + credibility", "Terra: endogenous backing + subsidized yield = death spiral", "USDC/SVB: custody risk is real", "Backing must not depend on the coin's own success"],
    src: [
      ["Liu, Makarov, Schoar, Anatomy of a Run: The Terra Luna Crash (NBER)", "https://www.nber.org/papers/w31160", "P", "Onchain forensic study of the UST run."],
      ["Lyons and Viswanath-Natraj, What Keeps Stablecoins Stable?", "https://www.nber.org/papers/w27136", "P", "Peg dynamics and arbitrage."],
      ["CoinGecko: October 10 crash explained", "https://www.coingecko.com/learn/october-10-crypto-crash-explained", "R", "Includes the USDe-on-Binance pricing episode."]
    ],
    build: "Simulate a Terra-style system in Python: UST demand shocks, a LUNA price that follows its market cap, and mint/burn arbitrage. Find the redemption size at which the system can't recover. Then add an exogenous reserve and find the new breaking point.",
    quiz: [
      ["Why was UST's arbitrage mechanism fragile?", ["It was backed by LUNA, whose value depended on UST's success", "It had no smart contracts", "It used Bitcoin reserves", "It paid no yield"], "Endogenous collateral collapses exactly when it's needed."],
      ["What role did Anchor's ~20% yield play?", ["It attracted unsustainable demand that left in a rush", "It made UST overcollateralized", "It stopped redemptions", "It paid validators"], "Subsidized yield created hot money that ran."],
      ["What caused USDC's 2023 depeg?", ["Exposure to Silicon Valley Bank deposits when SVB failed", "A hack", "An algorithm bug", "Negative funding rates"], "Part of the reserves sat at SVB."]
    ]
  },
  {
    id: "u8l3", t: "Ethena and the basis trade", min: 12,
    sum: "Turning perp funding into a dollar: mechanics, yield sources and the regimes that break it.",
    body: `<p><b>USDe</b> is minted against collateral (ETH, BTC, LSTs, stablecoins) that Ethena hedges by <b>shorting perps</b> of equal size. Net exposure is about zero, so it is a dollar.</p>
<pre><code>yield (sUSDe) ≈ funding received on shorts + staking yield on LSTs + yield on stable reserves − costs
positive funding (longs pay shorts) → high yield
negative funding → the hedge costs money → reserve fund and rotation into stables cover it</code></pre>
<h4>Risks to model</h4>
<ul><li><b>Funding regime</b>: in bear markets funding can stay negative for weeks.</li>
<li><b>Venue and custody</b>: hedges sit on exchanges, with collateral held via off-exchange settlement custodians. An exchange failure can break the hedge.</li>
<li><b>Basis and liquidity</b>: in a crash, unwinding shorts and selling collateral costs slippage. USDe's Oct 10 Binance discount showed how venue-specific liquidity can hit users who post it as collateral.</li>
<li><b>Reflexivity</b>: USDe's size can itself depress funding rates. A big short book means lower yield.</li></ul>
<p><b>Why builders should care</b>: Ethena became one of the largest sources of short open interest and a major collateral type across lending (for example Aave V4's "Plus" hub hosts Ethena-related strategies). If you build lending or perps, USDe is probably in your risk model.</p>`,
    keys: ["USDe = long spot + short perps", "Yield = funding + staking + reserve yield", "Negative funding and venue failure are the key risks", "USDe is now systemic collateral in DeFi"],
    src: [
      ["Ethena docs", "https://docs.ethena.fi/", "D", "Mechanics, custody, reserve fund and risk disclosures."],
      ["He et al., Fundamentals of Perpetual Futures", "https://arxiv.org/abs/2212.06888", "P", "Funding-rate behavior and perp-spot deviations."],
      ["Coinglass", "https://www.coinglass.com/", "T", "Live and historical funding rates and open interest."]
    ],
    build: "Download 2 years of ETH and BTC funding from Binance, Bybit and Hyperliquid (via ccxt). Simulate Ethena's yield with a 50/50 venue split and a reserve fund, and find the longest drawdown period in which reserves would be consumed.",
    quiz: [
      ["How does Ethena stay delta-neutral?", ["It holds spot collateral and shorts an equal notional of perps", "It holds only USD in banks", "It buys options", "It mints against LUNA"], "Long spot plus short perp nets to zero price exposure."],
      ["What happens to sUSDe yield when funding turns negative?", ["The hedge becomes a cost; the reserve fund and stable allocations absorb it", "Yield rises", "Nothing changes", "USDe becomes algorithmic"], "Shorts pay longs under negative funding."],
      ["Why could USDe's growth lower its own yield?", ["A larger short book pushes funding rates down", "It increases gas costs", "It reduces staking rewards to zero", "It forces exchanges to close"], "More shorts compete for the same long demand."]
    ]
  },
  {
    id: "u8l4", t: "Regulation and the 2026 stablechain race", min: 11,
    sum: "GENIUS Act timelines, about $300B in supply, and Stripe, Circle and Tether launching their own chains.",
    body: `<h4>US: GENIUS Act</h4>
<p>Signed <b>July 18, 2025</b>, the act creates a federal framework for payment stablecoins: 1:1 high-quality reserves, redemption rights, issuer licensing, and no yield paid directly by issuers. Agencies had until July 18, 2026 to write the rules, and reportedly <b>missed that deadline</b> with several proposals still unfinished. The law takes effect on the earlier of January 18, 2027 or 120 days after final rules. Restrictions on US platforms offering non-compliant stablecoins start in July 2028. The broader market-structure bill (<b>CLARITY Act</b>) passed the House in July 2025 and cleared Senate Banking in May 2026, but was not law as of late summer 2026. Check its status.</p>
<h4>Market</h4>
<p>Reported total supply crossed about <b>$300B</b> by mid-2026 (up about 19% year on year), with USDT and USDC around 83% combined.</p>
<h4>Stablechains: issuers building their own L1s</h4>
<ul><li><b>Plasma</b> (Tether-aligned, Sep 2025).</li>
<li><b>Stable</b> (Bitfinex/Tether-affiliated, Dec 2025).</li>
<li><b>Tempo</b> (Stripe and Paradigm, mainnet March 18, 2026): fees payable in any USD stablecoin via a built-in fee AMM, with no native gas token.</li>
<li><b>Arc</b> (Circle): reported public mainnet in Sept 2026, with institutional validators, built on the Malachite BFT engine.</li></ul>
<p>Why issuers want chains: capture fees and order flow, control compliance (freezes, privacy), and give payments sub-second finality. For builders this means new venues to deploy on, and more bridges to secure (Unit 12).</p>
<p><i>Not legal advice. Laws and rulemakings change, so verify the current status with primary sources.</i></p>`,
    keys: ["GENIUS Act signed Jul 18, 2025; rules late; effective by Jan 2027 at the latest", "CLARITY Act pending in the Senate (as of late 2026 reports)", "Supply around $300B, about 83% USDT + USDC", "Stablechains: Plasma, Stable, Tempo (Mar 2026), Arc (reported Sep 2026)"],
    src: [
      ["GENIUS Act (S.1582) on Congress.gov", "https://www.congress.gov/bill/119th-congress/senate-bill/1582", "D", "Bill text and legislative history."],
      ["Arnold & Porter GENIUS Act resource center", "https://www.arnoldporter.com/en/perspectives/topics/the-genius-act-and-stablecoin-regulation-resource-center", "N", "Law-firm tracker of rulemakings."],
      ["ESMA: MiCA", "https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica", "D", "The EU's crypto-asset regime, including stablecoins (EMTs and ARTs)."],
      ["Malachite (BFT engine behind Arc)", "https://github.com/circlefin/malachite", "C", "Circle's Rust Tendermint implementation."]
    ],
    build: "Pick one stablechain (Tempo or Arc). Read its docs and write a 1-page memo: consensus, finality, fee model, who the validators are, freeze and compliance powers, and what you'd need to deploy a payments-focused AMM there.",
    quiz: [
      ["When was the GENIUS Act signed into law?", ["July 18, 2025", "January 2024", "March 2026", "It has not been signed"], "It was signed July 18, 2025, with a one-year rulemaking window."],
      ["What's distinctive about Tempo's fee model?", ["Fees can be paid in USD stablecoins with no native gas token", "It uses proof of work", "Fees are paid in BTC", "Transactions are free with no limits"], "A built-in fee AMM lets users pay gas in stablecoins."],
      ["Why are stablecoin issuers launching their own chains?", ["To capture fees and flow, control compliance, and offer fast payment finality", "Because Ethereum banned stablecoins", "To mine new tokens", "Because L2s can't hold ERC-20s"], "Owning the rails is a business and product decision."]
    ]
  }
  ]
});
