import { NextResponse } from "next/server";
import { ethers } from "ethers";

const VEHSK_ABI = [
  "function totalStaked() view returns (uint256)",
  "function rewardRate() view returns (uint256)",
];
const ERC20_ABI = ["function totalSupply() view returns (uint256)"];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
}

async function fetchVeHSK(provider: ethers.JsonRpcProvider) {
  const addr = process.env.VEHSK_ADDRESS;
  if (addr && addr !== "") {
    try {
      const c = new ethers.Contract(addr, VEHSK_ABI, provider);
      const [staked, rate]: [bigint, bigint] = await Promise.all([c.totalStaked(), c.rewardRate()]);
      const s = staked > 0n ? staked : 1n;
      const apy = Math.min(Number((rate * BigInt(365 * 24 * 3600) * 10000n) / s) / 100, 999);
      return { assetId: 2, symbol: "veHSK", currentApy: apy, tvl: staked.toString() };
    } catch { /* fall through */ }
  }
  return { assetId: 2, symbol: "veHSK", currentApy: 12.4, tvl: ethers.parseEther("4200000").toString() };
}

async function fetchToken(addr: string | undefined, assetId: number, symbol: string, fallbackApy: number) {
  if (addr && addr !== "") {
    try {
      const c = new ethers.Contract(addr, ERC20_ABI, getProvider());
      const supply: bigint = await c.totalSupply();
      return { assetId, symbol, currentApy: fallbackApy, tvl: supply.toString() };
    } catch { /* fall through */ }
  }
  const fallbackTvl: Record<number, string> = {
    0: ethers.parseEther("1500000").toString(),
    1: ethers.parseEther("8000000").toString(),
    3: ethers.parseEther("12000000").toString(),
  };
  return { assetId, symbol, currentApy: fallbackApy, tvl: fallbackTvl[assetId] ?? "0" };
}

export async function GET() {
  const provider = getProvider();
  const [xXAG, xMMF, veHSK, stableLP] = await Promise.all([
    fetchToken(process.env.RWA_SILVER_ADDRESS, 0, "xXAG", 4.8),
    fetchToken(process.env.RWA_MMF_ADDRESS, 1, "xMMF", 5.2),
    fetchVeHSK(provider),
    fetchToken(process.env.STABLE_LP_ADDRESS, 3, "USDC-USDT LP", 3.1),
  ]);
  return NextResponse.json({ signals: [xXAG, xMMF, veHSK, stableLP] });
}
