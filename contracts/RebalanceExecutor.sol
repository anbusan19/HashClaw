// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TreasuryVault.sol";

/**
 * @title RebalanceExecutor
 * @notice Receives a rebalance plan (array of assetId/targetWeight pairs) from the AI agent
 *         and executes the necessary transfers. For the hackathon demo, swaps are simulated
 *         by direct vault credit/debit — a real deployment would route through a DEX adapter.
 */
contract RebalanceExecutor is Ownable, ReentrancyGuard {

    TreasuryVault public immutable vault;

    uint256 public constant WEIGHT_PRECISION = 10_000; // basis points (100% = 10000)
    uint256 public maxSlippageBps = 50; // 0.5% default

    struct RebalanceLeg {
        uint256 fromAssetId;
        uint256 toAssetId;
        uint256 amount;        // raw token units to move
        uint256 minAmountOut;  // slippage guard
    }

    struct RebalancePlan {
        address user;
        RebalanceLeg[] legs;
        string reasoning;      // AI-generated plain-English rationale (stored in event)
        uint256 timestamp;
    }

    uint256 public planCount;
    mapping(uint256 => RebalancePlan) private _plans; // planId => plan

    // ─── Events ───────────────────────────────────────────────────────────────
    event RebalanceQueued(uint256 indexed planId, address indexed user, string reasoning);
    event RebalanceExecuted(uint256 indexed planId, address indexed user, uint256 legsExecuted);
    event LegExecuted(uint256 indexed planId, uint256 fromAsset, uint256 toAsset, uint256 amount);
    event SlippageUpdated(uint256 newMaxSlippageBps);

    constructor(address _vault, address initialOwner) Ownable(initialOwner) {
        vault = TreasuryVault(_vault);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setMaxSlippage(uint256 slippageBps) external onlyOwner {
        require(slippageBps <= 500, "Slippage too high"); // max 5%
        maxSlippageBps = slippageBps;
        emit SlippageUpdated(slippageBps);
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /**
     * @notice Called by the AI agent with a fully-formed rebalance plan.
     *         Each leg moves `amount` of fromAsset into toAsset (simulated swap for demo).
     */
    function submitAndExecute(
        address user,
        uint256[] calldata fromAssetIds,
        uint256[] calldata toAssetIds,
        uint256[] calldata amounts,
        uint256[] calldata minAmountsOut,
        string calldata reasoning
    ) external nonReentrant returns (uint256 planId) {
        // Owner (agent) can rebalance on behalf of any user.
        // Users can rebalance their own portfolio directly from their wallet.
        require(msg.sender == user || msg.sender == owner(), "Not authorised");
        require(
            fromAssetIds.length == toAssetIds.length &&
            toAssetIds.length == amounts.length &&
            amounts.length == minAmountsOut.length,
            "Array length mismatch"
        );

        planId = planCount++;

        // Build & store plan (Solidity storage of dynamic struct array)
        RebalancePlan storage plan = _plans[planId];
        plan.user = user;
        plan.reasoning = reasoning;
        plan.timestamp = block.timestamp;

        for (uint256 i = 0; i < fromAssetIds.length; i++) {
            plan.legs.push(RebalanceLeg({
                fromAssetId: fromAssetIds[i],
                toAssetId: toAssetIds[i],
                amount: amounts[i],
                minAmountOut: minAmountsOut[i]
            }));
        }

        emit RebalanceQueued(planId, user, reasoning);

        // Execute each leg
        for (uint256 i = 0; i < fromAssetIds.length; i++) {
            _executeLeg(planId, user, fromAssetIds[i], toAssetIds[i], amounts[i], minAmountsOut[i]);
        }

        emit RebalanceExecuted(planId, user, fromAssetIds.length);
    }

    function _executeLeg(
        uint256 planId,
        address user,
        uint256 fromAssetId,
        uint256 toAssetId,
        uint256 amount,
        uint256 minAmountOut
    ) internal {
        // Debit source asset — pure internal accounting, real tokens stay in vault.
        // (In production: replace with vault.executeTransfer + real DEX call)
        vault.debitBalance(user, fromAssetId, amount);

        // Simulated swap: 1:1 with 0.1% fee. Replace with DEX adapter in production.
        uint256 amountOut = _simulateSwap(fromAssetId, toAssetId, amount);
        require(amountOut >= minAmountOut, "Slippage exceeded");

        // Credit destination asset to user's internal balance
        vault.creditBalance(user, toAssetId, amountOut);

        emit LegExecuted(planId, fromAssetId, toAssetId, amountOut);
    }

    /**
     * @notice Swap simulation — returns amountOut after a 0.1% fee.
     *         Replace with real DEX call in production.
     */
    function _simulateSwap(
        uint256, /* fromAssetId */
        uint256, /* toAssetId */
        uint256 amountIn
    ) internal pure returns (uint256) {
        // 0.1% fee simulation
        return (amountIn * 9990) / 10_000;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getPlan(uint256 planId) external view returns (
        address user,
        string memory reasoning,
        uint256 timestamp,
        uint256 legCount
    ) {
        RebalancePlan storage plan = _plans[planId];
        return (plan.user, plan.reasoning, plan.timestamp, plan.legs.length);
    }

    function getPlanLeg(uint256 planId, uint256 legIndex) external view returns (RebalanceLeg memory) {
        return _plans[planId].legs[legIndex];
    }
}
