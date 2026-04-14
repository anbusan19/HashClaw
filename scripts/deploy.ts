import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * deploy.ts
 * Deploys TreasuryVault → RebalanceExecutor → HSPSettlement in order,
 * wires up permissions, then writes addresses to .env so the agent can pick them up.
 *
 * Run: pnpm deploy
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, `(chainId ${network.chainId})`);
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK\n");

  // ── 1. TreasuryVault ──────────────────────────────────────────────────────
  console.log("1/3  Deploying TreasuryVault...");
  const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
  const vault = await TreasuryVault.deploy(deployer.address);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("     TreasuryVault →", vaultAddr);

  // ── 2. RebalanceExecutor ──────────────────────────────────────────────────
  console.log("2/3  Deploying RebalanceExecutor...");
  const RebalanceExecutor = await ethers.getContractFactory("RebalanceExecutor");
  const executor = await RebalanceExecutor.deploy(vaultAddr, deployer.address);
  await executor.waitForDeployment();
  const executorAddr = await executor.getAddress();
  console.log("     RebalanceExecutor →", executorAddr);

  // ── 3. HSPSettlement ──────────────────────────────────────────────────────
  console.log("3/3  Deploying HSPSettlement...");
  const HSPSettlement = await ethers.getContractFactory("HSPSettlement");
  const hsp = await HSPSettlement.deploy(deployer.address);
  await hsp.waitForDeployment();
  const hspAddr = await hsp.getAddress();
  console.log("     HSPSettlement →", hspAddr);

  // ── Wire permissions ──────────────────────────────────────────────────────
  console.log("\nWiring permissions...");

  // RebalanceExecutor must be an authorised executor on TreasuryVault
  const tx1 = await vault.setExecutor(executorAddr, true);
  await tx1.wait();
  console.log("  TreasuryVault.setExecutor(RebalanceExecutor) ✓");

  // Deployer wallet is also set as an authorised relayer on HSPSettlement by default (owner == deployer)
  console.log("  HSPSettlement relayer: owner (deployer) ✓");

  // ── Persist addresses ─────────────────────────────────────────────────────
  const envPath = path.join(__dirname, "../.env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const updates: Record<string, string> = {
    TREASURY_VAULT_ADDRESS: vaultAddr,
    REBALANCE_EXECUTOR_ADDRESS: executorAddr,
    HSP_SETTLEMENT_ADDRESS: hspAddr,
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent.trim() + "\n");
  console.log("\n.env updated with contract addresses.\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployment complete");
  console.log("  TREASURY_VAULT_ADDRESS   =", vaultAddr);
  console.log("  REBALANCE_EXECUTOR_ADDRESS =", executorAddr);
  console.log("  HSP_SETTLEMENT_ADDRESS   =", hspAddr);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
