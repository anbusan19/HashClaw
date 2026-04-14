import Groq from "groq-sdk";
import { YieldSignal } from "./signals/yieldFetcher";

/**
 * groqAdvisor.ts
 * Sends portfolio + yield signal context to Groq (llama-3.3-70b) and
 * returns a structured rebalance recommendation.
 */

export interface RebalanceLeg {
  fromAssetId: number;
  toAssetId: number;
  /** fraction of fromAsset balance to move, 0–1 */
  fraction: number;
  reason: string;
}

export interface RebalanceRecommendation {
  legs: RebalanceLeg[];
  summary: string;
  riskScore: number; // 0–10 after rebalance
}

export interface PortfolioSnapshot {
  user: string;
  riskProfile: number; // 0=conservative, 1=balanced, 2=aggressive
  balances: { assetId: number; symbol: string; amount: bigint; decimals: number }[];
}

const ASSET_NAMES: Record<number, string> = {
  0: "RWA Silver (xXAG)",
  1: "RWA Money Market Fund (xMMF)",
  2: "veHSK Staking",
  3: "Stable LP (USDC-USDT)",
};

const RISK_LABELS = ["conservative", "balanced", "aggressive"];

export async function getRebalanceRecommendation(
  portfolio: PortfolioSnapshot,
  signals: YieldSignal[]
): Promise<RebalanceRecommendation> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const signalLines = signals
    .map((s) => `  ${s.symbol} (assetId ${s.assetId}): APY ${s.currentApy.toFixed(2)}%, TVL ${s.tvl}`)
    .join("\n");

  const balanceLines = portfolio.balances
    .map((b) => `  ${b.symbol} (assetId ${b.assetId}): ${(Number(b.amount) / 10 ** b.decimals).toFixed(4)}`)
    .join("\n");

  const systemPrompt = `You are an on-chain DeFi wealth manager on HashKey Chain.
Your job: analyse a user's portfolio and current yield signals, then decide whether to rebalance.
Always return ONLY valid JSON — no markdown, no explanation outside the JSON.
JSON schema:
{
  "legs": [
    {
      "fromAssetId": <number>,
      "toAssetId": <number>,
      "fraction": <0.0–1.0, portion of fromAsset balance to move>,
      "reason": "<one sentence>"
    }
  ],
  "summary": "<two sentences max, plain English>",
  "riskScore": <0–10 integer, estimated portfolio risk after rebalance>
}
If no rebalance is needed, return an empty legs array.
Asset IDs: 0=RWA Silver, 1=RWA MMF, 2=veHSK Staking, 3=Stable LP.`;

  const userPrompt = `Risk profile: ${RISK_LABELS[portfolio.riskProfile]} (${portfolio.riskProfile}/2)
Current balances:
${balanceLines}
Live yield signals:
${signalLines}
Recommend a rebalance or confirm hold.`;

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 512,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as RebalanceRecommendation;
    return {
      legs: parsed.legs ?? [],
      summary: parsed.summary ?? "No action required.",
      riskScore: parsed.riskScore ?? 5,
    };
  } catch {
    console.error("Groq response parse error. Raw:", raw);
    return { legs: [], summary: "Could not parse AI recommendation.", riskScore: 5 };
  }
}
