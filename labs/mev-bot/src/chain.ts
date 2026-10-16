// Clients, Foundry artifacts and the simulate -> write -> wait pattern.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, type Abi, type Account, type Address, type Hex, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "evm", "out");

export function artifact(file: string, contract: string): { abi: Abi; bytecode: Hex } {
  const json = JSON.parse(readFileSync(join(OUT, file, `${contract}.json`), "utf8"));
  return { abi: json.abi as Abi, bytecode: json.bytecode.object as Hex };
}

export const A = {
  token: artifact("ERC20.sol", "MockToken"),
  pair: artifact("Pair.sol", "Pair"),
  executor: artifact("ArbExecutor.sol", "ArbExecutor"),
  lending: artifact("LendingPool.sol", "LendingPool"),
  oracle: artifact("LendingPool.sol", "MockOracle"),
};

export type Clients = { pub: PublicClient; wallet: WalletClient; account: Account };

export function clients(rpcUrl: string, privateKey: Hex): Clients {
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);
  return { account, pub: createPublicClient({ chain: foundry, transport }), wallet: createWalletClient({ account, chain: foundry, transport }) };
}

export async function deploy(c: Clients, a: { abi: Abi; bytecode: Hex }, args: unknown[] = []): Promise<Address> {
  const hash = await c.wallet.deployContract({ abi: a.abi, bytecode: a.bytecode, args, account: c.account, chain: foundry });
  const r = await c.pub.waitForTransactionReceipt({ hash });
  if (!r.contractAddress) throw new Error("deploy failed");
  return r.contractAddress;
}

export async function write(c: Clients, address: Address, abi: Abi, functionName: string, args: unknown[]) {
  const { request } = await c.pub.simulateContract({ address, abi, functionName, args, account: c.account });
  const hash = await c.wallet.writeContract(request);
  const receipt = await c.pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted`);
  return receipt;
}

export async function read<T>(c: Clients, address: Address, abi: Abi, functionName: string, args: unknown[] = []): Promise<T> {
  return (await c.pub.readContract({ address, abi, functionName, args })) as T;
}
