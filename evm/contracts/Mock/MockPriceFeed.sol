
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title MockPriceFeed
 * @dev A mock Chainlink price feed for testing
 */
contract MockPriceFeed {
    int256 private price;
    uint8 private decimals_;
    uint80 private roundId;
    uint256 private timestamp;
    
    constructor(int256 _price) {
        price = _price;
        decimals_ = 8;
        roundId = 1;
        timestamp = block.timestamp;
    }
    
    function latestRoundData() external view returns (
        uint80 roundId_,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (roundId, price, timestamp, timestamp, roundId);
    }
    
    function setPrice(int256 _price) external {
        price = _price;
        timestamp = block.timestamp;
        roundId++;
    }
    
    function decimals() external view returns (uint8) {
        return decimals_;
    }
}