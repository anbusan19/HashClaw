import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ethers } from "ethers";

const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
];

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

export async function POST(req: NextRequest) {
  const { message, history, address } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    address?: string;
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });

  const context = await getContext(address);

  const client = new Groq({ apiKey });
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are HashClaw, an AI wealth manager on HashKey Chain testnet.
You manage on-chain portfolios of RWA tokens (xXAG ~4.8% APY, xMMF ~5.2%), veHSK staking (~12.4%), and stable LPs (~3.1%).
Be concise, data-driven, and direct. No markdown — plain text only. Max 3 sentences unless asked for more.
Never invent transaction hashes or contract addresses.

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
