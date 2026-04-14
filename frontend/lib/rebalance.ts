import { ethers } from "ethers";
import Groq from "groq-sdk";

const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
];
const EXECUTOR_ABI = [
  "function submitAndExecute(address user, uint256[] fromAssetIds, uint256[] toAssetIds, uint256[] amounts, uint256[] minAmountsOut, string reasoning) returns (uint256 planId)",
];
const ORACLE_ABI = [
  "function getAllApys() view returns (uint256[4] apyBpsArr, uint256[4] updatedAts, string[4] symbolsArr)",
];

export const TARGET_WEIGHTS: Record<number, number> = { 0: 0.40, 1: 0.30, 2: 0.22, 3: 0.08 };
const DRIFT_THRESHOLD = parseFloat(process.env.DRIFT_THRESHOLD ?? "0.05");
const RISK_LABELS = ["conservative", "balanced", "aggressive"];

// ── Drift ─────────────────────────────────────────────────────────────────────
export function maxDrift(portfolio: { assetId: number; amount: bigint }[]): number {
  const total = portfolio.reduce((s, b) => s + b.amount, 0n);
  if (total === 0n) return 0;
  let max = 0;
  for (const b of portfolio) {
    const drift = Math.abs(Number(b.amount) / Number(total) - (TARGET_WEIGHTS[b.assetId] ?? 0));
    if (drift > max) max = drift;
  }
  return max;
}

// ── Compute rebalance legs mathematically ─────────────────────────────────────
// Identifies over-weight assets (sell) and under-weight assets (buy),
// then pairs them into swap legs. No AI involvement in the decision.
export interface ComputedLeg {
  fromAssetId: number;
  toAssetId: number;
  amount: bigint;        // raw token units to sell from fromAsset
  fromSymbol: string;
  toSymbol: string;
  fromCurrentPct: number;
  toCurrentPct: number;
}

export function computeLegs(
  portfolio: { assetId: number; symbol: string; amount: bigint }[]
): ComputedLeg[] {
  const total = portfolio.reduce((s, b) => s + b.amount, 0n);
  if (total === 0n) return [];

  // Calculate excess (positive = over-weight, sell) and deficit (negative = under-weight, buy)
  const deltas = portfolio.map((b) => {
    const currentFrac = Number(b.amount) / Number(total);
    const targetFrac  = TARGET_WEIGHTS[b.assetId] ?? 0;
    const delta       = currentFrac - targetFrac; // positive = over-weight
    return { ...b, delta, currentFrac };
  });

  const overWeight  = deltas.filter((b) => b.delta >  0.001).sort((a, b) => b.delta - a.delta);
  const underWeight = deltas.filter((b) => b.delta < -0.001).sort((a, b) => a.delta - b.delta);

  const legs: ComputedLeg[] = [];

  for (const from of overWeight) {
    for (const to of underWeight) {
      if (from.delta <= 0.001 || to.delta >= -0.001) continue;

      // Move enough to close the smaller of the two gaps
      const moveFrac = Math.min(from.delta, -to.delta);
      const amount   = BigInt(Math.floor(Number(total) * moveFrac * 0.999)); // 0.1% buffer
      if (amount === 0n) continue;

      legs.push({
        fromAssetId:    from.assetId,
        toAssetId:      to.assetId,
        amount,
        fromSymbol:     from.symbol,
        toSymbol:       to.symbol,
        fromCurrentPct: from.currentFrac * 100,
        toCurrentPct:   to.currentFrac * 100,
      });

      from.delta -= moveFrac;
      to.delta   += moveFrac;
    }
  }

  return legs;
}

// ── AI: decides optimal legs + reasoning ─────────────────────────────────────
// Drift math has already confirmed a rebalance is needed.
// AI decides the optimal fractions and which assets to prioritise,
// considering live APYs and risk profile.
// Safety guard: any leg that doesn't reduce drift is filtered out.
export interface AiLeg {
  fromAssetId: number;
  toAssetId: number;
  fraction: number;   // fraction of fromAsset balance to sell
  reason: string;
}

