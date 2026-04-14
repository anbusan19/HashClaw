// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TreasuryVault
 * @notice Holds RWA tokens and tracks per-user allocations across asset classes.
 *         Supported asset types: RWA_SILVER, RWA_MMF, VEHSK, STABLE_LP.
 */
contract TreasuryVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Asset registry ───────────────────────────────────────────────────────
    enum AssetType { RWA_SILVER, RWA_MMF, VEHSK, STABLE_LP }

    struct Asset {
        address tokenAddress;
        AssetType assetType;
        bool active;
        string symbol;
    }

    // assetId => Asset
    mapping(uint256 => Asset) public assets;
    uint256 public assetCount;

    // ─── User allocations ─────────────────────────────────────────────────────
    // user => assetId => amount deposited
    mapping(address => mapping(uint256 => uint256)) public userBalances;
    // user => total value deposited (in base units, informational)
    mapping(address => uint256) public userTotalDeposited;
    // user => risk profile (0=conservative, 1=balanced, 2=aggressive)
    mapping(address => uint8) public userRiskProfile;

    // ─── Authorised executors ─────────────────────────────────────────────────
    mapping(address => bool) public authorisedExecutors;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AssetRegistered(uint256 indexed assetId, address token, AssetType assetType, string symbol);
    event Deposited(address indexed user, uint256 indexed assetId, uint256 amount);
    event Withdrawn(address indexed user, uint256 indexed assetId, uint256 amount);
    event AllocationUpdated(address indexed user, uint256 indexed assetId, uint256 newBalance);
    event ExecutorSet(address indexed executor, bool authorised);
    event RiskProfileSet(address indexed user, uint8 profile);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyExecutor() {
        require(authorisedExecutors[msg.sender] || msg.sender == owner(), "Not authorised executor");
        _;
    }

    modifier assetExists(uint256 assetId) {
        require(assetId < assetCount && assets[assetId].active, "Asset not active");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Admin ────────────────────────────────────────────────────────────────

    function registerAsset(
        address tokenAddress,
        AssetType assetType,
        string calldata symbol
    ) external onlyOwner returns (uint256 assetId) {
        require(tokenAddress != address(0), "Zero address");
        assetId = assetCount++;
        assets[assetId] = Asset({
            tokenAddress: tokenAddress,
            assetType: assetType,
            active: true,
            symbol: symbol
        });
        emit AssetRegistered(assetId, tokenAddress, assetType, symbol);
    }

    function setExecutor(address executor, bool authorised) external onlyOwner {
        authorisedExecutors[executor] = authorised;
        emit ExecutorSet(executor, authorised);
    }

    function deactivateAsset(uint256 assetId) external onlyOwner {
        assets[assetId].active = false;
    }

    // ─── User actions ─────────────────────────────────────────────────────────

    function deposit(uint256 assetId, uint256 amount) external nonReentrant assetExists(assetId) {
        require(amount > 0, "Zero amount");
        IERC20 token = IERC20(assets[assetId].tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), amount);
        userBalances[msg.sender][assetId] += amount;
        userTotalDeposited[msg.sender] += amount;
        emit Deposited(msg.sender, assetId, amount);
    }

    function withdraw(uint256 assetId, uint256 amount) external nonReentrant assetExists(assetId) {
        require(amount > 0, "Zero amount");
        require(userBalances[msg.sender][assetId] >= amount, "Insufficient balance");
        userBalances[msg.sender][assetId] -= amount;
        userTotalDeposited[msg.sender] -= amount;
        IERC20(assets[assetId].tokenAddress).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, assetId, amount);
    }

    function setRiskProfile(uint8 profile) external {
        require(profile <= 2, "Invalid profile");
        userRiskProfile[msg.sender] = profile;
        emit RiskProfileSet(msg.sender, profile);
    }

    // ─── Executor-only (called by RebalanceExecutor) ──────────────────────────

    /**
     * @notice Transfers tokens from vault to a target address (e.g., a real DEX or staking contract).
     *         Use this only when tokens genuinely leave the vault (real DEX integration).
     *         For simulated/internal swaps use debitBalance + creditBalance instead.
     */
    function executeTransfer(
        address user,
        uint256 assetId,
        address to,
        uint256 amount
    ) external nonReentrant onlyExecutor assetExists(assetId) {
        require(userBalances[user][assetId] >= amount, "Insufficient user balance");
        userBalances[user][assetId] -= amount;
        IERC20(assets[assetId].tokenAddress).safeTransfer(to, amount);
        emit AllocationUpdated(user, assetId, userBalances[user][assetId]);
    }

    /**
     * @notice Debits a user's internal balance without moving real tokens.
     *         Used for simulated swaps — pair with creditBalance on the destination asset.
     *         Real tokens remain in the vault; only the accounting changes.
     */
    function debitBalance(
        address user,
        uint256 assetId,
        uint256 amount
    ) external onlyExecutor assetExists(assetId) {
        require(userBalances[user][assetId] >= amount, "Insufficient user balance");
        userBalances[user][assetId] -= amount;
        emit AllocationUpdated(user, assetId, userBalances[user][assetId]);
    }

    /**
     * @notice Credits a user's balance after a swap/yield receipt lands in the vault.
     */
    function creditBalance(
        address user,
        uint256 assetId,
        uint256 amount
    ) external onlyExecutor assetExists(assetId) {
        userBalances[user][assetId] += amount;
        emit AllocationUpdated(user, assetId, userBalances[user][assetId]);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getPortfolio(address user) external view returns (
        uint256[] memory assetIds,
        uint256[] memory balances,
        string[] memory symbols
    ) {
        assetIds = new uint256[](assetCount);
        balances = new uint256[](assetCount);
        symbols = new string[](assetCount);
        for (uint256 i = 0; i < assetCount; i++) {
            assetIds[i] = i;
            balances[i] = userBalances[user][i];
            symbols[i] = assets[i].symbol;
        }
    }

    function getAsset(uint256 assetId) external view returns (Asset memory) {
        return assets[assetId];
    }
}
