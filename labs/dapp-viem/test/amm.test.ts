import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { parseUnits, type Address } from "viem";
import { startAnvil, KEYS } from "../src/anvil.js";
import { PAIR, TOKEN, SlippageError, balanceOf, clients, deployFixture, quoteExactIn, revertReason, swapExactIn, swapsSince, write, type Clients } from "../src/amm.js";

let chain: { url: string; stop: () => void };
let alice: Clients;
let bob: Clients;
let f: { tokenA: Address; tokenB: Address; pair: Address };
let startBlock: bigint;

before(async () => {
  chain = await startAnvil(8547);
  alice = clients(chain.url, KEYS[0]);
  bob = clients(chain.url, KEYS[1]);
  startBlock = await alice.pub.getBlockNumber();
  f = await deployFixture(alice, parseUnits("100", 18), parseUnits("300000", 18));
});

after(() => chain?.stop());

test("quote matches the constant-product formula with a 0.30% fee", async () => {
  const { amountOut } = await quoteExactIn(alice, f.pair, f.tokenA, parseUnits("1", 18));
  const dxEff = parseUnits("1", 18) * 9970n;
  const expected = (dxEff * parseUnits("300000", 18)) / (parseUnits("100", 18) * 10000n + dxEff);
  assert.equal(amountOut, expected);
});

test("swap delivers at least the slippage-protected minimum", async () => {
  const amountIn = parseUnits("1", 18);
  const { amountOut } = await quoteExactIn(alice, f.pair, f.tokenA, amountIn);
  const got = await swapExactIn(alice, f.pair, f.tokenA, f.tokenB, amountIn, (amountOut * 9950n) / 10000n);
  assert.ok(got >= (amountOut * 9950n) / 10000n);
});

test("a stale minimum is rejected after someone else moves the price", async () => {
  const amountIn = parseUnits("1", 18);
  const { amountOut: staleQuote } = await quoteExactIn(alice, f.pair, f.tokenA, amountIn);
  // bob front-runs with a big buy of B, pushing the A->B price down
  await write(alice, f.tokenA, TOKEN.abi, "mint", [bob.account.address, parseUnits("50", 18)]);
  await swapExactIn(bob, f.pair, f.tokenA, f.tokenB, parseUnits("20", 18), 0n);
  await assert.rejects(swapExactIn(alice, f.pair, f.tokenA, f.tokenB, amountIn, staleQuote), SlippageError);
});

test("simulation surfaces the contract's revert reason before sending", async () => {
  await write(alice, f.tokenA, TOKEN.abi, "transfer", [f.pair, parseUnits("1", 18)]);
  const reserveB = (await alice.pub.readContract({ address: f.pair, abi: PAIR.abi, functionName: "getReserves" }) as readonly [bigint, bigint]);
  try {
    // ask for far more than 1 A can buy: the K check must fail
    await alice.pub.simulateContract({ address: f.pair, abi: PAIR.abi, functionName: "swap", args: [0n, reserveB[1] / 2n, alice.account.address], account: alice.account });
    assert.fail("simulation should revert");
  } catch (e) {
    assert.equal(revertReason(e), "K");
  }
});

test("Swap events can be read back for a trade history", async () => {
  const events = await swapsSince(alice, f.pair, startBlock);
  assert.ok(events.length >= 2);
  assert.ok((await balanceOf(alice, f.tokenB, alice.account.address)) > 0n);
});
