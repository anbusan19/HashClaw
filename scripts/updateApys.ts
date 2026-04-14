import { ethers } from "hardhat";

/**
 * updateApys.ts
 * Update YieldOracle APY values on-chain to reflect current market rates.
 * Edit the APY values below, then run: pnpm hardhat run scripts/updateApys.ts --network hashkeyTestnet
 *
 * Sources to check before the demo:
 *   xXAG  — silver ETF/ETP yield (e.g. SIVR, ETFS Physical Silver)
 *   xMMF  — money market fund rate (e.g. Fidelity SPAXX, current ~5.2%)
 *   veHSK — HSK staking rewards (check hashfans.io)
 *   LP    — USDC-USDT stablecoin LP yield (check DEX on HashKey)
 */
const APY_UPDATES = [
  { assetId: 0, apyBps: 480,  symbol: "xXAG"         },  // 4.80%
  { assetId: 1, apyBps: 520,  symbol: "xMMF"         },  // 5.20%
  { assetId: 2, apyBps: 1240, symbol: "veHSK"        },  // 12.40%
  { assetId: 3, apyBps: 310,  symbol: "USDC-USDT LP" },  // 3.10%
];

const ORACLE_ABI = [
  "function setBatchApy(uint256[] assetIds, uint256[] apyBpsArr, string[] symbols) external",
  "function getApy(uint256 assetId) view returns (uint256 apyBps, uint256 updatedAt, string symbol)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const oracleAddr = process.env.YIELD_ORACLE_ADDRESS;
  if (!oracleAddr) throw new Error("YIELD_ORACLE_ADDRESS not set in .env");

  const oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, deployer);

  const assetIds  = APY_UPDATES.map((u) => u.assetId);
  const apyBpsArr = APY_UPDATES.map((u) => u.apyBps);
  const symbols   = APY_UPDATES.map((u) => u.symbol);

  console.log("Updating APYs on YieldOracle", oracleAddr);
  APY_UPDATES.forEach((u) =>
    console.log(`  Asset ${u.assetId} (${u.symbol}): ${u.apyBps / 100}%`)
  );

  const tx = await oracle.setBatchApy(assetIds, apyBpsArr, symbols);
  await tx.wait();
  console.log("\nTx:", tx.hash);
  console.log("APYs updated on-chain.");
}

main().catch((err) => { console.error(err); process.exit(1); });
