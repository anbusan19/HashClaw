import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { TARGET_WEIGHTS, maxDrift, computeLegs, getAiLegs, fetchYields } from "@/lib/rebalance";

const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
];

const DRIFT_THRESHOLD = parseFloat(process.env.DRIFT_THRESHOLD ?? "0.05");
const RISK_LABELS = ["conservative", "balanced", "aggressive"];

export async function POST(req: NextRequest) {
  const { address, force = false } = await req.json() as { address: string; force?: boolean };
  if (!address || !ethers.isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const vaultAddr = process.env.TREASURY_VAULT_ADDRESS;
  const execAddr  = process.env.REBALANCE_EXECUTOR_ADDRESS;
  if (!vaultAddr || !execAddr) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const provider = new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
  const vault    = new ethers.Contract(vaultAddr, VAULT_ABI, provider);

  const [[assetIds, balances, symbols], rawRisk, signals] = await Promise.all([
    vault.getPortfolio(address) as Promise<[bigint[], bigint[], string[]]>,
    vault.userRiskProfile(address) as Promise<bigint>,
    fetchYields(provider),
  ]);

  const portfolio = (assetIds as bigint[]).map((id, i) => ({
    assetId: Number(id),
    symbol: (symbols as string[])[i],
    amount: (balances as bigint[])[i],
  }));

  const totalBalance = portfolio.reduce((s, b) => s + b.amount, 0n);
  if (totalBalance === 0n) {
    return NextResponse.json({ status: "no_balance", reason: "No deposits found. Deposit tokens first to enable rebalancing." });
  }

  const drift = maxDrift(portfolio);

  if (!force && drift < DRIFT_THRESHOLD) {
    return NextResponse.json({
      status: "hold",
      reason: `Portfolio is within target bands — largest drift is ${(drift * 100).toFixed(1)}%, below the ${(DRIFT_THRESHOLD * 100).toFixed(0)}% threshold.`,
    });
  }

  // ── Math computes fallback legs; AI optimises strategy ───────────────────
  const fallbackLegs = computeLegs(portfolio);
  if (fallbackLegs.length === 0) {
    return NextResponse.json({ status: "hold", reason: "No actionable swap legs computed." });
  }

  const { legs: aiLegs, summary: reasoning } = await getAiLegs(Number(rawRisk), portfolio, signals, fallbackLegs);

  // Build calldata
  const fromIds: string[] = [], toIds: string[] = [], amounts: string[] = [], minOuts: string[] = [];
  for (const leg of aiLegs) {
    const bal = portfolio.find((b) => b.assetId === leg.fromAssetId);
    if (!bal || bal.amount === 0n) continue;
    const amount = (bal.amount * BigInt(Math.round(leg.fraction * 10000))) / 10000n;
    if (amount === 0n) continue;
    fromIds.push(leg.fromAssetId.toString());
    toIds.push(leg.toAssetId.toString());
    amounts.push(amount.toString());
    minOuts.push(((amount * 9950n) / 10000n).toString());
  }

  if (fromIds.length === 0) {
    return NextResponse.json({ status: "hold", reason: "No actionable swap amounts after AI optimisation." });
  }

  // ── Return unsigned plan for browser signing ──────────────────────────────
  return NextResponse.json({
    status: "ready",
    reasoning,
    drift: (drift * 100).toFixed(1),
    executorAddress: execAddr,
    plan: { fromIds, toIds, amounts, minOuts },
    legs: aiLegs.map((l) => ({
      from:   portfolio.find((b) => b.assetId === l.fromAssetId)?.symbol ?? `Asset ${l.fromAssetId}`,
      to:     portfolio.find((b) => b.assetId === l.toAssetId)?.symbol   ?? `Asset ${l.toAssetId}`,
      fraction: (l.fraction * 100).toFixed(1),
      reason: l.reason,
    })),
  });
}
