import { expect } from "chai";
import { ethers } from "hardhat";
import { TreasuryVault, RebalanceExecutor, HSPSettlement } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * HashClaw.test.ts
 * Integration tests for the three core contracts.
 * Uses a mock ERC-20 to represent RWA tokens in the vault.
 */

describe("HashClaw Contracts", function () {
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let relayer: HardhatEthersSigner;

  let vault: TreasuryVault;
  let executor: RebalanceExecutor;
  let hsp: HSPSettlement;
  let tokenA: Awaited<ReturnType<typeof deployMockToken>>;
  let tokenB: Awaited<ReturnType<typeof deployMockToken>>;

  // Simple mock ERC-20 via inline bytecode — or we deploy a minimal one.
  async function deployMockToken(name: string, symbol: string) {
    const ERC20 = await ethers.getContractFactory("MockERC20");
    const token = await ERC20.deploy(name, symbol);
    await token.waitForDeployment();
    return token;
  }

  before(async function () {
    [owner, user, relayer] = await ethers.getSigners();
  });

  beforeEach(async function () {
    // Deploy contracts
    const VaultFactory = await ethers.getContractFactory("TreasuryVault");
    vault = await VaultFactory.deploy(owner.address) as TreasuryVault;
    await vault.waitForDeployment();

    const ExecutorFactory = await ethers.getContractFactory("RebalanceExecutor");
    executor = await ExecutorFactory.deploy(await vault.getAddress(), owner.address) as RebalanceExecutor;
    await executor.waitForDeployment();

    const HSPFactory = await ethers.getContractFactory("HSPSettlement");
    hsp = await HSPFactory.deploy(owner.address) as HSPSettlement;
    await hsp.waitForDeployment();

    // Wire executor permission
    await vault.setExecutor(await executor.getAddress(), true);

    // Deploy mock tokens
    tokenA = await deployMockToken("RWA Silver", "xXAG");
    tokenB = await deployMockToken("RWA MMF", "xMMF");

    // Register assets in vault
    await vault.registerAsset(await tokenA.getAddress(), 0 /* RWA_SILVER */, "xXAG");
    await vault.registerAsset(await tokenB.getAddress(), 1 /* RWA_MMF */, "xMMF");

    // Mint tokens to user and approve vault
    const amount = ethers.parseEther("1000");
    await tokenA.mint(user.address, amount);
    await tokenB.mint(user.address, amount);
    await tokenA.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
    await tokenB.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  // ── TreasuryVault ───────────────────────────────────────────────────────────
  describe("TreasuryVault", function () {
    it("registers assets correctly", async function () {
      const asset = await vault.getAsset(0);
      expect(asset.symbol).to.equal("xXAG");
      expect(asset.active).to.be.true;
    });

    it("accepts deposits and tracks balances", async function () {
      const amount = ethers.parseEther("100");
      await vault.connect(user).deposit(0, amount);
      expect(await vault.userBalances(user.address, 0)).to.equal(amount);
    });

    it("allows withdrawals", async function () {
      const amount = ethers.parseEther("100");
      await vault.connect(user).deposit(0, amount);
      const before = await tokenA.balanceOf(user.address);
      await vault.connect(user).withdraw(0, amount);
      const after = await tokenA.balanceOf(user.address);
      expect(after - before).to.equal(amount);
    });

    it("sets risk profile", async function () {
      await vault.connect(user).setRiskProfile(2);
      expect(await vault.userRiskProfile(user.address)).to.equal(2);
    });

    it("rejects invalid risk profile", async function () {
      await expect(vault.connect(user).setRiskProfile(3)).to.be.revertedWith("Invalid profile");
    });

    it("getPortfolio returns correct structure", async function () {
      await vault.connect(user).deposit(0, ethers.parseEther("50"));
      const [ids, balances, symbols] = await vault.getPortfolio(user.address);
      expect(ids.length).to.equal(2);
      expect(balances[0]).to.equal(ethers.parseEther("50"));
      expect(symbols[0]).to.equal("xXAG");
    });
  });

  // ── RebalanceExecutor ───────────────────────────────────────────────────────
  describe("RebalanceExecutor", function () {
    beforeEach(async function () {
      // Give user a balance in vault for asset 0
      await vault.connect(user).deposit(0, ethers.parseEther("200"));
      // Fund vault with tokenB so the credit can succeed
      await tokenB.mint(await vault.getAddress(), ethers.parseEther("1000"));
    });

    it("executes a rebalance leg (simulated swap)", async function () {
      const amount = ethers.parseEther("100");
      const minOut = (amount * 9950n) / 10000n;

      await executor.submitAndExecute(
        user.address,
        [0n], [1n],
        [amount], [minOut],
        "Shift silver → MMF for higher yield"
      );

      // Source asset should be reduced
      const balA = await vault.userBalances(user.address, 0);
      expect(balA).to.equal(ethers.parseEther("100"));

      // Destination should have the simulated amountOut (0.1% fee)
      const balB = await vault.userBalances(user.address, 1);
      const expectedOut = (amount * 9990n) / 10000n;
      expect(balB).to.equal(expectedOut);
    });

    it("reverts on array length mismatch", async function () {
      await expect(
        executor.submitAndExecute(user.address, [0n], [], [100n], [90n], "bad")
      ).to.be.revertedWith("Array length mismatch");
    });

    it("emits RebalanceQueued and RebalanceExecuted", async function () {
      const amount = ethers.parseEther("50");
      await expect(
        executor.submitAndExecute(user.address, [0n], [1n], [amount], [(amount * 9950n) / 10000n], "test")
      )
        .to.emit(executor, "RebalanceQueued")
        .and.to.emit(executor, "RebalanceExecuted");
    });
  });

  // ── HSPSettlement ───────────────────────────────────────────────────────────
  describe("HSPSettlement", function () {
    const tokenAddr = ethers.Wallet.createRandom().address;

    beforeEach(async function () {
      await hsp.setRelayer(relayer.address, true);
    });

    it("creates a payment request", async function () {
      const refHash = ethers.keccak256(ethers.toUtf8Bytes("plan:1"));
      await hsp.connect(relayer).createPaymentRequest(
        user.address,
        tokenAddr,
        ethers.parseEther("10"),
        0, // YIELD_WITHDRAWAL
        refHash
      );
      const req = await hsp.getRequest(0);
      expect(req.user).to.equal(user.address);
      expect(req.settled).to.be.false;
    });

    it("marks a request as settled", async function () {
      const refHash = ethers.keccak256(ethers.toUtf8Bytes("plan:2"));
      await hsp.connect(relayer).createPaymentRequest(
        user.address, tokenAddr, ethers.parseEther("5"), 0, refHash
      );
      await hsp.connect(relayer).markSettled(0);
      const req = await hsp.getRequest(0);
      expect(req.settled).to.be.true;
    });

    it("emits PaymentRequestCreated", async function () {
      const refHash = ethers.keccak256(ethers.toUtf8Bytes("plan:3"));
      await expect(
        hsp.connect(relayer).createPaymentRequest(
          user.address, tokenAddr, ethers.parseEther("1"), 0, refHash
        )
      ).to.emit(hsp, "PaymentRequestCreated");
    });
  });
});
