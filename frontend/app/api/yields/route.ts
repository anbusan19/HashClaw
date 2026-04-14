import { NextResponse } from "next/server";
import { ethers } from "ethers";

const ORACLE_ABI = [
  "function getAllApys() view returns (uint256[4] apyBpsArr, uint256[4] updatedAts, string[4] symbolsArr)",
];
const ERC20_ABI = ["function totalSupply() view returns (uint256)"];

const FALLBACK_APYS = [4.8, 5.2, 12.4, 3.1];
const FALLBACK_SYMBOLS = ["xXAG", "xMMF", "veHSK", "USDC-USDT LP"];
const FALLBACK_TVLS = [
  ethers.parseEther("1500000").toString(),
  ethers.parseEther("8000000").toString(),
  ethers.parseEther("4200000").toString(),
  ethers.parseEther("12000000").toString(),
];
const TOKEN_ENVS = [
  "RWA_SILVER_ADDRESS",
  "RWA_MMF_ADDRESS",
  "VEHSK_ADDRESS",
  "STABLE_LP_ADDRESS",
];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
}

export async function GET() {
  const provider = getProvider();

  // ── Fetch live APYs from YieldOracle ──────────────────────────────────────
  let apys = FALLBACK_APYS.slice();
  let updatedAts: number[] = [0, 0, 0, 0];

  const oracleAddr = process.env.YIELD_ORACLE_ADDRESS;
  if (oracleAddr) {
    try {
      const oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, provider);
      const [apyBpsArr, updatedAtsArr] = await oracle.getAllApys() as [bigint[], bigint[], string[]];
      apys = (apyBpsArr as bigint[]).map((bps) => Number(bps) / 100);
      updatedAts = (updatedAtsArr as bigint[]).map((t) => Number(t));
    } catch { /* fall through to hardcoded fallbacks */ }
  }

  // ── Fetch TVL from token contracts in parallel ────────────────────────────
  const tvls = await Promise.all(
    TOKEN_ENVS.map(async (envKey, i) => {
      const addr = process.env[envKey];
      if (addr) {
        try {
          const token = new ethers.Contract(addr, ERC20_ABI, provider);
          const supply: bigint = await token.totalSupply();
          return supply.toString();
        } catch { /* fall through */ }
      }
      return FALLBACK_TVLS[i];
    })
  );

  const signals = FALLBACK_SYMBOLS.map((symbol, i) => ({
    assetId: i,
    symbol,
    currentApy: apys[i],
    tvl: tvls[i],
    updatedAt: updatedAts[i] || null,
  }));

  return NextResponse.json({ signals });
}
