import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ethers } from "ethers";

const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
];

const ORACLE_ABI = [
  "function getAllApys() view returns (uint256[4] apyBpsArr, uint256[4] updatedAts, string[4] symbolsArr)",
];

const FALLBACK_APY_TEXT = "xXAG ~4.8% APY, xMMF ~5.2% APY, veHSK ~12.4% APY, USDC-USDT LP ~3.1% APY";

async function getLiveApyText(provider: ethers.JsonRpcProvider): Promise<string> {
  const oracleAddr = process.env.YIELD_ORACLE_ADDRESS;
  if (!oracleAddr) return FALLBACK_APY_TEXT;
  try {
    const oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, provider);
    const [apyBpsArr, , symbolsArr] = await oracle.getAllApys() as [bigint[], bigint[], string[]];
    return (symbolsArr as string[])
      .map((sym, i) => `${sym} ${(Number((apyBpsArr as bigint[])[i]) / 100).toFixed(2)}% APY`)
      .join(", ");
  } catch {
    return FALLBACK_APY_TEXT;
  }
}

async function getContext(address?: string): Promise<string> {
  if (!address || !ethers.isAddress(address)) return "No wallet connected.";

  const vaultAddr = process.env.TREASURY_VAULT_ADDRESS;
  if (!vaultAddr) return "Contracts not deployed.";

  try {
    const provider = new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
    const vault = new ethers.Contract(vaultAddr, VAULT_ABI, provider);
    const [[assetIds, balances, symbols], rawRisk] = await Promise.all([
      vault.getPortfolio(address),
      vault.userRiskProfile(address),
    ]);
    const riskLabels = ["Conservative", "Balanced", "Aggressive"];
    const riskProfile = riskLabels[Number(rawRisk)] ?? "Unknown";
    const assets = (assetIds as bigint[])
      .map((id, i) => `${(symbols as string[])[i]}: ${ethers.formatEther((balances as bigint[])[i])}`)
      .join(", ");
    return `Wallet: ${address} | Risk: ${riskProfile} | Portfolio: ${assets}`;
  } catch {
    return "Portfolio data temporarily unavailable.";
  }
}

// ── Rebalance intent detection ────────────────────────────────────────────────
const REBALANCE_TRIGGERS = [
  /\brebalance\s*(now|it|portfolio|please)?\b/i,
  /\b(proceed|execute|go ahead|do it|confirm|yes,?\s*proceed|yes,?\s*do it)\b/i,
  /\btrigger\s*(a\s*)?rebalance\b/i,
];

function isRebalanceIntent(msg: string): boolean {
  return REBALANCE_TRIGGERS.some((re) => re.test(msg));
}

async function handleRebalance(force: boolean): Promise<string> {
  try {
    const { runRebalance } = await import("@/lib/rebalance");
    const data = await runRebalance(force);

    if (data.error) return `Rebalance failed: ${data.error}`;
    if (data.status === "hold") return `No rebalance needed. ${data.reason ?? ""}`;
    if (data.status === "executed") {
      return `Rebalance executed on-chain. ${data.planLegs} swap${data.planLegs !== 1 ? "s" : ""} submitted. Reasoning: ${data.reasoning} View transaction: ${data.explorerUrl}`;
    }
    return "Rebalance request processed.";
  } catch (e) {
    return `Rebalance request failed: ${(e as Error).message}`;
  }
}

export async function POST(req: NextRequest) {
  const { message, history, address } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    address?: string;
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });

  // If user explicitly asks to rebalance, execute it instead of talking about it
  if (isRebalanceIntent(message)) {
    const reply = await handleRebalance(true);
    return NextResponse.json({ reply });
  }

  const provider = new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
  const [context, apyText] = await Promise.all([
    getContext(address),
    getLiveApyText(provider),
  ]);

  const client = new Groq({ apiKey });
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are HashClaw, an AI wealth manager on HashKey Chain testnet.
You manage on-chain portfolios of RWA tokens. Current live APYs: ${apyText}.
Be concise, data-driven, and direct. No markdown — plain text only. Max 3 sentences unless asked for more.
Never invent transaction hashes or contract addresses.
IMPORTANT: You cannot execute transactions yourself. If a user asks you to rebalance or execute something, tell them to type "rebalance now" to trigger an on-chain rebalance.

Live context: ${context}`,
      },
      ...(history ?? []).slice(-8),
      { role: "user", content: message },
    ],
    temperature: 0.3,
    max_tokens: 400,
  });

  return NextResponse.json({ reply: completion.choices[0]?.message?.content ?? "" });
}