export async function getAiLegs(
  riskProfile: number,
  portfolio: { assetId: number; symbol: string; amount: bigint }[],
  signals: { assetId: number; symbol: string; currentApy: number }[],
  fallbackLegs: ComputedLeg[]
): Promise<{ legs: AiLeg[]; summary: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      legs: fallbackLegs.map((l) => ({ fromAssetId: l.fromAssetId, toAssetId: l.toAssetId, fraction: Number(l.amount) / Number(portfolio.find(b => b.assetId === l.fromAssetId)?.amount ?? 1n), reason: "Restoring target weight." })),
      summary: "Portfolio drift detected. Rebalancing to restore target allocation.",
    };
  }

  const total = portfolio.reduce((s, b) => s + b.amount, 0n);
  const allocationLines = portfolio.map((b) => {
    const pct    = total > 0n ? ((Number(b.amount) / Number(total)) * 100).toFixed(1) : "0.0";
    const target = ((TARGET_WEIGHTS[b.assetId] ?? 0) * 100).toFixed(0);
    return `  ${b.symbol} (assetId ${b.assetId}): current ${pct}%, target ${target}%`;
  }).join("\n");
  const apyLines = signals.map((s) => `  ${s.symbol} (assetId ${s.assetId}): ${s.currentApy.toFixed(2)}% APY`).join("\n");

  try {
    const completion = await new Groq({ apiKey }).chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an on-chain DeFi wealth manager on HashKey Chain.
Portfolio drift has been detected and a rebalance WILL happen. Your job is to decide the optimal swap legs.
You may partially rebalance (not all the way to target) if APY conditions justify it.
You must reduce drift — do not propose legs that move assets further from their targets.
Return ONLY valid JSON:
{
  "legs": [{"fromAssetId":<int>,"toAssetId":<int>,"fraction":<0.01-1.0, portion of fromAsset to sell>,"reason":"<one sentence>"}],
  "summary": "<1-2 sentences explaining the strategy>"
}
Asset IDs: 0=xXAG, 1=xMMF, 2=veHSK, 3=Stable LP.
Target weights: xXAG 40%, xMMF 30%, veHSK 22%, LP 8%.`,
        },
        {
          role: "user",
          content: `Risk profile: ${RISK_LABELS[riskProfile] ?? "conservative"}
Current vs target allocations:\n${allocationLines}
Live APYs:\n${apyLines}
Compute the optimal rebalance legs. Consider whether high-APY assets justify partial rebalancing.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    });

    const raw = (completion.choices[0]?.message?.content ?? "{}")
      .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(raw) as { legs: AiLeg[]; summary: string };

    // Safety guard: filter out any leg that sells an under-weight asset or buys an over-weight one
    const safeLegs = (parsed.legs ?? []).filter((leg) => {
      const fromBal = portfolio.find((b) => b.assetId === leg.fromAssetId);
      const toBal   = portfolio.find((b) => b.assetId === leg.toAssetId);
      if (!fromBal || !toBal) return false;
      const fromPct = Number(fromBal.amount) / Number(total);
      const toPct   = Number(toBal.amount) / Number(total);
      const fromTarget = TARGET_WEIGHTS[leg.fromAssetId] ?? 0;
      const toTarget   = TARGET_WEIGHTS[leg.toAssetId]   ?? 0;
      // Only allow: selling over-weight, buying under-weight
      return fromPct > fromTarget && toPct < toTarget;
    });

    // If AI returned no valid legs, fall back to math
    if (safeLegs.length === 0) {
      return {
        legs: fallbackLegs.map((l) => ({
          fromAssetId: l.fromAssetId,
          toAssetId: l.toAssetId,
          fraction: Math.min(Number(l.amount) / Number(portfolio.find(b => b.assetId === l.fromAssetId)?.amount ?? 1n), 1),
          reason: "Restoring target weight.",
        })),
        summary: parsed.summary ?? "Rebalancing to restore target allocation weights.",
      };
    }

    return { legs: safeLegs, summary: parsed.summary ?? "Rebalancing portfolio based on drift and APY analysis." };
  } catch {
    return {
      legs: fallbackLegs.map((l) => ({
        fromAssetId: l.fromAssetId,
        toAssetId: l.toAssetId,
        fraction: Math.min(Number(l.amount) / Number(portfolio.find(b => b.assetId === l.fromAssetId)?.amount ?? 1n), 1),
        reason: "Restoring target weight.",
      })),
      summary: "Portfolio drift detected. Rebalancing to restore target allocation.",
    };
  }
}

