import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    chainId: 133,
    rpcUrl: "https://testnet.hsk.xyz",
    explorerUrl: "https://testnet-explorer.hsk.xyz",
    contracts: {
      treasuryVault:     process.env.TREASURY_VAULT_ADDRESS     ?? "",
      rebalanceExecutor: process.env.REBALANCE_EXECUTOR_ADDRESS ?? "",
      hspSettlement:     process.env.HSP_SETTLEMENT_ADDRESS     ?? "",
    },
    tokens: {
      xXAG:     { address: process.env.RWA_SILVER_ADDRESS ?? "", symbol: "xXAG",         assetId: 0 },
      xMMF:     { address: process.env.RWA_MMF_ADDRESS    ?? "", symbol: "xMMF",         assetId: 1 },
      veHSK:    { address: process.env.VEHSK_ADDRESS      ?? "", symbol: "veHSK",        assetId: 2 },
      stableLP: { address: process.env.STABLE_LP_ADDRESS  ?? "", symbol: "USDC-USDT-LP", assetId: 3 },
    },
  });
}
