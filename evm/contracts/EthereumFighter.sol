// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
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
// state variables go here

address player1;
address player2;
address gameToken;
uint256 player1Asset1DecreptedBalance;
uint256 player1Asset2DecreptedBalance;
uint256 player2Asset1DecreptedBalance;
uint256 player2Asset2DecreptedBalance;
// hfe var 
euint256 player1Asset1EncreptedBalance;
euint256 player1Asset2EncreptedBalance;
euint256 player2Asset1EncreptedBalance;
euint256 player2Asset2EncreptedBalance;



// games rules 
struct GameRules {
    uint256 gameStakingAmount;
    uint256 gameDuration;
    uint256 gameStartTime;
    uint256 gameEndTime;
    /// here we will ba adding a basic rule: players should hold the assets for a certain amount
    // the two arrays should be the same length
    address [] asstes;
    uint256 [] assetAmounts;
}
GameRules gameRules;
// events go here


    AggregatorV3Interface internal dataFeed;

    // errors go here
    error InvalidDataFeedAddress();
    constructor(address _dataFeeds) public{
        if (_dataFeeds == address(0)) {
            revert InvalidDataFeedAddress();
        }
        dataFeed = AggregatorV3Interface(_dataFeeds);
        // game logic should be here
        // TODO
    }

/** game logic "brainstorming" :
 *  what we want to do ? 
 * set the game rules
 * players enter 
 * game starts 
 * players play
 * when the game ends, we need to know who won 
 * user can request decryption of the game result so that he can see the actual result
 * winner gets the game token reward
 * 
 * 
 */

function  enrollPlayer() public {
    // player can enroll in the game
    // we need to store the player address and the game id
    // we also need to check if the player is already enrolled
    // if the player is already enrolled, we need to revert the transaction
    // if the player is not enrolled, we need to store the player address and the game id
    // we also need to check if the game is already started
    // if the game is already started, we need to revert the transaction
    // if the game is not started, we need to store the player address and the game id
    // TODO    
}
function play () public {
    // player can play the game
    // we need to check if the player is enrolled in the game
    // if the player is not enrolled, we need to revert the transaction
    // we also need to check if the game is already started
    // if the game is not started, we need to revert the transaction
    // check the price of the  token pair swapping and store it in the contract 
    // TODO    
}

function getWinner() public {
    // anyone can call this function to get the winner of the game
    // fhe based computation will be done here to compute player with the highest balance
}  

function decryptResult() public {
    // player can request decryption of the game result
    // we need to check if the player is the winner
    // if the player is not the winner, we need to revert the transaction
    // we also need to check if the game is already started
    // if the game is not started, we need to revert the transaction
    // TODO    
}
function withdraw() public {
    // player can withdraw the game staked tokens
    // we need to check if the player is the winner
    // if player is the winner, he can withdraw the reward
    // we also need to check if the game is already started
    // if the game is not started, we need to revert the transaction
    // TODO    
}
    // coppied from unswap library
        // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2Library: ZERO_ADDRESS');
    }

}