// ── Yield fetcher ─────────────────────────────────────────────────────────────
export async function fetchYields(provider: ethers.JsonRpcProvider) {
  const fallback = [
    { assetId: 0, symbol: "xXAG",         currentApy: 4.8 },
    { assetId: 1, symbol: "xMMF",         currentApy: 5.2 },
    { assetId: 2, symbol: "veHSK",        currentApy: 12.4 },
    { assetId: 3, symbol: "USDC-USDT LP", currentApy: 3.1 },
  ];
  const oracleAddr = process.env.YIELD_ORACLE_ADDRESS;
  if (!oracleAddr) return fallback;
  try {
    const oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, provider);
    const [apyBpsArr, , symbolsArr] = await oracle.getAllApys() as [bigint[], bigint[], string[]];
    return fallback.map((f, i) => ({
      ...f,
      symbol: (symbolsArr as string[])[i] || f.symbol,
      currentApy: Number((apyBpsArr as bigint[])[i]) / 100,
    }));
  } catch { return fallback; }
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface RebalanceResult {
  status: "executed" | "hold";
  txHash?: string;
  explorerUrl?: string;
  planLegs?: number;
  reasoning?: string;
  reason?: string;
  drift?: string;
  error?: string;
}

export async function runRebalance(force = false): Promise<RebalanceResult> {
  const privateKey = process.env.PRIVATE_KEY;
  const vaultAddr  = process.env.TREASURY_VAULT_ADDRESS;
  const execAddr   = process.env.REBALANCE_EXECUTOR_ADDRESS;

  if (!privateKey) return { status: "hold", error: "Agent wallet not configured." };
  if (!vaultAddr || !execAddr) return { status: "hold", error: "Contracts not deployed." };

  const provider = new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
  const wallet   = new ethers.Wallet(privateKey, provider);
  const vault    = new ethers.Contract(vaultAddr, VAULT_ABI, provider);
  const executor = new ethers.Contract(execAddr, EXECUTOR_ABI, wallet);

  const userAddress = wallet.address;
  const [[assetIds, balances, symbols], rawRisk, signals] = await Promise.all([
    vault.getPortfolio(userAddress) as Promise<[bigint[], bigint[], string[]]>,
    vault.userRiskProfile(userAddress) as Promise<bigint>,
    fetchYields(provider),
  ]);

  const portfolio = (assetIds as bigint[]).map((id, i) => ({
    assetId: Number(id),
    symbol: (symbols as string[])[i],
    amount: (balances as bigint[])[i],
  }));

  const drift = maxDrift(portfolio);

  if (!force && drift < DRIFT_THRESHOLD) {
    return {
      status: "hold",
      reason: `Portfolio within target bands (drift ${(drift * 100).toFixed(1)}% < ${(DRIFT_THRESHOLD * 100).toFixed(0)}% threshold).`,
      drift: (drift * 100).toFixed(1),
    };
  }

  // Math computes fallback legs; AI optimises fractions and selects strategy
  const fallbackLegs = computeLegs(portfolio);
  if (fallbackLegs.length === 0) {
    return { status: "hold", reason: "No actionable swap legs computed.", drift: (drift * 100).toFixed(1) };
  }

  const { legs: aiLegs, summary: reasoning } = await getAiLegs(Number(rawRisk), portfolio, signals, fallbackLegs);

  const fromIds: bigint[] = [], toIds: bigint[] = [], amounts: bigint[] = [], minOuts: bigint[] = [];
  for (const leg of aiLegs) {
    const bal = portfolio.find((b) => b.assetId === leg.fromAssetId);
    if (!bal || bal.amount === 0n) continue;
    const amount = (bal.amount * BigInt(Math.round(leg.fraction * 10000))) / 10000n;
    if (amount === 0n) continue;
    fromIds.push(BigInt(leg.fromAssetId));
    toIds.push(BigInt(leg.toAssetId));
    amounts.push(amount);
    minOuts.push((amount * 9950n) / 10000n);
  }

  if (fromIds.length === 0) {
    return { status: "hold", reason: "No actionable swap amounts after AI optimisation." };
  }

  const tx = await executor.submitAndExecute(
    userAddress, fromIds, toIds, amounts, minOuts, reasoning
  );
  const receipt = await tx.wait();

  return {
    status: "executed",
    txHash: receipt.hash,
    explorerUrl: `https://testnet-explorer.hsk.xyz/tx/${receipt.hash}`,
    planLegs: fromIds.length,
    reasoning,
  };
}
