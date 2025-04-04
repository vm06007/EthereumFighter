// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import {AggregatorV3Interface} from "@chainlink/contracts@1.3.0/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "fhevm/lib/TFHE.sol";
import {SepoliaZamaFHEVMConfig} from "fhevm/config/ZamaFHEVMConfig.sol";
import {SepoliaZamaGatewayConfig} from "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract EthereumFighter is
    SepoliaZamaFHEVMConfig,
    SepoliaZamaGatewayConfig,
    GatewayCaller
{
    AggregatorV3Interface internal dataFeed;

    // errors go here
    error InvalidDataFeedAddress();
    constructor(address _dataFeeds) public{
        if (_dataFeeds == address(0)) {
            revert InvalidDataFeedAddress();
        }
        dataFeed = AggregatorV3Interface(_dataFeeds);
    }

    
}
