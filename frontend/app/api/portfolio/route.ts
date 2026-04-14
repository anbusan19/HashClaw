import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
];

const RISK_LABELS = ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"];

function bigintReplacer(_: string, v: unknown) {
  return typeof v === "bigint" ? v.toString() : v;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  if (!ethers.isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const vaultAddr = process.env.TREASURY_VAULT_ADDRESS;
  if (!vaultAddr) return NextResponse.json({ error: "Vault not deployed" }, { status: 500 });

  try {
    const provider = new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
    const vault = new ethers.Contract(vaultAddr, VAULT_ABI, provider);

    const [[assetIds, balances, symbols], rawRisk] = await Promise.all([
      vault.getPortfolio(address),
      vault.userRiskProfile(address),
    ]);

    const riskProfile = Number(rawRisk);
    const assets = (assetIds as bigint[]).map((id, i) => ({
      assetId:    Number(id),
      symbol:     (symbols as string[])[i],
      balance:    ethers.formatEther((balances as bigint[])[i]),
      balanceRaw: (balances as bigint[])[i].toString(),
    }));

    const totalValue = assets.reduce((s, a) => s + parseFloat(a.balance), 0);

    const result = {
      user: address,
      riskProfile,
      riskLabel: RISK_LABELS[riskProfile] ?? "UNKNOWN",
      totalValue: totalValue.toFixed(2),
      assets,
    };

    return new Response(JSON.stringify(result, bigintReplacer), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
