// A small world on a local chain: two mispriced ETH/USD pools and a lending market with a borrower near the edge.
import { parseUnits, type Address } from "viem";
import { A, deploy, write, type Clients } from "./chain.js";

const e18 = (n: string) => parseUnits(n, 18);

export type World = { usd: Address; eth: Address; cheap: Address; rich: Address; executor: Address; pool: Address; oracle: Address };

async function seed(c: Clients, pair: Address, eth: Address, usd: Address, ethAmt: bigint, usdAmt: bigint) {
  const me = c.account.address;
  await write(c, eth, A.token.abi, "mint", [me, ethAmt]);
  await write(c, usd, A.token.abi, "mint", [me, usdAmt]);
  await write(c, eth, A.token.abi, "transfer", [pair, ethAmt]);
  await write(c, usd, A.token.abi, "transfer", [pair, usdAmt]);
  await write(c, pair, A.pair.abi, "mint", [me]);
}

/** `bot` deploys and owns the executor; `borrower` opens a loan at health factor ~1.06. */
export async function buildWorld(bot: Clients, borrower: Clients): Promise<World> {
  const usd = await deploy(bot, A.token, ["USD", "USD", 18]);
  const eth = await deploy(bot, A.token, ["Ether", "ETH", 18]);
  const cheap = await deploy(bot, A.pair, [eth, usd]);
  const rich = await deploy(bot, A.pair, [eth, usd]);
  await seed(bot, cheap, eth, usd, e18("1000"), e18("1900000")); // ETH ≈ $1,900 here
  await seed(bot, rich, eth, usd, e18("1000"), e18("2100000")); // ETH ≈ $2,100 here

  const executor = await deploy(bot, A.executor);
  await write(bot, usd, A.token.abi, "mint", [executor, e18("200000")]);

  const oracle = await deploy(bot, A.oracle);
  await write(bot, oracle, A.oracle.abi, "set", [e18("2000")]);
  const pool = await deploy(bot, A.lending, [usd, eth, oracle]);
  // the bot account also acts as a supplier and keeps USD for liquidations
  await write(bot, usd, A.token.abi, "mint", [bot.account.address, e18("1100000")]);
  await write(bot, usd, A.token.abi, "approve", [pool, e18("1000000")]);
  await write(bot, pool, A.lending.abi, "supply", [e18("1000000")]);

  await write(bot, eth, A.token.abi, "mint", [borrower.account.address, e18("10")]);
  await write(borrower, eth, A.token.abi, "approve", [pool, e18("10")]);
  await write(borrower, pool, A.lending.abi, "depositCollateral", [e18("10")]);
  await write(borrower, pool, A.lending.abi, "borrow", [e18("16000")]); // HF = 20,000 × 0.85 / 16,000 ≈ 1.06
  return { usd, eth, cheap, rich, executor, pool, oracle };
}
