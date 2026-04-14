// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YieldOracle
 * @notice On-chain registry of current APY values per asset (in basis points).
 *         Owner updates these to reflect real-world reference rates
 *         (e.g. silver ETF yield, MMF rate, veHSK staking rewards).
 *         100 bps = 1% APY.
 */
contract YieldOracle is Ownable {

    struct AssetYield {
        uint256 apyBps;      // e.g. 480 = 4.80%
        uint256 updatedAt;   // block.timestamp of last update
        string  symbol;
    }

    mapping(uint256 => AssetYield) public yields; // assetId => yield

    event ApyUpdated(uint256 indexed assetId, string symbol, uint256 apyBps, uint256 timestamp);

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Write ────────────────────────────────────────────────────────────────

    function setApy(uint256 assetId, uint256 apyBps, string calldata symbol) external onlyOwner {
        yields[assetId] = AssetYield({ apyBps: apyBps, updatedAt: block.timestamp, symbol: symbol });
        emit ApyUpdated(assetId, symbol, apyBps, block.timestamp);
    }

    function setBatchApy(
        uint256[] calldata assetIds,
        uint256[] calldata apyBpsArr,
        string[]  calldata symbols
    ) external onlyOwner {
        require(assetIds.length == apyBpsArr.length && apyBpsArr.length == symbols.length, "Length mismatch");
        for (uint256 i = 0; i < assetIds.length; i++) {
            yields[assetIds[i]] = AssetYield({
                apyBps:    apyBpsArr[i],
                updatedAt: block.timestamp,
                symbol:    symbols[i]
            });
            emit ApyUpdated(assetIds[i], symbols[i], apyBpsArr[i], block.timestamp);
        }
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    function getApy(uint256 assetId) external view returns (uint256 apyBps, uint256 updatedAt, string memory symbol) {
        AssetYield memory y = yields[assetId];
        return (y.apyBps, y.updatedAt, y.symbol);
    }

    /// @notice Returns APY for assets 0–3 in a single call (saves 3 round-trips).
    function getAllApys() external view returns (
        uint256[4] memory apyBpsArr,
        uint256[4] memory updatedAts,
        string[4]  memory symbolsArr
    ) {
        for (uint256 i = 0; i < 4; i++) {
            AssetYield memory y = yields[i];
            apyBpsArr[i]  = y.apyBps;
            updatedAts[i] = y.updatedAt;
            symbolsArr[i] = y.symbol;
        }
    }
}
