import { Telegraf, Context, Markup } from "telegraf";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import { fetchAllYieldSignals } from "../agent/signals/yieldFetcher";
import { getRebalanceRecommendation } from "../agent/groqAdvisor";

/**
 * bot/index.ts
 * Telegram bot — user-facing interface for HashClaw.
 *
 * Commands:
 *   /start        — welcome + help
 *   /portfolio    — show current vault balances
 *   /yields       — show live APY signals
 *   /advise       — ask AI for a rebalance recommendation
 *   /risk <0|1|2> — set risk profile (0=conservative, 1=balanced, 2=aggressive)
 *   /status       — agent heartbeat
 */

// ── Minimal ABIs ──────────────────────────────────────────────────────────────
const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
  "function setRiskProfile(uint8 profile)",
];

const RISK_LABELS = ["Conservative", "Balanced", "Aggressive"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getVaultContract(signerOrProvider: ethers.Provider | ethers.Signer) {
  const addr = process.env.TREASURY_VAULT_ADDRESS;
  if (!addr) throw new Error("TREASURY_VAULT_ADDRESS not set");
  return new ethers.Contract(addr, VAULT_ABI, signerOrProvider);
}

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://mainnet.hsk.xyz");
}

function getWallet() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("PRIVATE_KEY not set");
  return new ethers.Wallet(pk, getProvider());
}

function formatBalance(raw: bigint, decimals = 18): string {
  return (Number(raw) / 10 ** decimals).toFixed(4);
}

// ── Bot setup ─────────────────────────────────────────────────────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Telegraf(token);

// /start
bot.start((ctx: Context) => {
  ctx.reply(
    `Welcome to *HashClaw* — AI-Powered On-Chain Wealth Manager\n\n` +
    `Commands:\n` +
    `/portfolio — view your vault balances\n` +
    `/yields — live APY signals\n` +
    `/advise — AI rebalance recommendation\n` +
    `/risk 0|1|2 — set risk profile\n` +
    `/status — agent heartbeat`,
    { parse_mode: "Markdown" }
  );
});

// /status
bot.command("status", (ctx: Context) => {
  const vaultAddr = process.env.TREASURY_VAULT_ADDRESS ?? "not deployed";
  const executorAddr = process.env.REBALANCE_EXECUTOR_ADDRESS ?? "not deployed";
  ctx.reply(
    `*HashClaw Agent Status*\n\n` +
    `TreasuryVault: \`${vaultAddr}\`\n` +
    `RebalanceExecutor: \`${executorAddr}\`\n` +
    `Network: HashKey Chain (chainId 177)\n` +
    `Time: ${new Date().toISOString()}`,
    { parse_mode: "Markdown" }
  );
});

// /portfolio
bot.command("portfolio", async (ctx: Context) => {
  try {
    const wallet = getWallet();
    const vault = getVaultContract(getProvider());
    const [assetIds, balances, symbols]: [bigint[], bigint[], string[]] =
      await vault.getPortfolio(wallet.address);
    const riskProfile: number = await vault.userRiskProfile(wallet.address);

    const lines = assetIds.map((id, i) =>
      `  ${symbols[i]} (id ${id}): *${formatBalance(balances[i])}*`
    );

    ctx.reply(
      `*Portfolio — ${wallet.address.slice(0, 8)}…*\n` +
      `Risk profile: ${RISK_LABELS[riskProfile]}\n\n` +
      lines.join("\n"),
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    ctx.reply(`Error fetching portfolio: ${(err as Error).message}`);
  }
});

// /yields
bot.command("yields", async (ctx: Context) => {
  try {
    const signals = await fetchAllYieldSignals();
    const lines = signals.map(
      (s) => `  *${s.symbol}*: ${s.currentApy.toFixed(2)}% APY (${s.source})`
    );
    ctx.reply(`*Live Yield Signals*\n\n${lines.join("\n")}`, { parse_mode: "Markdown" });
  } catch (err) {
    ctx.reply(`Error fetching yields: ${(err as Error).message}`);
  }
});

// /advise
bot.command("advise", async (ctx: Context) => {
  await ctx.reply("Analysing portfolio with AI… please wait.");
  try {
    const wallet = getWallet();
    const vault = getVaultContract(getProvider());

    const [[assetIds, balances, symbols], riskProfile, signals]: [
      [bigint[], bigint[], string[]],
      number,
      Awaited<ReturnType<typeof fetchAllYieldSignals>>
    ] = await Promise.all([
      vault.getPortfolio(wallet.address),
      vault.userRiskProfile(wallet.address),
      fetchAllYieldSignals(),
    ]);

    const portfolio = {
      user: wallet.address,
      riskProfile,
      balances: (assetIds as bigint[]).map((id, i) => ({
        assetId: Number(id),
        symbol: (symbols as string[])[i],
        amount: (balances as bigint[])[i],
        decimals: 18,
      })),
    };

    const rec = await getRebalanceRecommendation(portfolio, signals);

    if (rec.legs.length === 0) {
      ctx.reply(`*AI Recommendation*\n\n${rec.summary}\n\nNo rebalance needed.`, {
        parse_mode: "Markdown",
      });
      return;
    }

    const legLines = rec.legs.map(
      (l) =>
        `  Move *${(l.fraction * 100).toFixed(0)}%* of assetId ${l.fromAssetId} → assetId ${l.toAssetId}\n  _${l.reason}_`
    );

    ctx.reply(
      `*AI Recommendation*\n\n${rec.summary}\n\n*Proposed legs:*\n${legLines.join("\n\n")}\n\nRisk score after: ${rec.riskScore}/10`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    ctx.reply(`Error: ${(err as Error).message}`);
  }
});

// /risk <0|1|2>
bot.command("risk", async (ctx: Context) => {
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const parts = text.trim().split(/\s+/);
  const profileStr = parts[1];
  const profile = parseInt(profileStr ?? "", 10);

  if (isNaN(profile) || profile < 0 || profile > 2) {
    ctx.reply("Usage: /risk 0 (conservative) | 1 (balanced) | 2 (aggressive)");
    return;
  }

  try {
    const wallet = getWallet();
    const vault = getVaultContract(wallet);
    const tx = await (vault as ethers.Contract & { setRiskProfile: (p: number) => Promise<ethers.TransactionResponse> }).setRiskProfile(profile);
    await tx.wait();
    ctx.reply(`Risk profile updated to *${RISK_LABELS[profile]}*. Tx: \`${tx.hash}\``, {
      parse_mode: "Markdown",
    });
  } catch (err) {
    ctx.reply(`Error: ${(err as Error).message}`);
  }
});

bot.launch();
console.log("HashClaw Telegram bot running.");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
