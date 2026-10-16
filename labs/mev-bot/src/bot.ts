// The searcher loop: collect -> mirror state -> plan -> simulate -> execute -> account.
import { BaseError, ContractFunctionRevertedError, decodeEventLog, type Address } from "viem";
import { A, read, type Clients } from "./chain.js";
import { findArb, type ArbOpportunity, type PoolView } from "./strategies/arbitrage.js";
import { planLiquidations, type BorrowerView, type LiquidationOpportunity } from "./strategies/liquidation.js";

export type BotConfig = {
  executor: Address; // ArbExecutor owned by this account, holding `quote` capital
  quote: Address; // the token profits are measured in (USD)
  pairs: Address[];
  lending?: { pool: Address; loanToken: Address; oracle: Address };
  minProfit: bigint; // must exceed gas cost; in quote units
  arbCapital: bigint; // max size per arbitrage
  liqCapital: bigint; // max repay per tick, from the bot wallet
  maxLoss: bigint; // kill switch: stop if cumulative PnL falls below -maxLoss
};

export type Opportunity = ArbOpportunity | LiquidationOpportunity;
export type Outcome = { op: Opportunity; status: "executed" | "skipped"; realized?: bigint; reason?: string };

function revertReason(e: unknown): string {
  if (e instanceof BaseError) {
    const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) return r.reason ?? r.data?.errorName ?? "reverted";
    return e.shortMessage;
  }
  return String(e);
}

export class Bot {
  pnl = 0n;
  stopped = false;
  borrowers = new Set<Address>();
  private scannedTo = 0n;
  readonly history: Outcome[] = [];

  constructor(readonly c: Clients, readonly cfg: BotConfig) {}

  /** State mirror: reserves for every pool, read in parallel. A production bot updates this from Sync events. */
  async pools(): Promise<PoolView[]> {
    return Promise.all(this.cfg.pairs.map(async (address) => {
      const [token0, token1, reserves] = await Promise.all([
        read<Address>(this.c, address, A.pair.abi, "token0"),
        read<Address>(this.c, address, A.pair.abi, "token1"),
        read<readonly [bigint, bigint]>(this.c, address, A.pair.abi, "getReserves"),
      ]);
      return { address, token0, token1, r0: reserves[0], r1: reserves[1] };
    }));
  }

  /** Collector: discover borrowers from Borrow events since the last scan. */
  async scanBorrowers(): Promise<void> {
    if (!this.cfg.lending) return;
    const head = await this.c.pub.getBlockNumber();
    if (head < this.scannedTo) return;
    const logs = await this.c.pub.getContractEvents({ address: this.cfg.lending.pool, abi: A.lending.abi, eventName: "Borrow", fromBlock: this.scannedTo, toBlock: head });
    for (const l of logs) this.borrowers.add((l as unknown as { args: { user: Address } }).args.user);
    this.scannedTo = head + 1n;
  }

  async borrowerViews(): Promise<BorrowerView[]> {
    const L = this.cfg.lending!;
    return Promise.all([...this.borrowers].map(async (borrower) => ({
      borrower,
      healthFactor: await read<bigint>(this.c, L.pool, A.lending.abi, "healthFactor", [borrower]),
      debt: await read<bigint>(this.c, L.pool, A.lending.abi, "debtBalance", [borrower]),
    })));
  }

  /** Planning: every strategy proposes; nothing is sent yet. */
  async plan(): Promise<Opportunity[]> {
    const ops: Opportunity[] = [];
    const arb = findArb(await this.pools(), this.cfg.quote, this.cfg.arbCapital, this.cfg.minProfit);
    if (arb) ops.push(arb);
    if (this.cfg.lending) {
      await this.scanBorrowers();
      const [price] = await read<readonly [bigint, bigint]>(this.c, this.cfg.lending.oracle, A.oracle.abi, "price");
      ops.push(...planLiquidations(await this.borrowerViews(), price, this.cfg.liqCapital, this.cfg.minProfit));
    }
    return ops;
  }

  /** Execution: simulate first; if the opportunity is gone, skip without spending gas. */
  async execute(op: Opportunity): Promise<Outcome> {
    try {
      let realized = 0n;
      if (op.kind === "arb") {
        const minProfit = (op.expectedProfit * 9n) / 10n; // tolerate a little drift, never a loss
        const { request } = await this.c.pub.simulateContract({ address: this.cfg.executor, abi: A.executor.abi, functionName: "arb", args: [op.buy, op.sell, op.tokenIn, op.amountIn, minProfit], account: this.c.account });
        const receipt = await this.c.pub.waitForTransactionReceipt({ hash: await this.c.wallet.writeContract(request) });
        for (const log of receipt.logs) {
          try {
            const ev = decodeEventLog({ abi: A.executor.abi, data: log.data, topics: log.topics }) as unknown as { eventName: string; args: { profit: bigint } };
            if (ev.eventName === "Arb") realized = ev.args.profit;
          } catch { /* not ours */ }
        }
      } else {
        const L = this.cfg.lending!;
        const allowance = await read<bigint>(this.c, L.loanToken, A.token.abi, "allowance", [this.c.account.address, L.pool]);
        if (allowance < op.repay) {
          const { request } = await this.c.pub.simulateContract({ address: L.loanToken, abi: A.token.abi, functionName: "approve", args: [L.pool, 2n ** 255n], account: this.c.account });
          await this.c.pub.waitForTransactionReceipt({ hash: await this.c.wallet.writeContract(request) });
        }
        const { request, result } = await this.c.pub.simulateContract({ address: L.pool, abi: A.lending.abi, functionName: "liquidate", args: [op.borrower, op.repay], account: this.c.account });
        await this.c.pub.waitForTransactionReceipt({ hash: await this.c.wallet.writeContract(request) });
        const [price] = await read<readonly [bigint, bigint]>(this.c, L.oracle, A.oracle.abi, "price");
        realized = ((result as bigint) * price) / 10n ** 18n - op.repay;
      }
      this.pnl += realized;
      const out: Outcome = { op, status: "executed", realized };
      this.history.push(out);
      return out;
    } catch (e) {
      const out: Outcome = { op, status: "skipped", reason: revertReason(e) };
      this.history.push(out);
      return out;
    }
  }

  /** One block's worth of work. Call it on every new block (watchBlockNumber) in production. */
  async tick(): Promise<Outcome[]> {
    if (this.stopped) return [];
    const results: Outcome[] = [];
    for (const op of await this.plan()) results.push(await this.execute(op));
    if (this.pnl < -this.cfg.maxLoss) this.stopped = true; // kill switch
    return results;
  }
}
