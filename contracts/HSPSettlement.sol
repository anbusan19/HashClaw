// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HSPSettlement
 * @notice Builds and emits HSP-compatible payment requests for yield withdrawals.
 *         HSP (HashKey Settlement Protocol) is a message-passing protocol — it does NOT
 *         custody funds. This contract emits structured events that HSP relayers consume
 *         to trigger off-chain settlement.
 *
 *         Payment request schema follows HSP message format:
 *         https://docs.hashkey.com/hsp (placeholder — adapt to actual spec)
 */
contract HSPSettlement is Ownable, ReentrancyGuard {

    // ─── HSP message types ────────────────────────────────────────────────────
    enum PaymentType {
        YIELD_WITHDRAWAL,   // yield earned → user wallet
        REBALANCE_RECEIPT,  // confirmation of rebalance completion
        RWA_REDEMPTION      // RWA token → fiat/stablecoin via HSP
    }

    struct PaymentRequest {
        uint256 requestId;
        address user;
        address tokenAddress;
        uint256 amount;
        PaymentType paymentType;
        bytes32 referenceHash;  // keccak256 of planId + timestamp for auditability
        uint256 createdAt;
        bool settled;
    }

    uint256 public requestCount;
    mapping(uint256 => PaymentRequest) public requests;
    // user => list of their request IDs
    mapping(address => uint256[]) public userRequests;

    // ─── Events ───────────────────────────────────────────────────────────────
    // HSP relayers listen for this event
    event PaymentRequestCreated(
        uint256 indexed requestId,
        address indexed user,
        address indexed token,
        uint256 amount,
        PaymentType paymentType,
        bytes32 referenceHash
    );
    event PaymentSettled(uint256 indexed requestId, address indexed user, uint256 amount);
    event PaymentCancelled(uint256 indexed requestId);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    mapping(address => bool) public authorisedRelayers;

    modifier onlyRelayer() {
        require(authorisedRelayers[msg.sender] || msg.sender == owner(), "Not authorised relayer");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setRelayer(address relayer, bool authorised) external onlyOwner {
        authorisedRelayers[relayer] = authorised;
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /**
     * @notice Creates an HSP payment request for a yield withdrawal.
     *         The referenceHash ties this request to an on-chain rebalance plan for audit.
     */
    function createPaymentRequest(
        address user,
        address tokenAddress,
        uint256 amount,
        PaymentType paymentType,
        bytes32 referenceHash
    ) external onlyRelayer nonReentrant returns (uint256 requestId) {
        require(user != address(0), "Zero user address");
        require(tokenAddress != address(0), "Zero token address");
        require(amount > 0, "Zero amount");

        requestId = requestCount++;

        requests[requestId] = PaymentRequest({
            requestId: requestId,
            user: user,
            tokenAddress: tokenAddress,
            amount: amount,
            paymentType: paymentType,
            referenceHash: referenceHash,
            createdAt: block.timestamp,
            settled: false
        });

        userRequests[user].push(requestId);

        emit PaymentRequestCreated(requestId, user, tokenAddress, amount, paymentType, referenceHash);
    }

    /**
     * @notice Marks a payment request as settled once HSP relayer confirms off-chain payment.
     */
    function markSettled(uint256 requestId) external onlyRelayer {
        PaymentRequest storage req = requests[requestId];
        require(!req.settled, "Already settled");
        req.settled = true;
        emit PaymentSettled(requestId, req.user, req.amount);
    }

    function cancelRequest(uint256 requestId) external onlyRelayer {
        require(!requests[requestId].settled, "Already settled");
        emit PaymentCancelled(requestId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getUserRequests(address user) external view returns (uint256[] memory) {
        return userRequests[user];
    }

    function getRequest(uint256 requestId) external view returns (PaymentRequest memory) {
        return requests[requestId];
    }

    /**
     * @notice Builds the off-chain HSP message payload that relayers broadcast.
     *         Returns ABI-encoded bytes that match the HSP message schema.
     */
    function buildHSPPayload(uint256 requestId) external view returns (bytes memory) {
        PaymentRequest memory req = requests[requestId];
        return abi.encode(
            req.requestId,
            req.user,
            req.tokenAddress,
            req.amount,
            uint8(req.paymentType),
            req.referenceHash,
            req.createdAt
        );
    }
}
