import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { SolanaLaunchpad } from "../target/types/solana_launchpad";

const { Keypair, LAMPORTS_PER_SOL, PublicKey } = anchor.web3;

// Same constants and rounding as programs/solana_launchpad/src/curve.rs
const VIRTUAL_SOL = new BN(30).mul(new BN(LAMPORTS_PER_SOL));
const ONE_TOKEN = new BN(1_000_000);
const VIRTUAL_TOKENS = new BN(1_073_000_000).mul(ONE_TOKEN);
const CURVE_SUPPLY = new BN(793_100_000).mul(ONE_TOKEN);
const FEE_BPS = new BN(100);
const TEN_K = new BN(10_000);

const netOfFee = (gross: BN) => gross.mul(TEN_K).div(TEN_K.add(FEE_BPS));
const feeOn = (x: BN) => x.mul(FEE_BPS).div(TEN_K);
const tokensOut = (x: BN, y: BN, dx: BN) => y.mul(dx).div(x.add(dx));
const solOut = (x: BN, y: BN, dy: BN) => x.mul(dy).div(y.add(dy));

describe("solana_launchpad", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.solanaLaunchpad as Program<SolanaLaunchpad>;
  const conn = provider.connection;

  const creator = Keypair.generate();
  const alice = Keypair.generate();
  const whale = Keypair.generate();
  const mint = Keypair.generate();
  const [curvePda] = PublicKey.findProgramAddressSync([Buffer.from("curve"), mint.publicKey.toBuffer()], program.programId);
  const ata = (owner: anchor.web3.PublicKey) => anchor.utils.token.associatedAddress({ mint: mint.publicKey, owner });
  const tokenBalance = async (owner: anchor.web3.PublicKey) => new BN((await conn.getTokenAccountBalance(ata(owner))).value.amount);

  async function fund(kp: anchor.web3.Keypair, sol: number) {
    const sig = await conn.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
    await conn.confirmTransaction({ signature: sig, ...(await conn.getLatestBlockhash()) });
  }

  const buy = (who: anchor.web3.Keypair, maxSol: BN, minOut: BN) =>
    program.methods.buy(maxSol, minOut).accountsPartial({ buyer: who.publicKey, curve: curvePda, mint: mint.publicKey, creator: creator.publicKey }).signers([who]).rpc();
  const sell = (who: anchor.web3.Keypair, tokens: BN, minSol: BN) =>
    program.methods.sell(tokens, minSol).accountsPartial({ seller: who.publicKey, curve: curvePda, mint: mint.publicKey, creator: creator.publicKey }).signers([who]).rpc();

  before(async () => {
    await Promise.all([fund(creator, 2), fund(alice, 10), fund(whale, 200)]);
  });

  it("creates a launch with virtual reserves and the PDA as mint authority", async () => {
    await program.methods.create().accounts({ creator: creator.publicKey, mint: mint.publicKey }).signers([creator, mint]).rpc();
    const c = await program.account.curve.fetch(curvePda);
    assert.ok(c.virtualSol.eq(VIRTUAL_SOL));
    assert.ok(c.virtualTokens.eq(VIRTUAL_TOKENS));
    assert.isFalse(c.complete);
    const mintInfo = await conn.getParsedAccountInfo(mint.publicKey);
    const parsed = (mintInfo.value!.data as anchor.web3.ParsedAccountData).parsed.info;
    assert.equal(parsed.mintAuthority, curvePda.toBase58());
    assert.isNull(parsed.freezeAuthority);
  });

  it("buy: tokens follow the curve and the creator earns 1%", async () => {
    const before = await program.account.curve.fetch(curvePda);
    const creatorBefore = await conn.getBalance(creator.publicKey);
    const gross = new BN(LAMPORTS_PER_SOL);
    const net = netOfFee(gross);
    const expected = tokensOut(before.virtualSol, before.virtualTokens, net);

    await buy(alice, gross, expected);

    assert.ok((await tokenBalance(alice.publicKey)).eq(expected));
    assert.equal(await conn.getBalance(creator.publicKey), creatorBefore + feeOn(net).toNumber());
    const after = await program.account.curve.fetch(curvePda);
    assert.ok(after.realSol.eq(net));
  });

  it("buy: the same SOL buys fewer tokens as price rises", async () => {
    const before = await tokenBalance(alice.publicKey);
    await buy(alice, new BN(LAMPORTS_PER_SOL), new BN(0));
    const second = (await tokenBalance(alice.publicKey)).sub(before);
    assert.ok(second.lt(before), "second buy should get fewer tokens than the first");
  });

  it("sell: burns tokens and pays SOL out minus 1%", async () => {
    const c = await program.account.curve.fetch(curvePda);
    const half = (await tokenBalance(alice.publicKey)).divn(2);
    const gross = solOut(c.virtualSol, c.virtualTokens, half);
    const aliceBefore = await conn.getBalance(alice.publicKey);
    await sell(alice, half, gross.sub(feeOn(gross)));
    assert.equal(await conn.getBalance(alice.publicKey), aliceBefore + gross.sub(feeOn(gross)).toNumber());
  });

  it("rejects a buy when the price moved past the slippage limit", async () => {
    try {
      await buy(alice, new BN(LAMPORTS_PER_SOL), new BN("100000000000000000"));
      assert.fail("should have thrown");
    } catch (e: any) {
      assert.include(String(e), "SlippageExceeded");
    }
  });

  it("graduates at the curve supply, charging the last buyer only for what they get", async () => {
    const whaleBefore = await conn.getBalance(whale.publicKey);
    await buy(whale, new BN(150).mul(new BN(LAMPORTS_PER_SOL)), new BN(0));
    const c = await program.account.curve.fetch(curvePda);
    assert.isTrue(c.complete);
    assert.ok(c.tokensSold.eq(CURVE_SUPPLY));
    const raised = c.realSol.toNumber() / LAMPORTS_PER_SOL;
    assert.closeTo(raised, 85, 0.1, `raised ${raised} SOL`);
    const spent = (whaleBefore - (await conn.getBalance(whale.publicKey))) / LAMPORTS_PER_SOL;
    assert.isBelow(spent, 100, "the whale must not be charged its full 150 SOL budget");
  });

  it("closes trading after graduation", async () => {
    try {
      await buy(alice, new BN(LAMPORTS_PER_SOL), new BN(0));
      assert.fail("should have thrown");
    } catch (e: any) {
      assert.include(String(e), "CurveComplete");
    }
  });
});
