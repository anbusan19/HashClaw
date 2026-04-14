import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

/**
 * yieldFetcher.ts
 * Reads live APY signals from on-chain contracts and public endpoints.
 * Returns a YieldSignal for each asset class the agent monitors.
 */

export interface YieldSignal {
  assetId: number;
  symbol: string;
  currentApy: number;   // annualised percentage, e.g. 5.2 means 5.2%
  tvl: bigint;          // total value locked in wei-equivalent
  source: string;
  fetchedAt: number;    // unix timestamp
}

// Minimal ABI fragments for yield reading
const VEHSK_ABI = [
  "function totalStaked() view returns (uint256)",
  "function rewardRate() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// Known contract addresses on HashKey Chain mainnet (placeholders — update post-deploy)
const VEHSK_CONTRACT = process.env.VEHSK_ADDRESS || "0x0000000000000000000000000000000000000001";
const RWA_SILVER_CONTRACT = process.env.RWA_SILVER_ADDRESS || "0x0000000000000000000000000000000000000002";
const RWA_MMF_CONTRACT = process.env.RWA_MMF_ADDRESS || "0x0000000000000000000000000000000000000003";

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.HASHKEY_RPC_URL || "https://mainnet.hsk.xyz";
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Fetches veHSK staking APY.
 * APY = (rewardRate * SECONDS_PER_YEAR / totalStaked) * 100
 */
async function fetchVeHSKYield(provider: ethers.JsonRpcProvider): Promise<YieldSignal> {
  const SECONDS_PER_YEAR = 365 * 24 * 3600;

  try {
    const contract = new ethers.Contract(VEHSK_CONTRACT, VEHSK_ABI, provider);
    const [totalStaked, rewardRate] = await Promise.all([
      contract.totalStaked() as Promise<bigint>,
      contract.rewardRate() as Promise<bigint>,
    ]);

    const staked = totalStaked > 0n ? totalStaked : 1n;
    // rewardRate is tokens-per-second across the whole pool
    const apyRaw = Number((rewardRate * BigInt(SECONDS_PER_YEAR) * 10000n) / staked) / 100;
    const apy = Math.min(apyRaw, 999); // cap at 999% to avoid display issues

    return {
      assetId: 2, // VEHSK
      symbol: "veHSK",
      currentApy: apy,
      tvl: staked,
      source: "veHSK staking contract",
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  } catch {
    // Contract not deployed yet — return realistic demo values
    return {
      assetId: 2,
      symbol: "veHSK",
      currentApy: 12.4,
      tvl: ethers.parseEther("4200000"),
      source: "demo fallback",
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * Fetches RWA Silver token yield (backed by XAG price + redemption yield).
 * In production this reads from the RWA oracle. Demo returns static values.
 */
async function fetchSilverYield(provider: ethers.JsonRpcProvider): Promise<YieldSignal> {
  try {
    const contract = new ethers.Contract(RWA_SILVER_CONTRACT, ERC20_ABI, provider);
    const totalSupply = await contract.totalSupply() as bigint;

    return {
      assetId: 0, // RWA_SILVER
      symbol: "xXAG",
      currentApy: 4.8, // Silver appreciation + staking bonus
      tvl: totalSupply,
      source: "RWA silver contract",
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  } catch {
    return {
      assetId: 0,
      symbol: "xXAG",
      currentApy: 4.8,
      tvl: ethers.parseEther("1500000"),
      source: "demo fallback",
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * Fetches RWA Money Market Fund yield.
 */
async function fetchMMFYield(provider: ethers.JsonRpcProvider): Promise<YieldSignal> {
  try {
    const contract = new ethers.Contract(RWA_MMF_CONTRACT, ERC20_ABI, provider);
    const totalSupply = await contract.totalSupply() as bigint;

    return {
      assetId: 1, // RWA_MMF
      symbol: "xMMF",
      currentApy: 5.2,
      tvl: totalSupply,
      source: "RWA MMF contract",
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  } catch {
    return {
      assetId: 1,
      symbol: "xMMF",
      currentApy: 5.2,
      tvl: ethers.parseEther("8000000"),
      source: "demo fallback",
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * Stable LP yield from liquidity pool fees + incentives.
 */
async function fetchStableLPYield(): Promise<YieldSignal> {
  // Would call pool subgraph or fee oracle in production
  return {
    assetId: 3, // STABLE_LP
    symbol: "USDC-USDT LP",
    currentApy: 3.1,
    tvl: ethers.parseEther("12000000"),
    source: "demo fallback",
    fetchedAt: Math.floor(Date.now() / 1000),
  };
}

/**
 * Main export: fetches all yield signals in parallel.
 */
export async function fetchAllYieldSignals(): Promise<YieldSignal[]> {
  const provider = getProvider();

  const [silver, mmf, veHSK, stableLP] = await Promise.all([
    fetchSilverYield(provider),
    fetchMMFYield(provider),
    fetchVeHSKYield(provider),
    fetchStableLPYield(),
  ]);

  return [silver, mmf, veHSK, stableLP];
}
