window.BP_UNITS.push({
  id: "u18", t: "Developer tooling: debug, trace and ship a frontend", tag: "Technology",
  d: "Read any transaction like an investigator, talk to contracts from TypeScript with viem, and build a frontend that can't be turned against its users.",
  lessons: [
  {
    id: "u18l1", t: "Reading transactions like an investigator", min: 13,
    sum: "Etherscan, Phalcon, Tenderly and Foundry traces: the workflow for understanding any transaction or exploit.",
    body: `<p>Every exploit, liquidation and arbitrage is a transaction you can take apart. Four tools cover almost everything:</p>
<ul><li><b>Etherscan</b> (and its siblings on other chains): verified source code, read and write tabs, internal transactions, event logs, and token transfers.</li>
<li><b>Phalcon</b> (BlockSec): a fund-flow graph, a full invocation tree with decoded calls, balance changes per address, and state diffs. It's the fastest way to see what happened in an exploit.</li>
<li><b>Tenderly</b>: a step-through debugger, gas profiler and transaction simulator, plus forks and virtual testnets for replaying with modified state, and alerting.</li>
<li><b>Foundry</b>: <code>cast run</code> replays a mined transaction locally with a trace, and fork tests reproduce it in code.</li></ul>
<pre><code>cast run 0x&lt;txhash&gt; --rpc-url $ETH_RPC --quick          # replay with a call trace
cast call &lt;addr&gt; "getReserves()(uint112,uint112)" --rpc-url $ETH_RPC --block 19000000
forge test --fork-url $ETH_RPC --fork-block-number 16817995 -vvvv   # reproduce an exploit</code></pre>
<h4>The investigation workflow</h4>
<ol><li>Start from the attacker's transaction. Read the <b>fund flow</b> first: who ended up with what?</li>
<li>Open the <b>invocation tree</b>. Find the first call where state stopped making sense, such as a price moving, a balance check passing that shouldn't, or a donation.</li>
<li>Read the victim contract's verified source at that function.</li>
<li><b>Reproduce</b> it in a Foundry fork test, as DeFiHackLabs does for hundreds of incidents.</li>
<li>Write the invariant that would have caught it.</li></ol>
<p>Euler (March 2023, about $197M, later returned) is a good first case. A donation function let the attacker make their own account insolvent, then liquidate themselves at a profit. The rekt post-mortem plus a Phalcon trace teach more than any textbook.</p>`,
    keys: ["Fund flow first, then the invocation tree", "Phalcon for exploits, Tenderly for debugging and simulation", "cast run and fork tests reproduce anything", "Every investigation ends with an invariant"],
    src: [
      ["Etherscan", "https://etherscan.io/", "T", "Verified source, internal transactions, logs and token transfers."],
      ["Phalcon explorer (BlockSec)", "https://blocksec.com/phalcon/explorer", "T", "Fund flow, invocation trees and balance changes for any transaction."],
      ["Tenderly docs", "https://docs.tenderly.co/", "D", "Debugger, simulator, virtual testnets and alerting."],
      ["Foundry", "https://www.getfoundry.sh/", "D", "cast run, fork tests and traces."],
      ["DeFiHackLabs", "https://github.com/SunWeb3Sec/DeFiHackLabs", "C", "Hundreds of exploits reproduced as Foundry tests."],
      ["rekt: Euler Finance", "https://rekt.news/euler-rekt", "R", "The 2023 donation-and-self-liquidation exploit."]
    ],
    build: "Pick the Euler exploit transaction. Trace it in Phalcon and write a five-step timeline of the attack, replay it with cast run, then reproduce it in a Foundry fork test.",
    quiz: [
      ["Investigating an exploit transaction, what should you look at first?", ["The fund flow: who ended up with which assets", "The gas price", "The block's timestamp", "The token's logo"], "Fund flow tells you the outcome, which guides where to look in the call tree."],
      ["What does cast run do?", ["Replays a mined transaction locally and prints its trace", "Deploys a contract", "Sends a new transaction to mainnet", "Verifies source code"], "It re-executes the transaction against the state at that block."],
      ["Why reproduce an exploit in a fork test after reading the trace?", ["To prove your understanding and turn it into a regression test or invariant", "Because explorers are always wrong", "To claim the bounty", "To make it run faster"], "A passing reproduction is evidence you understand the mechanism."]
    ]
  },
  {
    id: "u18l2", t: "viem: talking to contracts from TypeScript", min: 12,
    sum: "Clients, typed ABIs, read, simulate, write, events: the client side of every dApp and bot.",
    body: `<p><b>viem</b> is the TypeScript library most new EVM frontends and bots use, and <b>wagmi</b> wraps it in React hooks. The core ideas:</p>
<ul><li><b>Clients</b>: a public client for reads, a wallet client for signing, and a test client for anvil's cheat methods.</li>
<li><b>Typed ABIs</b>: declare an ABI <code>as const</code> and function names, arguments and return types are checked at compile time.</li>
<li><b>Read, simulate, write</b>: <code>readContract</code> for views; <code>simulateContract</code> runs the call against current state and returns a prepared request, or throws with the decoded revert reason; <code>writeContract</code> sends it; <code>waitForTransactionReceipt</code> confirms.</li>
<li><b>Events</b>: <code>getContractEvents</code> or <code>watchContractEvent</code> for history and live updates.</li>
<li><b>Units</b>: everything is a <code>bigint</code>. Use <code>parseUnits</code> and <code>formatUnits</code>, and never JS floats for token amounts.</li></ul>
<pre><code>const { request } = await pub.simulateContract({ address: pair, abi, functionName: "swap",
  args: [0n, minOut, me], account })          // throws with the reason ("K") if it would revert
const hash = await wallet.writeContract(request)
const receipt = await pub.waitForTransactionReceipt({ hash })</code></pre>
<p>Always simulate before sending, in bots as much as frontends. It's free, it catches stale quotes, and it gives users a readable error instead of a failed transaction they paid gas for.</p>
<p>The <b>dapp-viem</b> lab does all of this against the AMM lab's contracts on a local chain: deploy, quote with price impact, slippage-protected swaps, decoded reverts and an event history.</p>`,
    keys: ["Public, wallet and test clients", "Typed ABIs (as const) catch mistakes at compile time", "Read, then simulate, then write, then wait", "bigint and parseUnits, never floats"],
    src: [
      ["viem docs", "https://viem.sh/", "D", "Clients, contract actions, ABIs, accounts, chains."],
      ["wagmi docs", "https://wagmi.sh/", "D", "React hooks on top of viem for wallet connection and contract calls."],
      ["Course lab: dapp-viem", "https://github.com/argenestel/basis-points-academy/tree/main/labs/dapp-viem", "C", "Tested viem client for the AMM lab on a local anvil chain."],
      ["Ethereum developer docs", "https://ethereum.org/developers/docs/", "K", "JSON-RPC and transaction lifecycle background."]
    ],
    build: "Run the dapp-viem lab (npm test). Then add a quote endpoint that returns amountOut, price impact and the minimum out for a slippage setting, and a script that streams Swap events into a price chart.",
    quiz: [
      ["Why call simulateContract before writeContract?", ["It runs the call against current state and surfaces the revert reason before you pay gas", "It makes the transaction cheaper on-chain", "It signs the transaction", "It is required by the EVM"], "Simulation is a free dry run with a decoded error."],
      ["How should a dApp represent token amounts?", ["As bigint base units, converted with parseUnits and formatUnits", "As JavaScript floats", "As strings with commas", "As percentages"], "Floats lose precision for 18-decimal amounts."],
      ["What does declaring an ABI with 'as const' give you in viem?", ["Compile-time checks of function names, arguments and return types", "Faster RPC calls", "Automatic gas refunds", "Encryption of calldata"], "viem infers types from literal ABIs."]
    ]
  },
  {
    id: "u18l3", t: "Frontends that can't be turned against users", min: 12,
    sum: "DNS hijacks, poisoned dependencies and malicious signing prompts, and the defenses that stop them.",
    body: `<p>Users don't sign contracts, they sign what your interface shows them. That makes the frontend part of the protocol's attack surface:</p>
<ul><li><b>DNS and registrar hijacks</b>: attackers took over front-end domains at Curve (2022) and Balancer (2023), and a front-end compromise was reported at Aerodrome and Velodrome. Each served pages that asked users for drainer approvals.</li>
<li><b>Supply-chain attacks</b>: a malicious version of a widely used wallet-connect library (Ledger Connect Kit, December 2023) briefly injected a drainer into many dApps at once.</li>
<li><b>Manipulated signing UIs</b>: Bybit's signers approved a malicious transaction shown through a compromised Safe interface (February 2025, about $1.5B).</li></ul>
<h4>Defenses</h4>
<ul><li>Registrar lock and DNSSEC, monitoring for DNS changes, and an IPFS or ENS mirror users can verify.</li>
<li>Pinned dependencies and lockfiles, subresource integrity for any script you load, a strict Content-Security-Policy, and no runtime fetching of code.</li>
<li>Hard-code and display the contract addresses you expect, verify the chain id, and refuse unknown spenders.</li>
<li><b>Simulate every transaction</b> and show the result in plain words ("you send 1 ETH, you receive at least 2,946 USDC").</li>
<li>Use human-readable signing: EIP-712 typed data and ERC-7730 clear-signing metadata for hardware wallets. Support EIP-1271 for smart-account signatures.</li>
<li>Prefer scoped approvals (Permit2 with expiries) over unlimited ones.</li>
<li>Don't trust a single RPC for anything security-critical. Light clients like Helios verify what the RPC tells you.</li></ul>`,
    keys: ["The frontend is attack surface", "Lock DNS, pin dependencies, use CSP and SRI", "Simulate and show outcomes in plain words", "Readable signing (EIP-712, ERC-7730), scoped approvals"],
    src: [
      ["ERC-7730: clear-signing format", "https://eips.ethereum.org/EIPS/eip-7730", "D", "Metadata so wallets can show what a signature really does."],
      ["EIP-1271: contract signatures", "https://eips.ethereum.org/EIPS/eip-1271", "D", "Verifying signatures from smart accounts."],
      ["Helios (a16z)", "https://github.com/a16z/helios", "C", "Ethereum light client: verify RPC data instead of trusting it."],
      ["Permit2", "https://github.com/Uniswap/permit2", "C", "Signature approvals with expiries."],
      ["The Block: Aerodrome upgrade and expansion", "https://www.theblock.co/post/378634/aerodrome-upgrades-evm-extensions-circles-arc-metadex", "N", "Context on one of the DEXs whose front end was targeted."]
    ],
    build: "Extend the dapp-viem lab: before any write, check the chain id and that the target address's bytecode hash matches a pinned value; show a plain-language summary of the simulated balance changes; refuse unlimited approvals.",
    quiz: [
      ["A DEX's domain is hijacked and serves a drainer page. Which defense helps users most?", ["Registrar lock and DNS monitoring, plus a verifiable IPFS or ENS mirror", "A higher swap fee", "A bigger audit budget for the contracts", "Removing slippage settings"], "The contracts were fine. The delivery channel was compromised."],
      ["What does ERC-7730 add?", ["Metadata that lets wallets display what a signature or call does in readable form", "A new token standard", "Faster block times", "A bridge protocol"], "Clear signing fights blind signing."],
      ["Why use a light client like Helios in a wallet or frontend?", ["To verify data from an RPC instead of trusting it blindly", "To mine blocks", "To lower gas", "To store private keys"], "A malicious RPC can lie about balances and state. A light client checks proofs."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u19", t: "Governance and DAO security", tag: "Risk",
  d: "How onchain governance works, how attackers have captured it (Beanstalk to BonkDAO), and designs that survive.",
  lessons: [
  {
    id: "u19l1", t: "How onchain governance works", min: 11,
    sum: "Token voting, delegation, quorums, timelocks, security councils, and offchain voting with onchain execution.",
    body: `<p>Most DAOs use a variant of <b>Governor</b> (Compound's Governor Bravo, OpenZeppelin Governor):</p>
<pre><code>propose (needs proposalThreshold votes)
  → votingDelay → voting period (for / against / abstain, weighted by delegated tokens)
  → passes if for > against and quorum reached
  → queued in a Timelock for N days → executed (arbitrary calls from the treasury or admin)</code></pre>
<ul><li><b>Delegation</b>: token holders delegate votes, often to themselves. Voting power is read from a <b>checkpoint at the proposal's start block</b> (ERC20Votes), which blocks flash-loaned votes.</li>
<li><b>Offchain voting with onchain execution</b>: Snapshot votes are free and signed messages; execution goes through a Safe multisig or an optimistic oracle bridge.</li>
<li><b>Security councils</b>: elected multisigs (Arbitrum's 12-member council can act on 9 of 12 in emergencies) with powers limited by the constitution.</li>
<li><b>Other models</b>: futarchy (markets decide; MetaDAO on Solana), optimistic governance (passes unless vetoed), and Solana's Realms.</li></ul>
<p>The core tension: governance is how a protocol adapts, and also its biggest backdoor. Every power the DAO holds is a power an attacker can capture.</p>`,
    keys: ["Propose → vote → timelock → execute", "Checkpointed voting power blocks flash-loan votes", "Snapshot plus Safe for offchain votes", "Every governance power is an attack surface"],
    src: [
      ["OpenZeppelin Governor docs", "https://docs.openzeppelin.com/contracts/5.x/governance", "D", "Governor, ERC20Votes and TimelockController."],
      ["Snapshot docs", "https://docs.snapshot.box/", "D", "Offchain voting with strategies and execution plugins."],
      ["Vitalik, Moving beyond coin voting governance", "https://vitalik.eth.limo/general/2021/08/16/voting3.html", "P", "The case against pure token voting and the alternatives."],
      ["Uniswap governance forum", "https://gov.uniswap.org/", "D", "A large DAO's full process in public."]
    ],
    build: "Deploy OpenZeppelin Governor + ERC20Votes + TimelockController in Foundry. Write a test showing that tokens acquired after a proposal starts have no voting power on it.",
    quiz: [
      ["Why do Governor contracts read voting power at the proposal's start block?", ["So tokens borrowed or bought after the proposal can't vote on it", "To save gas", "Because blocks are final then", "To prevent spam proposals"], "Checkpoints defeat flash-loaned votes."],
      ["What does the timelock between passing and execution give users?", ["Time to see what will execute and exit if they disagree", "A faster vote", "Lower fees", "Anonymity"], "Timelocks turn governance power into a visible, exit-able event."],
      ["In futarchy, what decides whether a proposal passes?", ["Prediction markets on the token's value with and without the proposal", "One token one vote", "A security council", "A random lottery"], "Futarchy bets on outcomes instead of counting votes."]
    ]
  },
  {
    id: "u19l2", t: "Governance attacks: Beanstalk to BonkDAO", min: 14,
    sum: "Flash-loaned votes, malicious payloads, whale capture and sleepy-DAO drains, case by case.",
    body: `<div class="tbl"><table><thead><tr><th>Incident</th><th>What happened</th><th>Missing defense</th></tr></thead><tbody>
<tr><td><b>Beanstalk</b> (Apr 2022, about $182M drained)</td><td>The attacker flash-borrowed about $1B, deposited it to gain about 79% of voting power, and passed a malicious proposal through an "emergency commit" path in a single transaction. They kept about $80M after repaying the loans.</td><td>Voting power from same-block deposits; an emergency path with no delay</td></tr>
<tr><td><b>Tornado Cash governance</b> (May 2023)</td><td>A proposal that looked like an earlier, approved one hid a self-destruct. After it passed, the attacker redeployed different code at the same address (CREATE2) that granted them about 1.2M votes and control.</td><td>Verifying the deployed payload at execution time; metamorphic-contract checks</td></tr>
<tr><td><b>Compound Proposal 289</b> (Jul 2024)</td><td>A whale-led group accumulated delegation and passed a proposal moving about 499k COMP (about $24M) into a vault they controlled. It ended in a negotiated settlement.</td><td>Quorum and turnout design, delegate engagement</td></tr>
<tr><td><b>Small Solana DAO</b> (2025, about $230k)</td><td>Ten identical-looking proposals; nine were empty and the tenth sent the treasury to the attacker.</td><td>Proposal simulation and review</td></tr>
<tr><td><b>BonkDAO</b> (Jul 2026, about $20M reported)</td><td>An attacker gathered about 1% of BONK supply, enough to clear the approval threshold on Realms, and executed a treasury transfer with no timelock.</td><td>Execution timelock, realistic quorums, monitoring</td></tr>
</tbody></table></div>
<p><b>Patterns:</b> attackers target low turnout, missing timelocks, emergency paths, and payloads nobody simulated. Many targets are sleepy DAOs whose treasuries outlived their communities.</p>
<p><b>Monitoring</b>: services such as Hypernative watch proposals and flag treasury transfers. A watchful community caught a near-identical attack on another DAO before BonkDAO's.</p>`,
    keys: ["Flash-loaned votes: Beanstalk", "Malicious or metamorphic payloads: Tornado governance", "Whale capture: Compound 289", "No timelock plus a low threshold: BonkDAO 2026"],
    src: [
      ["rekt: Beanstalk", "https://rekt.news/beanstalk-rekt", "R", "The flash-loan governance attack."],
      ["rekt: Tornado Cash governance takeover", "https://rekt.news/tornado-gov-rekt", "R", "The self-destructing proposal."],
      ["Hypernative: the BonkDAO governance drain", "https://www.hypernative.io/insights/blog/the-bonk-dao-governance-drain-the-same-attack-reserve-already-stopped", "N", "The 2026 attack and an earlier one that was stopped."],
      ["Blockworks: Solana DAO loses $230K to an attack proposal", "https://blockworks.com/news/solana-exploit-dao-hacker", "N", "Decoy proposals in a low-attention DAO."]
    ],
    build: "Reproduce a Beanstalk-style attack against a toy Governor in Foundry: a governance token that counts current balances, an 'emergencyExecute' with no delay, and a flash loan. Then fix it with checkpoints and a timelock and show the attack fails.",
    quiz: [
      ["What made Beanstalk's governance exploitable by a flash loan?", ["Voting power from fresh deposits could pass a proposal through an emergency path in one transaction", "A bridge bug", "An oracle failure", "A compiler bug"], "Same-block voting power plus no delay meant borrowed capital could govern."],
      ["How did the 2023 Tornado Cash governance attacker change an approved proposal?", ["Self-destructed it and redeployed different code at the same address", "Bribed every voter", "Forged signatures", "Hacked Snapshot"], "Metamorphic contracts break 'the code you voted on is the code that runs'."],
      ["Which defense most directly stops a BonkDAO-style drain?", ["An execution timelock plus monitoring, so the community can react before funds move", "A higher token price", "More proposals", "Shorter voting periods"], "Without a delay, a passed proposal executes before anyone can respond."]
    ]
  },
  {
    id: "u19l3", t: "Designing governance that survives", min: 11,
    sum: "Minimize what governance can do, delay what it does, and give users an exit.",
    body: `<ol><li><b>Minimize governance.</b> Immutable cores (Uniswap v4's PoolManager, Morpho Blue) can't be captured. Put flexibility in replaceable periphery and per-market choices.</li>
<li><b>Separate powers.</b> Parameter tweaks inside bounds can be fast. Upgrades and treasury moves must be slow. Emergency powers should only be able to pause, not move funds.</li>
<li><b>Delay plus exit.</b> Timelocks long enough for users to leave. L2BEAT's stages framework makes exit windows a requirement.</li>
<li><b>Let users veto.</b> Lido's dual governance (2025) lets stETH holders delay, and ultimately block, DAO decisions by moving stETH into an escrow. Rage-quit (Moloch DAOs) lets dissenters leave with their share.</li>
<li><b>Defend the process</b>: checkpointed votes, realistic quorums, payload simulation in the proposal UI, bytecode-hash checks at execution, monitoring and alerting, and security councils with narrow, published powers.</li>
<li><b>Sunset governance for dormant DAOs</b>: distribute or lock the treasury instead of leaving a honeypot.</li></ol>
<pre><code>governance attack cost  ≈  cost to acquire or borrow the voting power needed
                          + cost of being seen during the timelock
must exceed: value the governance can move</code></pre>`,
    keys: ["Minimize what governance controls", "Slow and visible for upgrades and treasury", "Exit rights: dual governance, rage-quit, exit windows", "Attack cost must exceed what governance can move"],
    src: [
      ["Lido docs", "https://docs.lido.fi/", "D", "Dual governance and stETH holder veto."],
      ["L2BEAT stages", "https://l2beat.com/stages", "T", "Exit windows and upgrade delays as decentralization requirements."],
      ["Morpho Blue", "https://github.com/morpho-org/morpho-blue", "C", "An immutable core that removes governance from risk."],
      ["Uniswap v4-core", "https://github.com/Uniswap/v4-core", "C", "Immutable pool manager; flexibility moved to hooks."]
    ],
    build: "Write a governance spec for your capstone: what can change, by whom, with what delay, what the guardian can do (pause only), and how a dissenting user exits. Then compute the attack cost against today's token distribution.",
    quiz: [
      ["What should an emergency guardian usually be allowed to do?", ["Pause, but not move funds or upgrade", "Upgrade contracts instantly", "Mint tokens", "Change any parameter without a vote"], "Narrow emergency powers limit the damage from a compromised guardian."],
      ["What does Lido's dual governance give stETH holders?", ["A way to delay and ultimately block DAO decisions by escrowing stETH", "Higher yield", "Free withdrawals", "Validator keys"], "Holders who disagree can stop governance from acting against them."],
      ["Why is an immutable core a governance defense?", ["There is nothing to capture: no upgrade path exists", "It is cheaper to deploy", "It has better UX", "Auditors prefer it"], "You can't vote to change what can't change."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u20", t: "Launchpads, bonding curves and memecoins", tag: "Launch",
  d: "The math of bonding curves, the pump.fun era and its rivals, and the sniping, bundling and rug patterns that fair-launch design must handle.",
  lessons: [
  {
    id: "u20l1", t: "Bonding curve math", min: 13,
    sum: "Price as a function of supply, virtual reserves, graduation, and the exact numbers behind a pump.fun-style curve.",
    body: `<p>A <b>bonding curve</b> sells tokens at a price set by a formula of how many have been sold. Early buyers pay less. Common shapes:</p>
<ul><li>Linear: P(s) = a + b·s, so cost = ∫P ds.</li>
<li>Exponential: P(s) = a·e^(b·s), steep later.</li>
<li><b>Constant product over virtual reserves</b>: x · y = k, where x is SOL and y is tokens, and both start with <i>virtual</i> amounts nobody deposited. This is the pump.fun design.</li></ul>
<pre><code>commonly cited pump.fun parameters (they have changed over time):
virtual SOL x0 = 30 SOL, virtual tokens y0 = 1,073,000,000, sold on the curve = 793,100,000 of 1B supply
buy:  tokens_out = y · dx / (x + dx)        sell: sol_out = x · dy / (y + dy)
start price = x0 / y0 ≈ 0.000000028 SOL
graduation: after 793.1M sold, y = 279.9M, x = k / y ≈ 115 SOL, so real SOL raised ≈ 115 − 30 = 85 SOL
the remaining ~206.9M tokens + raised SOL seed an AMM pool</code></pre>
<p><b>Why virtual reserves?</b> They give a non-zero starting price and a smooth curve without anyone posting liquidity. They also cap how much SOL the curve can ever hold: the real reserves are exactly what buyers put in, so everyone can always sell back (minus fees and rounding).</p>
<p><b>Graduation</b> moves trading from the curve to an AMM, usually at the same price, so there is no jump. What happens to the LP tokens (burned, locked or held) decides whether the launch can be rugged later.</p>
<p>The <b>solana-launchpad</b> lab implements exactly this curve as an Anchor program, with tests that check the 85 SOL graduation.</p>`,
    keys: ["Price = f(supply); early buyers pay less", "Virtual reserves give a starting price without liquidity", "pump.fun-style curve graduates at about 85 SOL", "LP handling at graduation decides rug risk"],
    src: [
      ["Course lab: solana-launchpad (Anchor)", "https://github.com/argenestel/basis-points-academy/tree/main/labs/solana-launchpad", "C", "The curve above as a tested Solana program."],
      ["Balancer docs (LBPs)", "https://docs.balancer.fi/", "D", "Liquidity bootstrapping pools: a descending-price alternative."],
      ["Angeris and Chitra, Improved Price Oracles: CFMMs", "https://arxiv.org/abs/2003.10001", "P", "Theory for curves as trading functions."]
    ],
    build: "In Python, plot price versus tokens sold for the virtual constant-product curve and for a linear curve calibrated to the same 85 SOL raise. Mark where the first 10% of buyers end up and their profit if price reaches graduation.",
    quiz: [
      ["What do virtual reserves in a pump.fun-style curve provide?", ["A non-zero starting price and smooth pricing without anyone depositing liquidity", "Free tokens for the creator", "Protection from all rugs", "An oracle price"], "The virtual amounts set k and the starting price."],
      ["With x0 = 30 SOL and y0 = 1.073B tokens, about how much real SOL has been raised after 793.1M tokens sell?", ["About 85 SOL", "About 30 SOL", "About 115 SOL", "About 793 SOL"], "k / (1.073B − 793.1M) ≈ 115 SOL in total, minus the 30 virtual = 85."],
      ["Why does the handling of LP tokens at graduation matter?", ["If someone holds removable LP, they can pull the liquidity (a rug) later", "It changes the token's decimals", "It sets the creator fee", "It decides the bonding curve's shape"], "Burned or locked LP removes that rug vector."]
    ]
  },
  {
    id: "u20l2", t: "The launchpad boom: pump.fun, PumpSwap and LetsBonk", min: 11,
    sum: "How one-click token creation reshaped Solana, and what the competition and revenue look like in 2026.",
    body: `<p><b>pump.fun</b> launched on Solana in January 2024. Anyone could create a token in seconds on a bonding curve, with no liquidity needed. Graduated tokens moved to Raydium until March 2025, when pump.fun launched its own AMM, <b>PumpSwap</b>, and started sharing fees with creators.</p>
<ul><li>At its peak pump.fun handled roughly 75–80% of Solana memecoin launches.</li>
<li>Only a small fraction of launched tokens ever graduate; around 1% is commonly reported.</li>
<li>Its <b>PUMP</b> token sale in July 2025 raised hundreds of millions of dollars within minutes. pump.fun reports using a large share of revenue (about half, per its materials) to buy back and burn PUMP.</li>
<li><b>LetsBonk</b> (built on Raydium's LaunchLab) briefly overtook pump.fun on launches and revenue in July 2025. Share figures in 2026 conflict depending on the metric, so check a dashboard.</li>
<li>Other ecosystems copied the model: creator coins on Base (Zora), BNB Chain launchpads, and "launch as a service" for apps.</li></ul>
<h4>The economics</h4>
<p>Launchpads are fee businesses on speculative flow. Revenue scales with attention, and attention is cyclical. The durable parts are distribution (where users already are), post-graduation liquidity (owning the AMM, as PumpSwap does) and creator incentives.</p>`,
    keys: ["pump.fun (Jan 2024) made launches one click", "PumpSwap (Mar 2025) captured post-graduation volume", "Few tokens graduate; launchpads earn fees on speculation", "LetsBonk challenged in 2025; 2026 share figures conflict"],
    src: [
      ["CryptoSlate: pump.fun review (2026)", "https://cryptoslate.com/decentralized-exchanges/pump-fun-review/", "N", "Fees, PumpSwap and risks."],
      ["Cointelegraph via TradingView: how pump.fun captured 80% of Solana memecoins", "https://www.tradingview.com/news/cointelegraph:9c3a24b10094b:0-how-pump-fun-captured-80-of-solana-memecoins-and-can-it-last/", "N", "Market-share history and the LetsBonk challenge."],
      ["pump.fun: PUMP token page", "https://pump.fun/pump-token", "D", "Official buyback and volume figures (self-reported)."],
      ["Bex: Meme launchpad 2.0 (Apr 2026)", "https://bex.co/blog/2026/04/22/meme-launchpad-2-pump-fun-letsbonk-anti-sniper-bonding-curve-professionalization", "N", "Anti-sniper curves and professionalization in 2026."]
    ],
    build: "Using Dune or DefiLlama, chart for one launchpad over 90 days: tokens created per day, graduation rate, and post-graduation volume share. Estimate the launchpad's revenue per graduated token.",
    quiz: [
      ["What changed when pump.fun launched PumpSwap in 2025?", ["Graduated tokens traded on pump.fun's own AMM instead of moving to Raydium", "Tokens stopped using bonding curves", "It moved to Ethereum", "It removed all fees"], "Owning the post-graduation venue captured the most valuable volume."],
      ["Roughly what share of launched tokens reach graduation, as commonly reported?", ["Around 1%", "About 50%", "About 90%", "All of them"], "Most launches die on the curve."],
      ["What is the durable advantage for a launchpad?", ["Distribution plus owning post-graduation liquidity and creator incentives", "Charging the highest fees", "Having the most tokens listed", "A complex bonding curve"], "Attention is cyclical, but venues and distribution persist."]
    ]
  },
  {
    id: "u20l3", t: "Snipers, bundles, rugs and fair-launch design", min: 12,
    sum: "The adversaries every launch faces, and the mechanisms that make launches fairer.",
    body: `<ul><li><b>Snipers</b> buy in the same slot as creation with bots and priority fees or bundles, then sell into the first real buyers.</li>
<li><b>Bundled launches</b>: the creator buys from many wallets in the creation bundle to hide how much supply they control.</li>
<li><b>Rugs</b>: the creator dumps hidden supply, or (outside curves) pulls liquidity.</li>
<li><b>Honeypots</b>: tokens you can't sell. On EVM that's transfer logic that blocks sells. On Solana, watch for a <b>freeze authority</b>, a <b>permanent delegate</b> or a <b>transfer hook</b> in Token-2022.</li>
<li><b>Wash volume</b> to climb trending lists.</li></ul>
<h4>Fair-launch mechanisms</h4>
<ul><li>Anti-sniper fees that start high and decay over the first seconds or blocks.</li>
<li>Per-wallet caps in the first N slots. These are only partly effective against sybils.</li>
<li>Batch auctions or commit-reveal for the opening window, so everyone in it gets the same price.</li>
<li>Descending-price starts (LBP-style) that make sniping unprofitable.</li>
<li>Mint authority revoked or held by a PDA (as in the lab), no freeze authority, LP burned or locked at graduation.</li>
<li>Creator allocations that vest.</li>
<li>Holder-concentration and bundle detection shown to buyers before they trade.</li></ul>
<pre><code>checklist a buyer's app should run before showing "Buy":
mint authority == none or curve PDA?   freeze authority == none?   Token-2022 extensions?
top 10 holders share?   creator + bundle wallets share?   LP burned or locked?</code></pre>`,
    keys: ["Snipers and bundles extract from the first real buyers", "Check mint and freeze authority, delegates and hooks", "Decaying fees, batch openings and descending starts", "Show concentration and bundle data to buyers"],
    src: [
      ["Jito docs", "https://docs.jito.wtf/", "D", "Bundles: how snipers and bundled launches land in one slot."],
      ["Solana token docs", "https://solana.com/docs/tokens", "D", "Mint and freeze authorities, token accounts."],
      ["Token-2022 docs", "https://www.solana-program.com/docs/token-2022", "D", "Extensions that can make a token un-sellable."],
      ["Balancer docs (LBPs)", "https://docs.balancer.fi/", "D", "Descending-price launches."]
    ],
    build: "Extend the solana-launchpad lab with an anti-sniper fee that starts at 50% and decays linearly to 1% over the first 20 slots after create. Write a TypeScript test showing a same-slot buy pays more than a later one.",
    quiz: [
      ["Which Solana token setting lets the creator stop holders from selling?", ["A freeze authority (or a malicious transfer hook or permanent delegate)", "Six decimals", "A metadata URI", "A Jito tip"], "Check authorities and extensions before buying."],
      ["How does a decaying anti-sniper fee help?", ["It makes buying in the first slots expensive, removing the sniper's edge", "It raises the token supply", "It blocks all bots forever", "It lowers gas"], "The first-slot advantage gets taxed away."],
      ["What does a 'bundled launch' usually hide?", ["How much of the supply the creator controls across many wallets", "The token's price", "The chain it's on", "The bonding curve formula"], "Many wallets buying in the creation bundle look like organic demand."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u21", t: "More market designs: soft liquidations, ve(3,3), options", tag: "DeFi",
  d: "crvUSD's LLAMMA, the Solidly/Velodrome/Aerodrome flywheel and its 2026 merger into Aero, and onchain options.",
  lessons: [
  {
    id: "u21l1", t: "Soft liquidations: crvUSD and LLAMMA", min: 13,
    sum: "An AMM that liquidates you gradually, and un-liquidates you if the price comes back.",
    body: `<p>Classic lending liquidates in one discrete event with a penalty (Unit 7). <b>crvUSD</b> (Curve, May 2023) replaced that with <b>LLAMMA</b>, the Lending-Liquidating AMM Algorithm:</p>
<ul><li>Your collateral is spread across <b>N bands</b>, which are price ranges below the current price.</li>
<li>When the market price falls into your bands, LLAMMA becomes an AMM that sells your collateral for crvUSD band by band. Arbitrageurs do the trades because LLAMMA's price is offset to make it profitable.</li>
<li>If the price recovers, the same mechanism buys collateral back: <b>de-liquidation</b>.</li>
<li>Only if your health keeps falling below zero do you face a hard liquidation.</li></ul>
<pre><code>loss while in soft liquidation ≈ small % per band crossed (like LVR: you trade against arbitrageurs)
choose N: more bands = gentler conversion but positions enter soft liquidation earlier</code></pre>
<p><b>Peg</b>: PegKeepers mint or burn crvUSD into stableswap pools when the price drifts, and the borrow rate rises when crvUSD trades below $1. <b>LlamaLend</b> (2024) reused LLAMMA for isolated lending markets.</p>
<h4>Trade-offs</h4>
<p>There's no cliff and no big penalty, and liquidation capacity is built into the protocol. But you bleed in choppy markets (repeated conversions) and the mechanism is complex. Compare with Unit 1's liquidity spirals: LLAMMA spreads forced selling over a price range instead of dumping it at one price.</p>`,
    keys: ["Collateral spread over N price bands", "AMM converts collateral as price falls and back as it rises", "Hard liquidation only if health goes below zero", "Gentler than cliff liquidations; bleeds in chop"],
    src: [
      ["crvUSD developer docs", "https://docs.curve.finance/developer/crvusd/overview/", "D", "LLAMMA, controller, PegKeepers and monetary policy."],
      ["curve-stablecoin (code)", "https://github.com/curvefi/curve-stablecoin", "C", "Vyper implementation of LLAMMA and the controller."],
      ["Curve docs", "https://docs.curve.finance/", "D", "LlamaLend and the wider Curve system."]
    ],
    build: "Simulate LLAMMA in Python with 10 bands: drive the price down 30% and back up along a choppy path. Compare the borrower's losses with a classic 5%-penalty liquidation on the same path.",
    quiz: [
      ["What happens to a crvUSD borrower's collateral when price enters their bands?", ["It is gradually converted to crvUSD by an internal AMM", "It is seized all at once with a penalty", "Nothing until the price hits zero", "It is bridged to another chain"], "Soft liquidation converts band by band."],
      ["What is 'de-liquidation'?", ["Buying the collateral back as price recovers through the bands", "Cancelling a loan", "Minting new collateral", "A governance vote"], "The AMM runs both directions."],
      ["When does LLAMMA cost borrowers the most?", ["In choppy markets that repeatedly cross their bands", "When price only rises", "When nobody trades", "When gas is high"], "Each crossing trades against arbitrageurs, like LVR."]
    ]
  },
  {
    id: "u21l2", t: "ve(3,3): Solidly, Velodrome, Aerodrome and Aero", min: 12,
    sum: "Voters direct emissions and earn the fees and bribes of the pools they choose, and in October 2026 the two biggest ve(3,3) DEXs merge.",
    body: `<p><b>Solidly</b> (Andre Cronje, Feb 2022) combined Curve's vote-escrow model with "(3,3)" game theory. <b>Velodrome</b> (Optimism, 2022) made it work, and <b>Aerodrome</b> (Base, Aug 2023) became Base's largest DEX. The mechanics:</p>
<ul><li>Lock the token for up to 4 years to get <b>veNFT</b> voting power.</li>
<li>Each week, voters direct token <b>emissions</b> to pools.</li>
<li>Voters earn <b>100% of the trading fees</b> and any <b>bribes</b> of the pools they vote for. LPs earn emissions, not fees.</li>
<li>Lockers receive rebases so emissions don't dilute them. That's the "(3,3)": everyone locking is the cooperative equilibrium.</li>
<li>Protocols that want liquidity pay bribes instead of running their own farms. It's "liquidity as a service", the Curve Wars productized.</li></ul>
<pre><code>flywheel works while:  fees + bribes paid to voters  ≳  value of emissions they direct
otherwise emissions are just inflation sold by LPs</code></pre>
<h4>2026: Aero</h4>
<p>Aerodrome and Velodrome are scheduled to merge into <b>Aero</b> on October 21, 2026 (five days after this course's snapshot). It launches on seven chains (Base, Ethereum, Arc, OP Mainnet, Ink, Robinhood Chain, Arbitrum) with cross-chain swaps, dynamic fees and MEV capture. AERO holders receive 94.5% of the unified token and VELO holders 5.5%. Check the launch status.</p>`,
    keys: ["Lock → vote → voters earn fees and bribes", "LPs earn emissions; protocols bribe for liquidity", "Works when fees plus bribes cover emissions", "Aero merger scheduled Oct 21, 2026 across seven chains"],
    src: [
      ["Aero upgrade and launch hub", "https://aero.xyz/aero-upgrade/", "D", "Official merger details."],
      ["Crowdfund Insider: Aero confirms Oct 21 debut", "https://www.crowdfundinsider.com/2026/09/313187-unified-defi-protocol-aero-confirms-oct-21-debut/", "N", "Launch date, chains and token split."],
      ["The Block: Aerodrome expands to Ethereum and Arc", "https://www.theblock.co/post/378634/aerodrome-upgrades-evm-extensions-circles-arc-metadex", "N", "The upgrade suite behind Aero."],
      ["Curve docs and resources", "https://resources.curve.finance/", "D", "The vote-escrow model ve(3,3) builds on."]
    ],
    build: "Model one epoch of a ve(3,3) DEX in a spreadsheet: emissions, votes per pool, fees and bribes per pool. Compute voter APR per pool and find the bribe level at which a new pool attracts votes.",
    quiz: [
      ["In ve(3,3), who earns a pool's trading fees?", ["The veToken voters who directed emissions to that pool", "The pool's LPs", "The protocol treasury only", "Arbitrageurs"], "LPs get emissions, voters get fees and bribes."],
      ["Why do protocols pay bribes on ve(3,3) DEXs?", ["To attract votes that direct emissions, and so liquidity, to their pools", "To avoid audits", "To lower gas", "To mint more tokens"], "Bribes buy emissions, emissions buy liquidity."],
      ["When does the ve(3,3) flywheel break down?", ["When fees and bribes are small compared with the emissions sold by LPs", "When everyone locks", "When fees are high", "When there are many pools"], "Then emissions are just inflation."]
    ]
  },
  {
    id: "u21l3", t: "Onchain options", min: 12,
    sum: "Order-book options, AMM options, and options built from LP positions, plus where the volume is in 2026.",
    body: `<p>Options are harder onchain than perps: many strikes and expiries split liquidity, pricing needs volatility, and short positions need careful margining. The designs:</p>
<ul><li><b>Order book or RFQ</b>: <b>Derive</b> (formerly Lyra) and <b>Aevo</b> run options order books with portfolio margin. Derive reportedly handled about 79% of onchain options notional in September 2026 (about $3.8B).</li>
<li><b>AMM or pool writers</b>: Hegic-style pools sell options to traders. LPs are short volatility, and some pools delta-hedge on perp venues.</li>
<li><b>Options from LP positions</b>: <b>Panoptic</b> builds perpetual, oracle-free options on Uniswap v3 positions. A concentrated LP position is a short option, so borrowing and removing liquidity creates a long one, with premium streamed from fees.</li>
<li><b>Power perpetuals</b> (Paradigm, and Squeeth by Opyn): perps on price squared, giving option-like convexity with no strikes.</li></ul>
<h4>Market context</h4>
<p>Deribit dominates crypto options. Coinbase agreed to acquire it in 2025, which puts the main CEX options venue inside a US-listed company. Onchain options are growing but remain a fraction of that.</p>
<h4>Builder checklist</h4>
<p>You need a volatility surface (or no oracle, as in Panoptic), settlement-price oracles, liquidation of short options (Greeks-based margin), and a liquidity plan for many strikes. The usual answer is RFQ from market makers.</p>`,
    keys: ["Order-book options: Derive and Aevo", "LP positions are short options (Panoptic)", "Power perps give convexity without strikes", "Need vol data, settlement oracles and Greeks margin"],
    src: [
      ["Derive docs", "https://docs.derive.xyz/", "D", "Options and perps with portfolio margin."],
      ["Panoptic docs", "https://docs.panoptic.xyz/", "D", "Perpetual options built on Uniswap v3 liquidity."],
      ["Paradigm, Power Perpetuals", "https://www.paradigm.xyz/writing/power-perpetuals", "P", "Convex payoffs with funding instead of expiries."],
      ["Crypto Briefing: Derive leads onchain options", "https://cryptobriefing.com/derive-leads-onchain-options-volume-doubles/", "N", "2026 market-share data."]
    ],
    build: "Price a 1-week ETH call with Black–Scholes. Then show numerically that a Uniswap v3 position concentrated around that strike has a similar payoff to a short call, and compute what fee income it needs to break even.",
    quiz: [
      ["Why is a concentrated Uniswap v3 LP position like a short option?", ["It sells the asset as price rises through the range and buys as it falls, which is a concave payoff", "It pays a fixed coupon", "It can't lose money", "It has an expiry date"], "Panoptic turns that observation into an options protocol."],
      ["What is a main challenge of onchain options compared with perps?", ["Liquidity split across many strikes and expiries, plus volatility pricing", "Options can't be margined", "Options need no oracles", "Blocks are too fast"], "Perps have one market per asset. Options have a whole surface."],
      ["What do power perpetuals offer?", ["Option-like convexity with no strikes or expiries", "Fixed yield", "Zero risk", "Physical delivery"], "A perp on price squared is convex."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u22", t: "Privacy", tag: "Privacy",
  d: "How public ledgers leak, how shielded pools work, the Tornado Cash sanctions and trials, privacy pools, and the privacy tech beyond mixers.",
  lessons: [
  {
    id: "u22l1", t: "How ledgers leak, and how shielded pools work", min: 14,
    sum: "Commitments, nullifiers, Merkle trees and zero-knowledge proofs: the mechanics behind Zcash and Tornado-style pools.",
    body: `<p>Every transfer on a public chain is visible forever. Analysts cluster addresses by funding source, timing, gas patterns and exchange deposits, and one doxxed address can unmask a whole history.</p>
<h4>The shielded-pool pattern</h4>
<pre><code>deposit:   pick random nullifier n and secret s; commitment C = H(n, s)
           C is inserted into an onchain incremental Merkle tree
withdraw:  prove in zero knowledge: "I know (n, s, path) such that H(n, s) is a leaf under root R"
           public inputs: R, nullifierHash = H(n), recipient, relayer, fee
contract:  R is a recent root? nullifierHash unused? proof valid? → pay recipient, mark nullifier spent</code></pre>
<ul><li>The <b>nullifier</b> prevents double spending without revealing which leaf is yours.</li>
<li>Binding <b>recipient and fee</b> inside the proof stops anyone who sees your transaction from redirecting the funds.</li>
<li><b>Relayers</b> pay gas so the fresh address never needs funding, which would link it.</li>
<li>Fixed <b>denominations</b> stop amount matching. The <b>anonymity set</b> is everyone who deposited the same denomination before you withdrew.</li></ul>
<p>Zcash builds the same ideas into the protocol (shielded notes, Sapling and Orchard). <b>Stealth addresses</b> (ERC-5564) take a lighter approach: senders derive a fresh one-time address for the recipient.</p>
<p>The <b>shielded-pool lab</b> builds the whole structure in Solidity without the proof. One test shows a mempool watcher stealing a withdrawal, which is exactly what the ZK version prevents.</p>`,
    keys: ["Commitment = H(nullifier, secret) in a Merkle tree", "Nullifier hash stops double spends", "Proof binds recipient and fee; relayers break the gas link", "Anonymity set = same-denomination depositors"],
    src: [
      ["Course lab: ShieldedPoolLite", "https://github.com/argenestel/basis-points-academy/tree/main/labs/evm/src/privacy", "C", "The pool's data structures in Solidity, with the front-running weakness demonstrated."],
      ["tornado-core (code)", "https://github.com/tornadocash/tornado-core", "C", "The original circuits and Merkle tree contracts."],
      ["Zcash protocol specification", "https://zips.z.cash/protocol/protocol.pdf", "P", "Shielded notes, nullifiers and commitments in full."],
      ["ERC-5564: Stealth addresses", "https://eips.ethereum.org/EIPS/eip-5564", "D", "One-time addresses for recipients."],
      ["circom docs", "https://docs.circom.io/", "D", "Writing the withdraw circuit."]
    ],
    build: "Run the shielded-pool lab tests. Then write the withdraw circuit in circom or Noir (Merkle membership, nullifier hash, recipient as a public input), generate a Solidity verifier, and replace the lite withdraw with it.",
    quiz: [
      ["What does the nullifier hash accomplish?", ["Prevents double withdrawal without revealing which deposit is being spent", "Encrypts the deposit amount", "Pays the relayer", "Selects the Merkle root"], "Spent nullifier hashes are public; the link to the leaf isn't."],
      ["Why must the recipient be a public input bound by the proof?", ["Otherwise anyone who sees the pending transaction could redirect the withdrawal", "To make the proof smaller", "To pay less gas", "It is optional"], "The lab's front-running test shows the attack."],
      ["Why do shielded pools use fixed denominations?", ["So deposits and withdrawals can't be linked by matching amounts", "Because tokens have fixed supply", "To simplify gas", "Regulators require it"], "Unique amounts are fingerprints."]
    ]
  },
  {
    id: "u22l2", t: "Tornado Cash: sanctions and court cases", min: 12,
    sum: "From OFAC's 2022 sanctions to the Fifth Circuit ruling, the delisting, and Roman Storm's trial and 2027 retrial.",
    body: `<ul><li><b>Aug 8, 2022</b>: the US Treasury (OFAC) sanctioned Tornado Cash, including its immutable smart contracts, citing laundering by North Korea's Lazarus Group among others.</li>
<li><b>Netherlands</b>: developer Alexey Pertsev was arrested in 2022 and convicted of money laundering in May 2024 (64 months). He appealed.</li>
<li><b>Van Loon v. Treasury</b> (Fifth Circuit, Nov 26, 2024): immutable smart contracts are not "property" that OFAC can block under its sanctions law, so the sanctions on them exceeded Treasury's authority.</li>
<li><b>Mar 21, 2025</b>: Treasury removed Tornado Cash from the sanctions list.</li>
<li><b>Roman Storm</b> (co-founder, US): indicted in 2023. In <b>August 2025</b> a jury convicted him of conspiracy to operate an unlicensed money-transmitting business and deadlocked on money-laundering and sanctions charges. His acquittal motion was still pending in October 2026, and the retrial on the deadlocked counts was moved to <b>April 2027</b>.</li>
<li><b>Samourai Wallet</b>'s founders pleaded guilty in 2025 to unlicensed money transmission and were sentenced to prison.</li></ul>
<h4>What it means for builders</h4>
<p>The live questions are whether writing and publishing non-custodial code makes you a "money transmitter", and what duty a developer has to prevent misuse. Courts haven't settled them, and the answers differ by country. Practical steps: get legal advice before building privacy tools, avoid custody and fee capture that looks like a business you control, document compliance features (next lesson), and follow the Storm case.</p>
<p><i>Not legal advice. These cases are ongoing; check primary sources.</i></p>`,
    keys: ["OFAC sanctioned the contracts in 2022", "Fifth Circuit (2024): immutable contracts aren't sanctionable property; delisted 2025", "Storm convicted on one count in Aug 2025; retrial set for April 2027", "Developer liability is unsettled; get legal advice"],
    src: [
      ["Van Loon v. Treasury, Fifth Circuit opinion", "https://www.ca5.uscourts.gov/opinions/pub/23/23-50669-CV0.pdf", "P", "The 2024 ruling on sanctioning immutable contracts."],
      ["The Block: Storm retrial pushed to April 2027", "https://www.theblock.co/news/regulation/2026-08-26-tornado-cash-roman-storm-retrial-april-2027-412761", "N", "Latest schedule as of this snapshot."],
      ["CoinDesk: US seeks retrial for Roman Storm", "https://www.coindesk.com/business/2026/03/10/u-s-requests-october-retrial-for-tornado-cash-developer-roman-storm", "N", "Prosecutors' 2026 position."],
      ["CryptoSlate: DOJ presses on as Treasury drops mixer plan", "https://cryptoslate.com/doj-presses-tornado-cash-prosecution-as-treasury-drops-mixer-reporting-plan/", "N", "Policy context in 2026."]
    ],
    build: "Write a one-page timeline of the Tornado Cash cases with links to primary documents. For your own privacy-related design, list which features could look like money transmission and how you'd avoid custody.",
    quiz: [
      ["What did the Fifth Circuit decide in Van Loon v. Treasury (2024)?", ["Immutable smart contracts aren't 'property' OFAC can block, so the sanctions exceeded its authority", "Tornado Cash is legal everywhere", "Developers can't be prosecuted", "All mixers must register as banks"], "The ruling led to the 2025 delisting."],
      ["What was Roman Storm convicted of in August 2025?", ["Conspiracy to operate an unlicensed money-transmitting business", "Money laundering and sanctions violations", "Securities fraud", "Nothing; he was acquitted on all counts"], "The jury deadlocked on the other charges, which face retrial."],
      ["What is the main unsettled legal question for privacy-tool builders?", ["Whether publishing non-custodial code can make you a money transmitter or liable for misuse", "Whether zero-knowledge proofs are allowed", "Whether Ethereum is legal", "Whether open source can be licensed"], "Courts and countries haven't agreed yet."]
    ]
  },
  {
    id: "u22l3", t: "Privacy pools and compliant privacy", min: 12,
    sum: "Association sets, proofs of innocence and view keys: privacy that lets honest users show they're not with the hackers.",
    body: `<p>Buterin, Illum, Nadler, Schär and Soleimani (2023) proposed <b>privacy pools</b>. When withdrawing, you prove your deposit belongs to an <b>association set</b>, a subset of deposits that excludes known illicit ones, without revealing which deposit is yours. Honest users get privacy plus a credible signal; stolen funds can't join the good set.</p>
<ul><li><b>0xbow Privacy Pools</b> went live on Ethereum on March 31, 2025. An association set provider screens deposits, and deposits that are rejected can always <b>ragequit</b> (withdraw publicly to the original address), so it stays non-custodial.</li>
<li><b>Railgun</b>: shielded balances and private DeFi interactions across several EVM chains, with <b>Private Proofs of Innocence</b> that check that shielded funds didn't come from flagged sources.</li>
<li><b>Aztec</b>: a privacy-first ZK rollup on Ethereum with private smart contracts written in Noir. Its network went live in stages from late 2025 into 2026. Check its current status and maturity before relying on it.</li>
<li><b>View keys and selective disclosure</b>: users can reveal their history to an auditor or tax authority without making it public.</li></ul>
<h4>Design questions</h4>
<ol><li>Who curates association sets, and can they censor?</li>
<li>Is exit always possible, even for rejected users?</li>
<li>What does a regulator, or a court, see?</li>
<li>How large is the real anonymity set once screening splits it?</li></ol>`,
    keys: ["Association sets: prove membership in a 'clean' subset", "0xbow Privacy Pools live since Mar 2025, with ragequit", "Railgun Proofs of Innocence; Aztec private L2", "Selective disclosure with view keys"],
    src: [
      ["Buterin et al., Blockchain Privacy and Regulatory Compliance (privacy pools)", "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364", "P", "The association-set paper."],
      ["Privacy Pools docs (0xbow)", "https://docs.privacypools.com/", "D", "Association set providers, deposits, ragequit."],
      ["Railgun docs", "https://docs.railgun.org/", "D", "Shielded DeFi and Proofs of Innocence."],
      ["Aztec docs", "https://docs.aztec.network/", "D", "Private smart contracts on a ZK rollup."],
      ["The Block: the year pragmatic privacy took root", "https://www.theblock.co/post/383680/aztec-zcash-year-pragmatic-privacy-root", "N", "Aztec, Zcash and compliant privacy in context."]
    ],
    build: "Extend the shielded-pool lab: add an 'approved set' Merkle root maintained by a provider address, and require withdrawals to prove (in the lite version, show) membership in both trees. Add a ragequit for deposits never approved.",
    quiz: [
      ["What does a privacy-pools withdrawal prove besides membership?", ["That the deposit is in an association set that excludes known illicit deposits", "The depositor's identity", "The exact deposit transaction", "Nothing else"], "Privacy plus a credible 'not with the hackers' signal."],
      ["Why does 0xbow's design include ragequit?", ["So a deposit that is never approved can still exit, keeping the system non-custodial", "To punish hackers", "To pay relayers", "To mint tokens"], "Screening can't trap funds."],
      ["What do view keys allow?", ["Selective disclosure of history to chosen parties without making it public", "Faster proofs", "Higher yields", "Recovering lost keys"], "Compliance without full transparency."]
    ]
  },
  {
    id: "u22l4", t: "Beyond mixers: ZK, FHE, MPC and TEEs", min: 11,
    sum: "The privacy toolbox, from proving and computing on encrypted data to hardware enclaves and encrypted mempools.",
    body: `<div class="tbl"><table><thead><tr><th>Tech</th><th>What it hides</th><th>Trust</th><th>Used for</th></tr></thead><tbody>
<tr><td>Zero-knowledge proofs (circom, Noir, zkVMs)</td><td>Inputs to a computation</td><td>Math (plus a trusted setup for some SNARKs)</td><td>Shielded pools, private L2s, credentials</td></tr>
<tr><td>Fully homomorphic encryption (e.g. Zama's fhEVM)</td><td>Data while it is computed on</td><td>Math plus key holders (threshold decryption)</td><td>Confidential tokens and balances, sealed bids</td></tr>
<tr><td>Multi-party computation</td><td>Each party's input</td><td>An honest threshold of parties</td><td>Wallet key shares, private auctions</td></tr>
<tr><td>Trusted execution environments (SGX, TDX)</td><td>Data inside the enclave</td><td>Hardware vendor and attestation</td><td>Flashbots BuilderNet, private orderflow</td></tr>
<tr><td>Encrypted mempools (e.g. Shutter)</td><td>Transactions until they're ordered</td><td>A threshold keyper set</td><td>MEV and front-running protection</td></tr>
</tbody></table></div>
<p>On Solana, Token-2022's <b>confidential transfers</b> use ZK proofs to hide amounts. The proof program had a critical bug found and patched in 2025, so check its current status before you build on it.</p>
<h4>Choosing</h4>
<p>Need to <i>prove</i> something without revealing it? Use ZK. Need to <i>compute</i> on secrets from many users, like a sealed-bid auction or a private order book? Use FHE or MPC, and accept the cost. Need speed today and can accept hardware trust? Use TEEs. Need fair ordering? Encrypt until ordered.</p>`,
    keys: ["ZK proves without revealing", "FHE computes on encrypted data", "MPC splits trust; TEEs trust hardware", "Encrypted mempools hide transactions until they're ordered"],
    src: [
      ["Noir docs", "https://noir-lang.org/docs/", "D", "A Rust-like language for ZK circuits (used by Aztec)."],
      ["circom docs", "https://docs.circom.io/", "D", "The circuit language behind Tornado-style pools."],
      ["Zama docs", "https://docs.zama.ai/", "D", "FHE libraries and the fhEVM."],
      ["Shutter docs", "https://docs.shutter.network/", "D", "Threshold-encrypted mempools."],
      ["Flashbots writings", "https://writings.flashbots.net/", "P", "TEE-based block building (BuilderNet) and private orderflow."]
    ],
    build: "Write the same 'sealed-bid auction' three ways on paper: commit-reveal, ZK (prove bid ≤ budget without revealing it), and FHE (compute the max on encrypted bids). Compare trust, cost and latency.",
    quiz: [
      ["Which technique lets a contract compute on data that stays encrypted?", ["Fully homomorphic encryption", "Stealth addresses", "Merkle trees", "BLS signatures"], "FHE operates directly on ciphertexts."],
      ["What does a TEE-based system ask you to trust?", ["The hardware vendor and its attestation", "Only math", "Every validator", "Nobody"], "Enclaves are fast, but trust the chip."],
      ["What problem do encrypted mempools mainly address?", ["Front-running and MEV, by hiding transactions until they're ordered", "High gas prices", "Key loss", "Oracle manipulation"], "You can't front-run what you can't read."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u23", t: "Solana engineering", tag: "Solana",
  d: "Accounts, PDAs and CPIs, Anchor and its security pitfalls, SPL and Token-2022, and fees, MEV and performance on Solana.",
  lessons: [
  {
    id: "u23l1", t: "The Solana account model", min: 13,
    sum: "Programs are stateless; state lives in accounts; transactions declare every account up front.",
    body: `<p>On Ethereum, a contract owns its storage. On Solana, <b>programs are stateless</b> and all state lives in <b>accounts</b>:</p>
<pre><code>account = { lamports, data: bytes, owner: program id, executable: bool }
only the owner program may change data or debit lamports; anyone may credit lamports
accounts must hold a rent-exempt minimum balance proportional to their size (max 10 MiB)</code></pre>
<ul><li><b>PDAs</b> (program-derived addresses): addresses derived from seeds plus the program id, chosen to be off the ed25519 curve so no private key exists. Programs use them for deterministic state (["curve", mint]) and to "sign" with <code>invoke_signed</code>.</li>
<li><b>CPIs</b> (cross-program invocations): calling another program, for example the Token program to mint, passing the accounts it needs.</li>
<li><b>Transactions</b> list every account they will read or write. That's what lets Sealevel run non-conflicting transactions in parallel (Unit 2), and why hot accounts like a popular pool become bottlenecks.</li>
<li><b>Limits</b>: 1,232-byte transactions, 200k compute units per instruction by default and 1.4M per transaction. Address lookup tables (versioned transactions) fit more accounts.</li></ul>
<h4>Mental translation from EVM</h4>
<p>Contract storage becomes a set of program-owned accounts. A mapping becomes a PDA per key. msg.sender becomes a signer account. A token balance becomes a token account. "Calling a contract" becomes a CPI with explicit accounts.</p>`,
    keys: ["Stateless programs; state in owned accounts", "PDAs: deterministic, keyless, program-signed", "Transactions declare all accounts, which enables parallelism", "Compute-unit and size limits shape design"],
    src: [
      ["Solana docs: accounts", "https://solana.com/docs/core/accounts", "D", "The account model."],
      ["Solana docs: program-derived addresses", "https://solana.com/docs/core/pda", "D", "Seeds, bumps and signing."],
      ["Solana docs", "https://solana.com/docs", "D", "Transactions, CPIs and fees."],
      ["Course lab: solana-launchpad", "https://github.com/argenestel/basis-points-academy/tree/main/labs/solana-launchpad", "C", "PDAs as state and as mint authority in a real program."]
    ],
    build: "In the solana-launchpad lab, find where the curve PDA is derived, where it signs a CPI (mint_to), and where lamports move directly. Draw the accounts each instruction touches and mark them read or write.",
    quiz: [
      ["Where does a Solana program keep its state?", ["In separate accounts that the program owns", "Inside the program's own code account", "In a global key-value store", "In the validator's memory only"], "Programs are stateless; accounts hold data."],
      ["What makes a PDA useful?", ["A deterministic address with no private key that the program can sign for", "It's cheaper to create", "It can hold unlimited data", "It is encrypted"], "invoke_signed lets the program act as the PDA."],
      ["Why must Solana transactions list every account up front?", ["So the runtime can schedule non-conflicting transactions in parallel", "To compute fees", "To encrypt them", "Because of the EVM"], "Declared access is what makes Sealevel parallel."]
    ]
  },
  {
    id: "u23l2", t: "Anchor, and how Solana programs get hacked", min: 14,
    sum: "Account constraints do most of your security work, and missing checks caused Wormhole and Cashio.",
    body: `<p><b>Anchor</b> is the standard framework for Solana programs. You declare accounts and constraints, and Anchor generates the validation, serialization and an IDL for typed clients:</p>
<pre><code>#[derive(Accounts)]
pub struct Buy&lt;'info&gt; {
    #[account(mut)] pub buyer: Signer&lt;'info&gt;,                                  // must sign
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = curve.bump,
              has_one = mint, has_one = creator)] pub curve: Account&lt;'info, Curve&gt;, // owner + discriminator checked
    pub token_program: Program&lt;'info, Token&gt;,                                 // must be the real Token program
}</code></pre>
<h4>The classic Solana bugs</h4>
<ul><li><b>Missing signer check</b>: anyone can act for anyone.</li>
<li><b>Missing owner or type check</b> ("account substitution", "type cosplay"): an attacker passes a fake account with the same layout. Anchor's <code>Account&lt;T&gt;</code> checks the owner and an 8-byte discriminator.</li>
<li><b>Arbitrary CPI</b>: calling whatever "token program" the user passed. Use <code>Program&lt;Token&gt;</code>.</li>
<li><b>Non-canonical PDA bumps</b>, reinitialization, and closed accounts being revived.</li>
<li><b>Integer overflow</b> in release builds unless <code>overflow-checks = true</code>. Use checked math.</li></ul>
<p><b>Real losses</b>: Wormhole (Feb 2022, about $325M) accepted a spoofed system account in signature verification. Cashio (Mar 2022, about $48M) didn't validate the chain of collateral accounts, so fake collateral minted real stablecoins.</p>`,
    keys: ["Anchor constraints generate account validation", "Check signer, owner, type and program IDs", "Account substitution and arbitrary CPI are the classics", "Wormhole and Cashio were missing-validation bugs"],
    src: [
      ["Anchor docs", "https://www.anchor-lang.com/docs", "D", "Accounts, constraints, PDAs, CPIs and IDLs."],
      ["Sealevel attacks (coral-xyz)", "https://github.com/coral-xyz/sealevel-attacks", "C", "Insecure, secure and recommended versions of each classic bug."],
      ["rekt: Wormhole", "https://rekt.news/wormhole-rekt", "R", "Spoofed account in signature verification."],
      ["rekt: Cashio", "https://rekt.news/cashio-rekt", "R", "Unvalidated collateral accounts."]
    ],
    build: "In the solana-launchpad lab, remove 'has_one = creator' from Sell and write a TypeScript test where a seller passes their own wallet as 'creator' to steal the fee. Restore the constraint and show the test fails.",
    quiz: [
      ["What does Anchor's Account<'info, T> verify?", ["The account is owned by the program and has T's discriminator", "Only that it exists", "That it is a signer", "That it holds SOL"], "Owner plus discriminator checks stop type cosplay."],
      ["What was the root cause of the Cashio exploit?", ["Missing validation of the collateral account chain, so fake collateral was accepted", "A flash loan", "A bridge DVN", "An oracle delay"], "Unchecked accounts let the attacker substitute fakes."],
      ["Why declare token_program as Program<'info, Token>?", ["To ensure the CPI goes to the real Token program, not an attacker's", "To save compute", "To enable Token-2022", "It isn't needed"], "Arbitrary CPI is a classic Solana bug."]
    ]
  },
  {
    id: "u23l3", t: "Tokens on Solana: SPL, Token-2022 and extensions", min: 11,
    sum: "Mints, token accounts and authorities, plus the Token-2022 extensions that make tokens powerful, and dangerous.",
    body: `<ul><li>A <b>mint account</b> defines a token: supply, decimals, <b>mint authority</b> (who can create more) and <b>freeze authority</b> (who can freeze holders).</li>
<li>Balances live in <b>token accounts</b>, one per (owner, mint). The <b>associated token account</b> (ATA) is the canonical one, derived from the owner and the mint.</li>
<li>Trust signals buyers check: mint authority revoked or held by a program PDA (as in the launchpad lab), and no freeze authority.</li></ul>
<h4>Token-2022 extensions</h4>
<div class="tbl"><table><thead><tr><th>Extension</th><th>Use</th><th>Risk to holders</th></tr></thead><tbody>
<tr><td>Transfer fee</td><td>Protocol revenue on every transfer</td><td>Hidden tax</td></tr>
<tr><td>Transfer hook</td><td>Run a program on every transfer (compliance, royalties)</td><td>Can block sells (honeypot)</td></tr>
<tr><td>Permanent delegate</td><td>Issuer can move any holder's tokens (regulated assets)</td><td>Issuer can take your tokens</td></tr>
<tr><td>Confidential transfers</td><td>ZK-hidden amounts</td><td>Complexity; check proof-program status</td></tr>
<tr><td>Metadata, interest-bearing, non-transferable</td><td>Onchain metadata, rebasing display, soulbound tokens</td><td>Low</td></tr>
</tbody></table></div>
<p>Integrators (DEXs, lending markets, wallets) must decide which extensions they accept. A pool that accepts a token with a transfer hook or a permanent delegate inherits its issuer's power.</p>`,
    keys: ["Mint authority and freeze authority are trust signals", "ATAs: one canonical token account per owner and mint", "Token-2022 extensions add features and powers", "Integrators must allowlist extensions deliberately"],
    src: [
      ["Solana docs: tokens", "https://solana.com/docs/tokens", "D", "Mints, token accounts and ATAs."],
      ["Token-2022 docs", "https://www.solana-program.com/docs/token-2022", "D", "All extensions and how to use them."],
      ["Anchor docs", "https://www.anchor-lang.com/docs", "D", "anchor-spl helpers for token CPIs."]
    ],
    build: "Write a TypeScript script that takes any mint address and prints a risk report: program (Token or Token-2022), supply, decimals, mint and freeze authority, and every extension present, flagging transfer hooks and permanent delegates.",
    quiz: [
      ["Which mint setting lets an issuer stop holders from moving tokens?", ["Freeze authority", "Decimals", "Supply", "The ATA"], "Revoked freeze authority is a basic trust signal."],
      ["What can a Token-2022 permanent delegate do?", ["Move or burn tokens from any holder's account", "Only display metadata", "Lower fees", "Nothing on mainnet"], "Useful for regulated assets, dangerous elsewhere."],
      ["Why should a DEX allowlist Token-2022 extensions?", ["Because hooks or delegates can block trades or move pool funds", "To save compute", "For faster quotes", "Because Token-2022 is deprecated"], "Accepting a token means accepting its powers."]
    ]
  },
  {
    id: "u23l4", t: "Fees, MEV and performance on Solana", min: 12,
    sum: "Priority fees, local fee markets, Jito bundles, Firedancer and Alpenglow.",
    body: `<pre><code>fee = 5,000 lamports per signature (base) + compute-unit price × compute-unit limit (priority)
set both with ComputeBudget instructions; request only the CUs you need</code></pre>
<ul><li><b>Local fee markets</b>: contention on one hot account (a popular pool or mint) raises priority fees for transactions touching it, not for everyone.</li>
<li>Priority fees go entirely to the block leader since SIMD-0096 (2025), which aligns leaders with including high-fee transactions.</li>
<li><b>Jito</b>: a block engine where searchers submit <b>bundles</b> (atomic, ordered transactions) with tips to leaders. Jito shut its public mempool in March 2024 to curb sandwiching, but private sandwiching and spam remained issues. Protected routes and RFQ in aggregators help users.</li>
<li><b>Firedancer</b> (Jump's independent validator client) has run in full on mainnet since December 2025, adding client diversity.</li>
<li><b>Alpenglow</b> (SIMD-0326, approved by about 98% of validators in September 2025) replaces Tower BFT and Proof of History voting with a new consensus targeting about 100–150 ms finality. Mainnet activation was reportedly targeted for around October 2026; confirm before you rely on it.</li></ul>
<h4>For builders</h4>
<p>Design around hot accounts: shard state across PDAs, avoid one global account every trade writes, and keep compute low. Use bundles for multi-transaction atomicity. For order books, account contention is the main reason many Solana CLOBs moved to batching or to their own chains.</p>`,
    keys: ["Base fee per signature + CU price × CU limit", "Local fee markets: hot accounts cost more", "Jito bundles: atomic, ordered, tipped", "Firedancer live; Alpenglow targets ~150 ms finality"],
    src: [
      ["Solana docs: fees", "https://solana.com/docs/core/fees", "D", "Base fees, priority fees and compute budget."],
      ["Jito docs", "https://docs.jito.wtf/", "D", "Block engine, bundles and tips."],
      ["MadeOnSol: Alpenglow explained", "https://madeonsol.com/blog/solana-alpenglow-upgrade-explained", "N", "What Alpenglow changes."],
      ["Crypto Briefing: Firedancer ends Frankendancer support", "https://cryptobriefing.com/jump-firedancer-ends-frankendancer-support/", "N", "Client status heading into Alpenglow."]
    ],
    build: "Add ComputeBudget instructions to the launchpad's buy in your client: measure actual CUs with simulateTransaction, set the limit to measured + 10%, and add a priority fee from getRecentPrioritizationFees for the curve account.",
    quiz: [
      ["What is a local fee market on Solana?", ["Priority fees rise only for transactions touching a contended account", "Fees set by each wallet", "A DEX for fees", "Fees paid in local currency"], "Contention is per account, not chain-wide."],
      ["What does a Jito bundle guarantee?", ["Its transactions execute atomically and in order, or not at all", "Zero fees", "Privacy", "Faster finality"], "Searchers rely on atomic bundles."],
      ["What is Alpenglow?", ["A new Solana consensus protocol targeting about 100–150 ms finality", "A token standard", "A validator client by Jump", "A DEX"], "It replaces Tower BFT and PoH-based voting."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u24", t: "The Solana DeFi stack", tag: "Solana",
  d: "Aggregators and DEX designs, lending and liquid staking, and perps and order books on Solana.",
  lessons: [
  {
    id: "u24l1", t: "DEXs and aggregation on Solana", min: 12,
    sum: "Jupiter routes everything; Raydium, Orca, Meteora and proprietary AMMs supply the liquidity.",
    body: `<ul><li><b>Jupiter</b>: the dominant aggregator. Most Solana swaps route through it across dozens of venues, plus RFQ and limit, DCA and perps products. If you build a DEX on Solana, being integrated into Jupiter is your distribution.</li>
<li><b>Raydium</b>: constant-product and concentrated-liquidity pools, and LaunchLab, the bonding-curve launchpad behind LetsBonk. It was the graduation destination for pump.fun tokens until PumpSwap.</li>
<li><b>Orca Whirlpools</b>: concentrated liquidity (Unit 6's v3 ideas on Solana).</li>
<li><b>Meteora DLMM</b>: liquidity in discrete price <b>bins</b> with zero slippage inside a bin and dynamic fees that rise with volatility. It's popular for memecoin LPing.</li>
<li><b>Proprietary AMMs</b>: market-maker-run pools (for example HumidiFi) that update their quotes every slot, behaving like onchain RFQ. They reportedly captured a large share of SOL/USDC volume in 2025, because fresh quotes avoid LVR (Unit 6).</li></ul>
<h4>Design lessons</h4>
<p>On a fast chain with cheap updates, a market maker who can re-quote every slot beats a passive curve. That's the same reason onchain order books and RFQ win on Hyperliquid. Passive LPs remain for long-tail assets, where nobody else will quote.</p>`,
    keys: ["Jupiter is the routing layer", "Raydium, Orca and Meteora for curves, CL and bins", "Prop AMMs re-quote every slot and dodge LVR", "Aggregator integration is distribution"],
    src: [
      ["Jupiter developer docs", "https://dev.jup.ag/", "D", "Swap, quote and perps APIs."],
      ["Raydium docs", "https://docs.raydium.io/", "D", "CPMM, CLMM and LaunchLab."],
      ["Orca docs", "https://docs.orca.so/", "D", "Whirlpools concentrated liquidity."],
      ["Meteora docs", "https://docs.meteora.ag/", "D", "DLMM bins and dynamic fees."]
    ],
    build: "Call Jupiter's quote API for SOL→USDC at 1, 100 and 10,000 SOL. Record the route (venues and splits) and price impact, and explain why the route changes with size.",
    quiz: [
      ["What is Jupiter's role in Solana DeFi?", ["The main aggregator that routes swaps across many venues", "A lending protocol", "A validator client", "A stablecoin"], "Most flow reaches DEXs through Jupiter."],
      ["What is distinctive about Meteora's DLMM?", ["Liquidity sits in discrete price bins with dynamic fees", "It uses no liquidity", "It is an order book", "It only trades stablecoins"], "Bins give zero slippage within a bin."],
      ["Why did proprietary AMMs win flow on Solana in 2025?", ["They re-quote every slot, so they aren't picked off on stale prices", "They charge the highest fees", "They have no market makers", "They run on Ethereum"], "Fresh quotes avoid LVR."]
    ]
  },
  {
    id: "u24l2", t: "Lending, liquid staking and yield on Solana", min: 11,
    sum: "Kamino and friends for lending; JitoSOL, mSOL and Sanctum for staking; and the loops built on top.",
    body: `<ul><li><b>Lending</b>: <b>Kamino</b> (the largest, with lending markets plus automated liquidity vaults), MarginFi and Save (formerly Solend). Same mechanics as Unit 7: utilization curves, LTVs and liquidations. Pyth and Switchboard supply oracles.</li>
<li><b>Liquid staking</b>: <b>JitoSOL</b> (stake rewards plus a share of Jito MEV tips), <b>mSOL</b> (Marinade) and <b>Sanctum</b>, which unifies liquidity across many LSTs so small LSTs can be swapped instantly.</li>
<li><b>Loops</b>: deposit JitoSOL, borrow SOL, stake again, repeat (Unit 14). They work while staking yield exceeds SOL borrow cost, and break on LST depegs or borrow-rate spikes.</li></ul>
<h4>Solana-specific risks</h4>
<ul><li>Oracle choice and update frequency during congestion.</li>
<li>Account contention during liquidation cascades: many liquidators touching the same accounts.</li>
<li>Token-2022 collateral with extensions (Unit 23).</li>
<li>Program upgrade authorities: many Solana programs are upgradeable by a key, so check who holds it.</li></ul>`,
    keys: ["Kamino, MarginFi and Save for lending", "JitoSOL adds MEV tips to staking yield", "Sanctum unifies LST liquidity", "Check program upgrade authorities"],
    src: [
      ["Kamino docs", "https://docs.kamino.finance/", "D", "Lending markets and liquidity vaults."],
      ["Marinade docs", "https://docs.marinade.finance/", "D", "mSOL and native staking."],
      ["Jito docs", "https://docs.jito.wtf/", "D", "JitoSOL and how MEV tips reach stakers."],
      ["Pyth docs", "https://docs.pyth.network/", "D", "The dominant oracle on Solana."]
    ],
    build: "For one Kamino market, record LTV, liquidation threshold, oracle and the program upgrade authority. Then simulate a JitoSOL/SOL loop at 5x and find the borrow rate at which it loses money.",
    quiz: [
      ["What extra yield source does JitoSOL include?", ["A share of MEV tips paid through Jito", "Ethereum staking", "Bridge fees", "Token emissions only"], "Tips flow to validators and then stakers."],
      ["What does Sanctum do for LSTs?", ["Unifies liquidity so many small LSTs can be swapped efficiently", "Issues a stablecoin", "Runs validators for free", "Bridges to Ethereum"], "Shared liquidity lets long-tail LSTs exist."],
      ["Which Solana-specific risk should a lender check?", ["Who holds the program's upgrade authority", "The EVM version", "Blob fees", "Uniswap hooks"], "Upgradeable programs can be changed by a key."]
    ]
  },
  {
    id: "u24l3", t: "Perps and order books on Solana", min: 11,
    sum: "Pool perps (Jupiter), hybrid designs (Drift, now Velocity), onchain CLOBs (Phoenix, OpenBook), and why many perp venues left for appchains.",
    body: `<ul><li><b>Jupiter Perps</b>: an oracle-priced pool model like GMX (Unit 9). The <b>JLP</b> pool is every trader's counterparty, and LPs earn fees and trader losses while bearing trader PnL.</li>
<li><b>Drift</b>, rebranded <b>Velocity</b> in 2026: a hybrid with order book, AMM and just-in-time liquidity. It lost about $285–295M to an admin compromise in April 2026 and relaunched as a leaner perps-only venue (Unit 9, lesson 5).</li>
<li><b>Onchain order books</b>: <b>Phoenix</b> and <b>OpenBook v2</b> run limit order books in program accounts. They're fully transparent, but every order, cancel and fill writes to the same hot market accounts.</li></ul>
<h4>Why perps keep leaving general-purpose chains</h4>
<p>Market makers need cheap, instant cancels and fair ordering. On a shared chain they compete for blockspace with memecoins, pay priority fees in spikes, and can't get cancel-first ordering. That's the case for appchains like Hyperliquid (Unit 3), and it's why Solana teams experiment with batching, application-specific sequencing and dedicated execution layers.</p>
<p><b>Builder takeaway</b>: on Solana, pool-based perps are easiest to ship; CLOBs need careful account design and an MEV strategy.</p>`,
    keys: ["Jupiter Perps: a GMX-style JLP pool", "Drift became Velocity after a 2026 exploit", "Phoenix and OpenBook: onchain CLOBs with hot accounts", "Market makers need cheap cancels and fair ordering"],
    src: [
      ["Jupiter developer docs", "https://dev.jup.ag/", "D", "Perps and JLP."],
      ["Velocity (formerly Drift) docs", "https://docs.velocity.exchange/protocol", "D", "Hybrid perp design after the relaunch."],
      ["Phoenix (code)", "https://github.com/Ellipsis-Labs/phoenix-v1", "C", "An onchain limit order book on Solana."],
      ["OpenBook v2 (code)", "https://github.com/openbook-dex/openbook-v2", "C", "Community order book program."]
    ],
    build: "Read Phoenix's market account layout. Estimate how many orders, cancels and fills per second one market can handle under the compute and account-lock limits, and compare with Hyperliquid's published throughput.",
    quiz: [
      ["Who is the counterparty to traders on Jupiter Perps?", ["The JLP liquidity pool", "Other traders on an order book", "Jupiter's treasury", "Validators"], "A GMX-style pool model."],
      ["Why are onchain order books hard on a shared chain?", ["Every order and cancel writes to hot market accounts and competes for blockspace", "Order books can't be written in Rust", "Solana has no accounts", "Fees are zero"], "Contention and ordering hurt market makers."],
      ["What is the general case for perp appchains?", ["Control over ordering, cheap cancels and latency for market makers", "Lower security", "No validators", "No oracles"], "Unit 3's argument, seen from Solana."]
    ]
  }
  ]
});

window.BP_UNITS.push({
  id: "u25", t: "Frontier: Bitcoin DeFi, agent payments and proof of reserves", tag: "Frontier",
  d: "BTC staking and BitVM, x402 payments for AI agents, and proving an exchange or issuer is solvent.",
  lessons: [
  {
    id: "u25l1", t: "Bitcoin DeFi (BTCfi)", min: 12,
    sum: "Wrapped BTC trust models, Babylon's self-custodial staking, and BitVM's path to trust-minimized bridges.",
    body: `<p>Bitcoin is the largest crypto asset but has no general smart contracts. The ways to put BTC to work:</p>
<ul><li><b>Wrapped BTC on other chains</b>: WBTC (custodial, BitGo), cbBTC (Coinbase, 2024) and tBTC (threshold signers). Each is a bridge with the trust model in Unit 12.</li>
<li><b>Babylon BTC staking</b>: BTC stays on Bitcoin in a timelocked script. Stakers sign with <b>extractable one-time signatures</b>: if they double-sign for the proof-of-stake chain they secure, their key leaks and the BTC can be slashed. Babylon Genesis launched in April 2025, and about $5B of BTC was reported staked by August 2025.</li>
<li><b>BitVM</b> (2023 onward): verify arbitrary computation on Bitcoin optimistically, with fraud proofs played out in Bitcoin transactions. BitVM2 and BitVM3 aim at bridges that need only one honest party. Babylon's roadmap uses this for "trustless vaults". Check deployment status; much of this was still rolling out in 2026.</li>
<li><b>Layers</b>: Lightning (payments), Stacks with sBTC, and various sidechains and rollups with their own trust assumptions.</li></ul>
<h4>The builder's question</h4>
<p>For any BTCfi product: where is the BTC, who can move it, and what happens if they disappear or misbehave? Most "Bitcoin L2s" still answer "a federation or multisig".</p>`,
    keys: ["Wrapped BTC = a bridge trust model", "Babylon: timelocked BTC with slashable one-time signatures", "BitVM: optimistic verification on Bitcoin", "Ask where the BTC is and who can move it"],
    src: [
      ["Babylon: the road to BTCfi (roadmap)", "https://babylonlabs.io/blog/the-road-to-btcfi-babylons-2025-roadmap", "N", "Staking, multi-staking and trustless vaults."],
      ["BitVM", "https://bitvm.org/", "P", "Papers and resources on BitVM."],
      ["Mastering Bitcoin", "https://github.com/bitcoinbook/bitcoinbook", "K", "Script and timelocks, the building blocks of BTC staking."]
    ],
    build: "Write a Bitcoin Script (or Miniscript) policy for a staking output: the staker can spend after a timelock, or the staker plus a covenant committee can spend early. Explain where slashing fits.",
    quiz: [
      ["How does Babylon slash a BTC staker who double-signs?", ["Extractable one-time signatures leak the staker's key, letting the BTC be slashed", "Bitcoin miners vote", "A multisig seizes it", "The BTC is bridged first"], "Equivocation reveals the secret key."],
      ["What does BitVM enable?", ["Optimistic verification of computation on Bitcoin, aiming at bridges needing one honest party", "Smart contracts in Bitcoin Core", "Faster blocks", "A new token standard"], "Fraud proofs play out in Bitcoin transactions."],
      ["What is the key question for any wrapped BTC?", ["Who can move the underlying BTC, and what happens if they fail", "Its ticker", "Its decimals", "Its logo"], "It's the bridge trust question."]
    ]
  },
  {
    id: "u25l2", t: "Agent payments: x402 and agentic wallets", min: 11,
    sum: "HTTP 402 Payment Required comes back to life: machines paying machines in stablecoins, per request.",
    body: `<p><b>x402</b> (launched by Coinbase in 2025) uses the long-unused HTTP status <b>402 Payment Required</b> to let any client, including an AI agent, pay per request:</p>
<pre><code>1. client → GET /data
2. server → 402 + payment requirements (amount, asset e.g. USDC, network, payTo)
3. client signs a payment (e.g. EIP-3009 transferWithAuthorization) → retries with an X-PAYMENT header
4. server (or a facilitator) verifies and settles onchain → 200 + the data</code></pre>
<ul><li>No accounts or API keys, and payments as small as fractions of a cent on cheap chains.</li>
<li>The <b>x402 Foundation</b> (Coinbase and Cloudflare) stewards the standard. Reports in 2026 describe a move to the Linux Foundation and integrations by Google's AP2 and payment companies.</li>
<li>Adoption numbers in 2026 vary widely by source, so treat them as rough.</li></ul>
<h4>Security for agent wallets</h4>
<ul><li><b>Spend limits</b> and session keys (Unit 5): an agent should never hold an unlimited key.</li>
<li><b>Prompt injection</b>: content an agent reads can try to make it pay or approve. Require allowlists and human confirmation above thresholds.</li>
<li>Replay protection and expiry in signed authorizations, plus a refund and dispute path.</li></ul>`,
    keys: ["402 response → signed payment → retry", "EIP-3009 authorizations for USDC", "Stewarded by the x402 Foundation", "Agents need spend limits and injection defenses"],
    src: [
      ["x402", "https://www.x402.org/", "D", "Protocol overview and spec."],
      ["coinbase/x402 (code)", "https://github.com/coinbase/x402", "C", "Reference clients, servers and facilitator."],
      ["EIP-3009: Transfer with authorization", "https://eips.ethereum.org/EIPS/eip-3009", "D", "Signed, gasless USDC transfers used by x402."],
      ["BlockEden: x402 and the Linux Foundation", "https://blockeden.xyz/blog/2026/04/03/x402-linux-foundation-enterprise-ai-agent-payment-standard-stablecoin/", "N", "2026 governance and adoption context."]
    ],
    build: "Using the coinbase/x402 examples, put a paid endpoint in front of your funding-collector lab's data (0.001 USDC per call on a testnet), and write an agent client with a daily spend cap.",
    quiz: [
      ["What does an x402 server return when payment is required?", ["HTTP 402 with payment requirements", "HTTP 404", "A captcha", "An API key"], "The client pays and retries."],
      ["Which standard lets a client sign a USDC transfer that someone else submits?", ["EIP-3009 transferWithAuthorization", "ERC-721", "EIP-1559", "ERC-4626"], "Signed authorizations make gasless payments possible."],
      ["What is the biggest new risk for agent wallets?", ["Prompt injection tricking the agent into paying or approving", "High block times", "Too many decimals", "Lack of NFTs"], "Spend limits and allowlists contain the damage."]
    ]
  },
  {
    id: "u25l3", t: "Proof of reserves and solvency", min: 11,
    sum: "After FTX: Merkle-sum trees, zk proofs of solvency, and reserve feeds for stablecoins and wrapped assets.",
    body: `<p>FTX (2022) showed that "trust us" balance sheets fail. <b>Proof of reserves</b> tries to show that assets cover liabilities:</p>
<pre><code>liabilities: Merkle-SUM tree — each leaf (user_id_hash, balance); each node = (hash, sum of children)
  root sum = total liabilities; each user verifies their leaf is included
assets: sign messages with the exchange's addresses (or show onchain balances)
solvent if assets ≥ root sum</code></pre>
<p><b>Weaknesses</b>: omitted users or negative balances can shrink liabilities; borrowed assets can be shown temporarily; off-chain debts are invisible. <b>zk proofs of solvency</b> fix part of this. Binance published a zk-SNARK version in 2023 that proves every balance is non-negative and sums correctly without revealing them.</p>
<p><b>Onchain reserve feeds</b>: Chainlink Proof of Reserve publishes reserve data for wrapped assets and stablecoins, so a contract can, for example, refuse to mint wrapped BTC when reserves fall short.</p>
<p>Vitalik's 2022 essay is still the clearest guide, ending with the real goal: exchanges whose design makes stealing user funds impossible, not just visible.</p>`,
    keys: ["Merkle-sum tree proves total liabilities", "Signed addresses prove assets", "zk proofs add non-negativity and privacy", "Reserve feeds let contracts react to shortfalls"],
    src: [
      ["Vitalik, Having a safe CEX: proof of solvency and beyond", "https://vitalik.eth.limo/general/2022/11/19/proof_of_solvency.html", "P", "Merkle-sum trees, zk solvency and beyond."],
      ["Chainlink Proof of Reserve", "https://docs.chain.link/data-feeds/proof-of-reserve", "D", "Reserve data feeds for wrapped assets and stablecoins."],
      ["Gorton and Zhang, Taming Wildcat Stablecoins", "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3888752", "P", "Why reserve transparency matters for private money."]
    ],
    build: "Implement a Merkle-sum tree in Python or Rust with per-user inclusion proofs. Then show a test where the operator cheats by inserting a negative balance, and explain how a zk proof would catch it.",
    quiz: [
      ["What does a Merkle-sum tree's root prove?", ["The total of all included liabilities, with per-user inclusion proofs", "That assets exist", "That nobody withdrew", "The exchange's profit"], "Each node carries the sum of its children."],
      ["Which cheat does a plain Merkle-sum proof NOT stop?", ["Inserting negative balances or omitting users to shrink liabilities", "Changing the hash function", "Users verifying their leaf", "Publishing the root"], "zk proofs can enforce non-negativity."],
      ["How can a contract use Proof of Reserve feeds?", ["By refusing to mint wrapped tokens when reported reserves fall short", "By raising gas fees", "By pausing Ethereum", "By issuing NFTs"], "Reserves become an onchain input."]
    ]
  }
  ]
});

window.BP_TRACKS = [
  { id: "all", t: "Full course", who: "Everything, in unit order.", units: null },
  { id: "evm", t: "EVM DeFi builder", who: "Ship a protocol on Ethereum or an L2.", units: ["u1", "u2", "u5", "u18", "u6", "u7", "u8", "u21", "u11", "u15", "u16", "u17"] },
  { id: "perps", t: "Perps and market structure", who: "Build or trade derivatives venues.", units: ["u1", "u2", "u9", "u11", "u10", "u21", "u15", "u16", "u17"] },
  { id: "chains", t: "Chain builder", who: "Build L1s, rollups and bridges.", units: ["u2", "u3", "u4", "u12", "u18", "u15"] },
  { id: "solana", t: "Solana builder", who: "Programs, tokens and DeFi on Solana.", units: ["u1", "u2", "u23", "u24", "u20", "u9", "u11", "u15"] },
  { id: "privacy", t: "Privacy engineer", who: "Shielded pools, ZK and the law around them.", units: ["u2", "u4", "u22", "u19", "u15"] },
  { id: "launch", t: "Launch and tokens", who: "Fundraising, tokenomics, launchpads and governance.", units: ["u1", "u13", "u20", "u19", "u21", "u16", "u17"] },
  { id: "frontier", t: "Frontier", who: "BTCfi, agent payments, RWAs and new primitives.", units: ["u25", "u10", "u14", "u22", "u8"] }
];
