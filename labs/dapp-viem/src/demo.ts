// npm run demo: deploy, quote, swap, and read events on a local chain.
import { formatUnits, parseUnits } from "viem";
import { startAnvil, KEYS } from "./anvil.js";
import { clients, deployFixture, quoteExactIn, swapExactIn, swapsSince } from "./amm.js";

const chain = await startAnvil(8548);
try {
  const c = clients(chain.url, KEYS[0]);
  const start = await c.pub.getBlockNumber();
  const { tokenA, tokenB, pair } = await deployFixture(c, parseUnits("100", 18), parseUnits("300000", 18));
  console.log(`pair ${pair}: 100 A / 300,000 B`);

  for (const size of ["1", "10"]) {
    const q = await quoteExactIn(c, pair, tokenA, parseUnits(size, 18));
    console.log(`quote ${size} A -> ${formatUnits(q.amountOut, 18)} B (fee + price impact ${Number(q.impactBps) / 100}%)`);
  }

  const amountIn = parseUnits("1", 18);
  const q = await quoteExactIn(c, pair, tokenA, amountIn);
  const minOut = (q.amountOut * 9_950n) / 10_000n; // 0.5% slippage tolerance
  const got = await swapExactIn(c, pair, tokenA, tokenB, amountIn, minOut);
  console.log(`swapped 1 A for ${formatUnits(got, 18)} B (min was ${formatUnits(minOut, 18)})`);

  const events = await swapsSince(c, pair, start);
  console.log(`Swap events since block ${start}: ${events.length}`);
} finally {
  chain.stop();
}
