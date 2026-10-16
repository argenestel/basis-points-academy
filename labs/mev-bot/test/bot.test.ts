import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { parseUnits } from "viem";
import { startAnvil, KEYS } from "../src/anvil.js";
import { A, clients, read, write, type Clients } from "../src/chain.js";
import { amountOut, arbProfit, optimalArb } from "../src/math.js";
import { Bot } from "../src/bot.js";
import { buildWorld, type World } from "../src/scenario.js";

const e18 = (n: string) => parseUnits(n, 18);
let chain: { url: string; stop: () => void };
let me: Clients, borrower: Clients, rival: Clients;
let w: World;
let bot: Bot;

before(async () => {
  chain = await startAnvil(8549);
  me = clients(chain.url, KEYS[0]);
  borrower = clients(chain.url, KEYS[1]);
  rival = clients(chain.url, KEYS[2]);
  w = await buildWorld(me, borrower);
  bot = new Bot(me, {
    executor: w.executor, quote: w.usd, pairs: [w.cheap, w.rich],
    lending: { pool: w.pool, loanToken: w.usd, oracle: w.oracle },
    minProfit: e18("10"), arbCapital: e18("200000"), liqCapital: e18("50000"), maxLoss: e18("1000"),
  });
});
after(() => chain?.stop());

test("off-chain amountOut matches Pair.getAmountOut exactly", async () => {
  const onchain = await read<bigint>(me, w.cheap, A.pair.abi, "getAmountOut", [e18("1234.5"), e18("1900000"), e18("1000")]);
  assert.equal(amountOut(e18("1234.5"), e18("1900000"), e18("1000")), onchain);
});

test("optimal size beats nearby sizes (profit is concave)", () => {
  const buy = { rX: e18("1900000"), rY: e18("1000") }, sell = { rX: e18("2100000"), rY: e18("1000") };
  const best = optimalArb(buy, sell, e18("200000"));
  assert.ok(best.profit > 0n);
  for (const d of [e18("1000"), e18("5000")]) {
    assert.ok(arbProfit(best.amountIn - d, buy, sell) <= best.profit);
    assert.ok(arbProfit(best.amountIn + d, buy, sell) <= best.profit);
  }
});

test("finds and executes the arbitrage; realized profit equals the prediction", async () => {
  const before = await read<bigint>(me, w.usd, A.token.abi, "balanceOf", [w.executor]);
  const ops = await bot.plan();
  const arb = ops.find((o) => o.kind === "arb");
  assert.ok(arb, "expected an arbitrage");
  const out = await bot.execute(arb!);
  assert.equal(out.status, "executed");
  assert.equal(out.realized, arb!.expectedProfit, "exact rounding makes prediction == execution");
  assert.equal(await read<bigint>(me, w.usd, A.token.abi, "balanceOf", [w.executor]), before + arb!.expectedProfit);
});

test("does nothing once the gap is closed (no gas wasted)", async () => {
  const block = await me.pub.getBlockNumber();
  const ops = await bot.plan();
  assert.equal(ops.filter((o) => o.kind === "arb").length, 0);
  assert.equal(await me.pub.getBlockNumber(), block);
});

test("a rival closing the gap first makes simulation fail, so the bot skips without sending", async () => {
  // re-open a gap by dumping ETH into the cheap pool
  await write(rival, w.eth, A.token.abi, "mint", [rival.account.address, e18("60")]);
  await write(rival, w.eth, A.token.abi, "transfer", [w.cheap, e18("60")]);
  const [r0, r1] = await read<readonly [bigint, bigint]>(rival, w.cheap, A.pair.abi, "getReserves");
  const ethIsToken0 = (await read<string>(rival, w.cheap, A.pair.abi, "token0")).toLowerCase() === w.eth.toLowerCase();
  const usdOut = ethIsToken0 ? amountOut(e18("60"), r0, r1) : amountOut(e18("60"), r1, r0);
  await write(rival, w.cheap, A.pair.abi, "swap", ethIsToken0 ? [0n, usdOut, rival.account.address] : [usdOut, 0n, rival.account.address]);

  const ops = await bot.plan();
  const arb = ops.find((o) => o.kind === "arb");
  assert.ok(arb, "gap re-opened");
  // rival front-runs: buys the cheap ETH back before our transaction
  const [c0, c1] = await read<readonly [bigint, bigint]>(rival, w.cheap, A.pair.abi, "getReserves");
  const usdIn = e18("150000");
  await write(rival, w.usd, A.token.abi, "mint", [rival.account.address, usdIn]);
  await write(rival, w.usd, A.token.abi, "transfer", [w.cheap, usdIn]);
  const ethOut = ethIsToken0 ? amountOut(usdIn, c1, c0) : amountOut(usdIn, c0, c1);
  await write(rival, w.cheap, A.pair.abi, "swap", ethIsToken0 ? [ethOut, 0n, rival.account.address] : [0n, ethOut, rival.account.address]);

  const block = await me.pub.getBlockNumber();
  const out = await bot.execute(arb!);
  assert.equal(out.status, "skipped");
  assert.match(out.reason ?? "", /NOT_PROFITABLE/);
  assert.equal(await me.pub.getBlockNumber(), block, "nothing was sent");
});

test("liquidates an unhealthy borrower after the price drops, at a profit", async () => {
  await write(me, w.oracle, A.oracle.abi, "set", [e18("1800")]); // HF ≈ 0.96
  const hfBefore = await read<bigint>(me, w.pool, A.lending.abi, "healthFactor", [borrower.account.address]);
  assert.ok(hfBefore < e18("1"));
  const ethBefore = await read<bigint>(me, w.eth, A.token.abi, "balanceOf", [me.account.address]);
  const outcomes = await bot.tick();
  const liq = outcomes.find((o) => o.op.kind === "liquidation");
  assert.ok(liq && liq.status === "executed", JSON.stringify(outcomes.map((o) => [o.op.kind, o.status, o.reason])));
  assert.ok((liq!.realized ?? 0n) > 0n);
  assert.ok((await read<bigint>(me, w.eth, A.token.abi, "balanceOf", [me.account.address])) > ethBefore);
  assert.ok((await read<bigint>(me, w.pool, A.lending.abi, "healthFactor", [borrower.account.address])) > hfBefore);
  assert.ok(bot.pnl > 0n);
});
