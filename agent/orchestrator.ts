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
 *   3. Check drift threshold — skip if portfolio is already close to target
 *   4. Ask Groq for a rebalance recommendation
 *   5. If legs exist and cooldown has passed, submit to RebalanceExecutor
 *   6. Repeat on POLL_INTERVAL
 */

const POLL_INTERVAL_MS   = parseInt(process.env.POLL_INTERVAL_MS   ?? "300000", 10); // 5 min
const REBALANCE_COOLDOWN_MS = parseInt(process.env.REBALANCE_COOLDOWN_MS ?? "1800000", 10); // 30 min
// Only rebalance if the largest single-asset drift exceeds this threshold (fraction, e.g. 0.05 = 5%)
const DRIFT_THRESHOLD    = parseFloat(process.env.DRIFT_THRESHOLD ?? "0.05");

// Conservative target weights (must sum to 1)
const TARGET_WEIGHTS: Record<number, number> = {
  0: 0.40, // xXAG
  1: 0.30, // xMMF
  2: 0.22, // veHSK
  3: 0.08, // USDC-USDT LP
};

// ── Minimal ABIs ─────────────────────────────────────────────────────────────
const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
  "function assetCount() view returns (uint256)",
];

const EXECUTOR_ABI = [
  "function submitAndExecute(address user, uint256[] fromAssetIds, uint256[] toAssetIds, uint256[] amounts, uint256[] minAmountsOut, string reasoning) returns (uint256 planId)",
];

// ── State ─────────────────────────────────────────────────────────────────────
let lastRebalanceAt = 0;

// ── Setup ─────────────────────────────────────────────────────────────────────
function getContracts() {
  const rpcUrl = process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz";
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const vaultAddr = process.env.TREASURY_VAULT_ADDRESS;
  const executorAddr = process.env.REBALANCE_EXECUTOR_ADDRESS;
  if (!vaultAddr || !executorAddr) {
    throw new Error("TREASURY_VAULT_ADDRESS or REBALANCE_EXECUTOR_ADDRESS not set. Run: pnpm run deploy");
  }

  const vault = new ethers.Contract(vaultAddr, VAULT_ABI, wallet);
  const executor = new ethers.Contract(executorAddr, EXECUTOR_ABI, wallet);

  return { wallet, vault, executor };
}

async function loadPortfolio(vault: ethers.Contract, userAddress: string): Promise<PortfolioSnapshot> {
  const [assetIds, balances, symbols]: [bigint[], bigint[], string[]] =
    await vault.getPortfolio(userAddress);

  const riskProfile = Number(await vault.userRiskProfile(userAddress));

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

/**
 * Returns the max single-asset drift from target weights.
 * e.g. if xXAG is 48% but target is 40%, drift is 0.08.
 */
function maxDrift(portfolio: PortfolioSnapshot): number {
  const total = portfolio.balances.reduce((sum, b) => sum + b.amount, 0n);
  if (total === 0n) return 0;

  let max = 0;
  for (const b of portfolio.balances) {
    const actual = Number(b.amount) / Number(total);
    const target = TARGET_WEIGHTS[b.assetId] ?? 0;
    const drift = Math.abs(actual - target);
    if (drift > max) max = drift;
  }
  return max;
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

    const minOut = (amount * 9950n) / 10000n; // 0.5% slippage

    fromIds.push(BigInt(leg.fromAssetId));
    toIds.push(BigInt(leg.toAssetId));
    amounts.push(amount);
    minAmounts.push(minOut);
  }

  if (fromIds.length === 0) {
    console.log("  No actionable legs (zero balances). Skipping tx.");
    return;
  }

  console.log(`  Submitting ${fromIds.length} leg(s) to RebalanceExecutor...`);
  const tx = await executor.submitAndExecute(
    userAddress, fromIds, toIds, amounts, minAmounts, summary
  );
  const receipt = await tx.wait();
  console.log("  Rebalance tx confirmed:", receipt.hash);
  lastRebalanceAt = Date.now();
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function runOnce(): Promise<void> {
  const { wallet, vault, executor } = getContracts();
  const userAddress = wallet.address;

  console.log("\n[agent] tick —", new Date().toISOString());

  const [signals, portfolio] = await Promise.all([
    fetchAllYieldSignals(),
    loadPortfolio(vault, userAddress),
  ]);

  console.log("  Yields:", signals.map((s) => `${s.symbol} ${s.currentApy.toFixed(1)}%`).join(", "));

  // ── Drift check ─────────────────────────────────────────────────────────────
  const drift = maxDrift(portfolio);
  console.log(`  Max drift: ${(drift * 100).toFixed(1)}% (threshold ${(DRIFT_THRESHOLD * 100).toFixed(0)}%)`);

  if (drift < DRIFT_THRESHOLD) {
    console.log("  Portfolio within target bands — hold.");
    return;
  }

  // ── Cooldown check ──────────────────────────────────────────────────────────
  const msSinceLast = Date.now() - lastRebalanceAt;
  if (lastRebalanceAt > 0 && msSinceLast < REBALANCE_COOLDOWN_MS) {
    const waitMin = Math.ceil((REBALANCE_COOLDOWN_MS - msSinceLast) / 60000);
    console.log(`  Cooldown active — next rebalance in ~${waitMin} min.`);
    return;
  }

  // ── AI decides optimal legs; math fallback if AI returns none ───────────────
  const recommendation = await getRebalanceRecommendation(portfolio, signals);
  console.log("  AI summary:", recommendation.summary);
  console.log("  Legs proposed:", recommendation.legs.length);

  let legs = recommendation.legs;

  // Math fallback: if AI returned no legs despite drift, compute them directly
  if (legs.length === 0) {
    const balances = portfolio.balances;
    const total = balances.reduce((s, b) => s + Number(b.amount), 0);
    if (total > 0) {
      legs = balances
        .filter((b) => {
          const currentFrac = Number(b.amount) / total;
          return (currentFrac - (TARGET_WEIGHTS[b.assetId] ?? 0)) > 0.01;
        })
        .flatMap((b) => {
          const currentFrac = Number(b.amount) / total;
          const delta = currentFrac - (TARGET_WEIGHTS[b.assetId] ?? 0);
          const underWeight = balances
            .map((t) => ({ ...t, deficit: (TARGET_WEIGHTS[t.assetId] ?? 0) - Number(t.amount) / total }))
            .filter((t) => t.deficit > 0.01 && t.assetId !== b.assetId)
            .sort((a, c) => c.deficit - a.deficit)[0];
          if (!underWeight) return [];
          return [{ fromAssetId: b.assetId, toAssetId: underWeight.assetId, fraction: Math.min(delta / currentFrac, 0.95), reason: "Math fallback: restoring target weight." }];
        });
      if (legs.length > 0) console.log("  Using math fallback legs:", legs.length);
    }
  }

  if (legs.length > 0) {
    await executeRebalance(executor, userAddress, portfolio, legs, recommendation.summary);
  } else {
    console.log("  AI recommends hold.");
  }
}

async function main(): Promise<void> {
  console.log("HashClaw agent starting.");
  console.log(`  Poll interval:     ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`  Rebalance cooldown: ${REBALANCE_COOLDOWN_MS / 60000} min`);
  console.log(`  Drift threshold:   ${(DRIFT_THRESHOLD * 100).toFixed(0)}%`);

  await runOnce().catch(console.error);
  setInterval(() => runOnce().catch(console.error), POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
