// npm run demo: one arbitrage, one liquidation, with the bot's reasoning printed.
import { formatUnits, parseUnits } from "viem";
import { startAnvil, KEYS } from "./anvil.js";
import { A, clients, write } from "./chain.js";
import { Bot, type Outcome } from "./bot.js";
import { buildWorld } from "./scenario.js";

const e18 = (n: string) => parseUnits(n, 18);
const usd = (x: bigint) => "$" + Number(formatUnits(x, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });
const print = (o: Outcome) => console.log(
  o.op.kind === "arb"
    ? `  arb: buy on ${o.op.buy.slice(0, 8)}…, sell on ${o.op.sell.slice(0, 8)}…, size ${usd(o.op.amountIn)}, predicted ${usd(o.op.expectedProfit)} -> ${o.status}${o.realized !== undefined ? " " + usd(o.realized) : ""}${o.reason ? " (" + o.reason + ")" : ""}`
    : `  liquidation of ${o.op.borrower.slice(0, 8)}…: repay ${usd(o.op.repay)}, predicted ${usd(o.op.expectedProfit)} -> ${o.status}${o.realized !== undefined ? " " + usd(o.realized) : ""}`);

const chain = await startAnvil(8550);
try {
  const me = clients(chain.url, KEYS[0]);
  const w = await buildWorld(me, clients(chain.url, KEYS[1]));
  const bot = new Bot(me, {
    executor: w.executor, quote: w.usd, pairs: [w.cheap, w.rich], lending: { pool: w.pool, loanToken: w.usd, oracle: w.oracle },
    minProfit: e18("10"), arbCapital: e18("200000"), liqCapital: e18("50000"), maxLoss: e18("1000"),
  });
  console.log("block 1: ETH is $1,900 on one pool and $2,100 on the other");
  (await bot.tick()).forEach(print);
  console.log("block 2: nothing left to do");
  const quiet = await bot.tick();
  if (!quiet.length) console.log("  (no opportunity above the $10 minimum; no transaction sent)");
  console.log("block 3: the oracle drops ETH to $1,800, pushing a borrower below health factor 1");
  await write(me, w.oracle, A.oracle.abi, "set", [e18("1800")]);
  (await bot.tick()).forEach(print);
  console.log(`total PnL: ${usd(bot.pnl)}`);
} finally {
  chain.stop();
}
