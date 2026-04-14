import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import { fetchAllYieldSignals } from "./signals/yieldFetcher";
import { getRebalanceRecommendation, PortfolioSnapshot } from "./groqAdvisor";

/**
 * orchestrator.ts
 * Main agent loop:
 *   1. Fetch live yield signals from chain
 *   2. Load user portfolio from TreasuryVault
 *   3. Ask Groq for a rebalance recommendation
 *   4. If legs exist, submit to RebalanceExecutor on-chain
 *   5. Repeat on POLL_INTERVAL
 */

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "60000", 10); // default 1 min

// ── Minimal ABIs ─────────────────────────────────────────────────────────────
const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
  "function assetCount() view returns (uint256)",
];

const EXECUTOR_ABI = [
  "function submitAndExecute(address user, uint256[] fromAssetIds, uint256[] toAssetIds, uint256[] amounts, uint256[] minAmountsOut, string reasoning) returns (uint256 planId)",
];

// ── Setup ─────────────────────────────────────────────────────────────────────
function getContracts() {
  const rpcUrl = process.env.HASHKEY_RPC_URL ?? "https://mainnet.hsk.xyz";
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const vaultAddr = process.env.TREASURY_VAULT_ADDRESS;
  const executorAddr = process.env.REBALANCE_EXECUTOR_ADDRESS;
  if (!vaultAddr || !executorAddr) {
    throw new Error("TREASURY_VAULT_ADDRESS or REBALANCE_EXECUTOR_ADDRESS not set. Run: pnpm deploy");
  }

  const vault = new ethers.Contract(vaultAddr, VAULT_ABI, wallet);
  const executor = new ethers.Contract(executorAddr, EXECUTOR_ABI, wallet);

  return { wallet, vault, executor };
}

async function loadPortfolio(vault: ethers.Contract, userAddress: string): Promise<PortfolioSnapshot> {
  const [assetIds, balances, symbols]: [bigint[], bigint[], string[]] =
    await vault.getPortfolio(userAddress);

  const riskProfile: number = await vault.userRiskProfile(userAddress);

  return {
    user: userAddress,
    riskProfile,
    balances: assetIds.map((id, i) => ({
      assetId: Number(id),
      symbol: symbols[i],
      amount: balances[i],
      decimals: 18,
    })),
  };
}

async function executeRebalance(
  executor: ethers.Contract,
  userAddress: string,
  portfolio: PortfolioSnapshot,
  legs: { fromAssetId: number; toAssetId: number; fraction: number; reason: string }[],
  summary: string
): Promise<void> {
  const fromIds: bigint[] = [];
  const toIds: bigint[] = [];
  const amounts: bigint[] = [];
  const minAmounts: bigint[] = [];

  for (const leg of legs) {
    const bal = portfolio.balances.find((b) => b.assetId === leg.fromAssetId);
    if (!bal || bal.amount === 0n) continue;

    const amount = (bal.amount * BigInt(Math.round(leg.fraction * 10000))) / 10000n;
    if (amount === 0n) continue;

    // 0.5% slippage tolerance
    const minOut = (amount * 9950n) / 10000n;

    fromIds.push(BigInt(leg.fromAssetId));
    toIds.push(BigInt(leg.toAssetId));
    amounts.push(amount);
    minAmounts.push(minOut);
  }

  if (fromIds.length === 0) {
    console.log("  No actionable legs (zero balances or fractions). Skipping tx.");
    return;
  }

  console.log(`  Submitting ${fromIds.length} leg(s) to RebalanceExecutor...`);
  const tx = await executor.submitAndExecute(
    userAddress,
    fromIds,
    toIds,
    amounts,
    minAmounts,
    summary
  );
  const receipt = await tx.wait();
  console.log("  Rebalance tx confirmed:", receipt.hash);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function runOnce(): Promise<void> {
  const { wallet, vault, executor } = getContracts();
  const userAddress = wallet.address;

  console.log("\n[agent] tick —", new Date().toISOString());
  console.log("  User:", userAddress);

  const [signals, portfolio] = await Promise.all([
    fetchAllYieldSignals(),
    loadPortfolio(vault, userAddress),
  ]);

  console.log("  Yield signals fetched:", signals.map((s) => `${s.symbol} ${s.currentApy.toFixed(1)}%`).join(", "));

  const recommendation = await getRebalanceRecommendation(portfolio, signals);
  console.log("  AI summary:", recommendation.summary);
  console.log("  Legs proposed:", recommendation.legs.length);

  if (recommendation.legs.length > 0) {
    await executeRebalance(executor, userAddress, portfolio, recommendation.legs, recommendation.summary);
  } else {
    console.log("  Hold — no rebalance needed.");
  }
}

async function main(): Promise<void> {
  console.log("HashClaw agent starting. Poll interval:", POLL_INTERVAL_MS / 1000, "s");
  // Run immediately, then on interval
  await runOnce().catch(console.error);
  setInterval(() => runOnce().catch(console.error), POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
