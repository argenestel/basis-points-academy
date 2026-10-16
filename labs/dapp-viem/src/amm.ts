// viem client for the AMM lab (labs/evm/src/amm/Pair.sol). Course Unit 18, lesson 2.
//
// The pattern for every write: read state -> simulate the call -> send -> wait for the receipt -> check the result.
// Simulation runs the exact call against current state first, so reverts surface with a decoded reason
// before you pay gas.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  http,
  type Abi,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "..", "evm", "out");

/** Load ABI and bytecode produced by `forge build` in labs/evm. */
export function artifact(file: string, contract: string): { abi: Abi; bytecode: Hex } {
  const json = JSON.parse(readFileSync(join(OUT, file, `${contract}.json`), "utf8"));
  return { abi: json.abi as Abi, bytecode: json.bytecode.object as Hex };
}

export const TOKEN = artifact("ERC20.sol", "MockToken");
export const PAIR = artifact("Pair.sol", "Pair");

export type Clients = { pub: PublicClient; wallet: WalletClient; account: Account };

export function clients(rpcUrl: string, privateKey: Hex): Clients {
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);
  return {
    account,
    pub: createPublicClient({ chain: foundry, transport }),
    wallet: createWalletClient({ account, chain: foundry, transport }),
  };
}

async function deploy(c: Clients, a: { abi: Abi; bytecode: Hex }, args: unknown[]): Promise<Address> {
  const hash = await c.wallet.deployContract({ abi: a.abi, bytecode: a.bytecode, args, account: c.account, chain: foundry });
  const receipt = await c.pub.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("deployment failed");
  return receipt.contractAddress;
}

/** Simulate, then send, then wait. Returns the receipt. */
export async function write(c: Clients, address: Address, abi: Abi, functionName: string, args: unknown[]) {
  const { request } = await c.pub.simulateContract({ address, abi, functionName, args, account: c.account });
  const hash = await c.wallet.writeContract(request);
  const receipt = await c.pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted in ${hash}`);
  return receipt;
}

export async function balanceOf(c: Clients, token: Address, who: Address): Promise<bigint> {
  return (await c.pub.readContract({ address: token, abi: TOKEN.abi, functionName: "balanceOf", args: [who] })) as bigint;
}

/** Deploy two tokens and a pair, mint to the deployer and seed liquidity. */
export async function deployFixture(c: Clients, seedA: bigint, seedB: bigint) {
  const tokenA = await deploy(c, TOKEN, ["Token A", "A", 18]);
  const tokenB = await deploy(c, TOKEN, ["Token B", "B", 18]);
  const pair = await deploy(c, PAIR, [tokenA, tokenB]);
  const me = c.account.address;
  await write(c, tokenA, TOKEN.abi, "mint", [me, seedA * 10n]);
  await write(c, tokenB, TOKEN.abi, "mint", [me, seedB * 10n]);
  await write(c, tokenA, TOKEN.abi, "transfer", [pair, seedA]);
  await write(c, tokenB, TOKEN.abi, "transfer", [pair, seedB]);
  await write(c, pair, PAIR.abi, "mint", [me]);
  return { tokenA, tokenB, pair };
}

/** Quote an exact-input swap using the pair's own getAmountOut (same rounding as the contract). */
export async function quoteExactIn(c: Clients, pair: Address, tokenIn: Address, amountIn: bigint) {
  const [token0, reserves] = await Promise.all([
    c.pub.readContract({ address: pair, abi: PAIR.abi, functionName: "token0" }) as Promise<Address>,
    c.pub.readContract({ address: pair, abi: PAIR.abi, functionName: "getReserves" }) as Promise<readonly [bigint, bigint]>,
  ]);
  const zeroForOne = tokenIn.toLowerCase() === token0.toLowerCase();
  const [rIn, rOut] = zeroForOne ? reserves : [reserves[1], reserves[0]];
  const amountOut = (await c.pub.readContract({ address: pair, abi: PAIR.abi, functionName: "getAmountOut", args: [amountIn, rIn, rOut] })) as bigint;
  const midPriceOut = (amountIn * rOut) / rIn; // what you'd get with zero fee and zero impact
  const impactBps = midPriceOut === 0n ? 0n : ((midPriceOut - amountOut) * 10_000n) / midPriceOut;
  return { amountOut, zeroForOne, impactBps };
}

export class SlippageError extends Error {}

/**
 * Exact-input swap with a slippage limit. Two transactions (transfer in, then swap), because Pair is "pull" based.
 * A Router contract would make this atomic: that's the AMM lab's exercise 1.
 */
export async function swapExactIn(c: Clients, pair: Address, tokenIn: Address, tokenOut: Address, amountIn: bigint, minOut: bigint) {
  const { amountOut, zeroForOne } = await quoteExactIn(c, pair, tokenIn, amountIn);
  if (amountOut < minOut) throw new SlippageError(`quote ${amountOut} is below your minimum ${minOut}`);
  const me = c.account.address;
  const before = await balanceOf(c, tokenOut, me);
  await write(c, tokenIn, TOKEN.abi, "transfer", [pair, amountIn]);
  await write(c, pair, PAIR.abi, "swap", zeroForOne ? [0n, amountOut, me] : [amountOut, 0n, me]);
  const received = (await balanceOf(c, tokenOut, me)) - before;
  if (received < minOut) throw new SlippageError(`received ${received} < ${minOut}`);
  return received;
}

/** Turn a viem error into the contract's revert reason, if there is one. */
export function revertReason(err: unknown): string | undefined {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) return revert.reason ?? revert.data?.errorName;
  }
  return undefined;
}

/** Read Swap events, e.g. to build a trade history or a price chart. */
export async function swapsSince(c: Clients, pair: Address, fromBlock: bigint) {
  return c.pub.getContractEvents({ address: pair, abi: PAIR.abi, eventName: "Swap", fromBlock });
}
