import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * seed.ts
 * 1. Deploys MockERC20 tokens for each asset class
 * 2. Registers them in TreasuryVault
 * 3. Mints test tokens to the deployer
 * 4. Deposits into the vault with the AI-recommended allocation
 * 5. Writes token addresses to .env
 *
 * Run: pnpm run seed
 */

const VAULT_ABI = [
  "function registerAsset(address tokenAddress, uint8 assetType, string calldata symbol) external returns (uint256 assetId)",
  "function setRiskProfile(uint8 profile) external",
  "function deposit(uint256 assetId, uint256 amount) external",
  "function getPortfolio(address user) external view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
];

// Asset types matching TreasuryVault enum: RWA_SILVER=0, RWA_MMF=1, VEHSK=2, STABLE_LP=3
const ASSETS = [
  { symbol: "xXAG",        name: "RWA Silver",          type: 0, mintAmount: "10000", depositFraction: 0.40 },
  { symbol: "xMMF",        name: "RWA Money Market Fund", type: 1, mintAmount: "10000", depositFraction: 0.30 },
  { symbol: "veHSK",       name: "Staked HSK",           type: 2, mintAmount: "10000", depositFraction: 0.22 },
  { symbol: "USDC-USDT-LP", name: "Stable LP",           type: 3, mintAmount: "10000", depositFraction: 0.08 },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, `(chainId ${network.chainId})`);
  console.log("Seeding as:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK\n");

  const vaultAddr = process.env.TREASURY_VAULT_ADDRESS;
  if (!vaultAddr) throw new Error("TREASURY_VAULT_ADDRESS not set — run pnpm run deploy first");

  const vault = new ethers.Contract(vaultAddr, VAULT_ABI, deployer);

  // ── Deploy mock tokens ─────────────────────────────────────────────────────
  console.log("Deploying mock RWA tokens...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenAddresses: Record<string, string> = {};

  for (const asset of ASSETS) {
    const token = await MockERC20.deploy(asset.name, asset.symbol);
    await token.waitForDeployment();
    const addr = await token.getAddress();
    tokenAddresses[asset.symbol] = addr;
    console.log(`  ${asset.symbol.padEnd(14)} → ${addr}`);
  }

  // ── Register assets in vault ───────────────────────────────────────────────
  console.log("\nRegistering assets in TreasuryVault...");
  const assetIds: number[] = [];

  for (const asset of ASSETS) {
    const tx = await vault.registerAsset(tokenAddresses[asset.symbol], asset.type, asset.symbol);
    const receipt = await tx.wait();
    // AssetRegistered event: (uint256 indexed assetId, ...)
    const event = receipt.logs
      .map((log: { topics: string[]; data: string }) => {
        try { return vault.interface.parseLog(log); } catch { return null; }
      })
      .find((e: { name: string } | null) => e?.name === "AssetRegistered");
    const assetId = event ? Number(event.args.assetId) : assetIds.length;
    assetIds.push(assetId);
    console.log(`  ${asset.symbol.padEnd(14)} registered as assetId ${assetId}`);
  }

  // ── Set conservative risk profile ─────────────────────────────────────────
  console.log("\nSetting risk profile to Conservative (0)...");
  await (await vault.setRiskProfile(0)).wait();
  console.log("  Risk profile set ✓");

  // ── Mint tokens to deployer ────────────────────────────────────────────────
  console.log("\nMinting tokens to deployer...");
  const mintABI = ["function mint(address to, uint256 amount) external"];

  for (const asset of ASSETS) {
    const token = new ethers.Contract(tokenAddresses[asset.symbol], mintABI, deployer);
    const amount = ethers.parseEther(asset.mintAmount);
    await (await token.mint(deployer.address, amount)).wait();
    console.log(`  Minted ${asset.mintAmount} ${asset.symbol}`);
  }

  // ── Approve vault to spend tokens ─────────────────────────────────────────
  console.log("\nApproving vault...");
  const approveABI = ["function approve(address spender, uint256 amount) external returns (bool)"];

  for (const asset of ASSETS) {
    const token = new ethers.Contract(tokenAddresses[asset.symbol], approveABI, deployer);
    await (await token.approve(vaultAddr, ethers.MaxUint256)).wait();
    console.log(`  ${asset.symbol} approved ✓`);
  }

  // ── Deposit into vault (AI-recommended allocation) ─────────────────────────
  console.log("\nDepositing with recommended allocation...");
  const TOTAL = ethers.parseEther("1000"); // deposit 1000 of each in proportion

  for (let i = 0; i < ASSETS.length; i++) {
    const asset = ASSETS[i];
    const amount = (TOTAL * BigInt(Math.round(asset.depositFraction * 10000))) / 10000n;
    await (await vault.deposit(assetIds[i], amount)).wait();
    console.log(`  Deposited ${ethers.formatEther(amount)} ${asset.symbol} (${(asset.depositFraction * 100).toFixed(0)}%)`);
  }

  // ── Verify portfolio ───────────────────────────────────────────────────────
  console.log("\nPortfolio after seeding:");
  const [ids, balances, symbols] = await vault.getPortfolio(deployer.address);
  for (let i = 0; i < (ids as bigint[]).length; i++) {
    const bal = ethers.formatEther((balances as bigint[])[i]);
    if (parseFloat(bal) > 0) {
      console.log(`  ${((symbols as string[])[i]).padEnd(14)} ${bal}`);
    }
  }

  // ── Persist token addresses to .env ───────────────────────────────────────
  const envPath = path.join(__dirname, "../.env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const updates: Record<string, string> = {
    VEHSK_ADDRESS:      tokenAddresses["veHSK"],
    RWA_SILVER_ADDRESS: tokenAddresses["xXAG"],
    RWA_MMF_ADDRESS:    tokenAddresses["xMMF"],
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
  console.log("\n.env updated with mock token addresses.");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Seed complete — vault is funded and ready");
  console.log("  RWA_SILVER_ADDRESS  =", tokenAddresses["xXAG"]);
  console.log("  RWA_MMF_ADDRESS     =", tokenAddresses["xMMF"]);
  console.log("  VEHSK_ADDRESS       =", tokenAddresses["veHSK"]);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nRun: pnpm run ui  →  refresh the chat to see live portfolio data");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
