// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "fhevm/lib/TFHE.sol";
import {SepoliaZamaFHEVMConfig} from "fhevm/config/ZamaFHEVMConfig.sol";
import {SepoliaZamaGatewayConfig} from "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract EthereumFighter is
    SepoliaZamaFHEVMConfig,
    SepoliaZamaGatewayConfig,
    GatewayCaller
{
    using SafeERC20 for IERC20;

    // State variables
    address public player1;
    address public player2;
    IERC20 public gameToken;
    mapping(address => euint256) public userAsset1Balance;
    mapping(address => euint256) public userAsset2Balance;
    uint256 public oracleExpirationThreshold;
    AggregatorV3Interface internal dataFeed;

    // Store decrypted final scores
    uint256 public player1FinalScore;
    uint256 public player2FinalScore;
    bool public scoresDecrypted;

    // Track if rewards have been claimed
    bool public player1RewardClaimed;
    bool public player2RewardClaimed;

    // Game rules
    struct GameRules {
        uint256 gameStakingAmount; // Initial stake amount
        uint256 gameDuration;
        uint256 gameStartTime;
        uint256 rewardAmount; // Additional reward for the winner
        // Arrays should be the same length
        address[] assets;
        uint256[] assetAmounts;
    }
    GameRules public gameRules;

    // Events
    event DecryptionRequested(uint256 requestID);
    event PlayerEnrolled(address player);
    event AssetTraded(address player, bool isBuy, uint256 timestamp);
    event ScoresDecrypted(uint256 player1Score, uint256 player2Score);
    event GameWinner(address winner);
    event RewardClaimed(address player, uint256 amount, bool isWinner);

    // Errors
    error ZeroAddress();
    error ZeroDuration();
    error ZeroAmount();
    error InvalidOracleExpirationThreshold();
    error GameIsFull();
    error ArrayLengthMismatch();
    error PlayerNotEnrolled();
    error PlayerAlreadyEnrolled();
    error GameNotStarted();
    error GameStarted();
    error GameNotEnded();
    error NotAPlayer();
    error DataIsNotDecrypted();
    error PriceOracleExpired();
    error PriceOracleInvalid();
    error MissingGameRules(address asset, uint256 amount);
    error RewardAlreadyClaimed();

    constructor(
        address _dataFeeds,
        address _gameToken, // Added gameToken as a constructor parameter
        GameRules memory _gameRules,
        uint256 _oracleExpirationThreshold
    ) {
        if (_dataFeeds == address(0)) {
            revert ZeroAddress();
        }
        if (_gameToken == address(0)) {
            revert ZeroAddress();
        }
        if (_gameRules.gameStakingAmount == 0) {
            revert ZeroAmount();
        }
        if (_gameRules.rewardAmount == 0) {
            revert ZeroAmount();
        }
        if (_gameRules.gameDuration == 0) {
            revert ZeroDuration();
        }
        if (_gameRules.gameStartTime == 0) {
            revert ZeroDuration();
        }
        if (_gameRules.assets.length != _gameRules.assetAmounts.length) {
            revert ArrayLengthMismatch();
        }
        if (_oracleExpirationThreshold == 0) {
            revert InvalidOracleExpirationThreshold();
        }

        gameRules = _gameRules;
        gameToken = IERC20(_gameToken); // Initialize gameToken directly from the constructor parameter
        dataFeed = AggregatorV3Interface(_dataFeeds);
        oracleExpirationThreshold = _oracleExpirationThreshold;
        scoresDecrypted = false;
        player1RewardClaimed = false;
        player2RewardClaimed = false;
    }

    function enrollPlayer() public {
        if (block.timestamp >= gameRules.gameStartTime) {
            revert GameStarted();
        }
        if (msg.sender == player1 || msg.sender == player2) {
            revert PlayerAlreadyEnrolled();
        }

        // Check if game is full
        if (player1 != address(0) && player2 != address(0)) {
            revert GameIsFull();
        }

        // Stake the game token
        gameToken.safeTransferFrom(
            msg.sender,
            address(this),
            gameRules.gameStakingAmount
        );

        // Loop through the assets and check if the user has the assets
        for (uint256 i = 0; i < gameRules.assets.length; i++) {
            IERC20 asset = IERC20(gameRules.assets[i]);
            uint256 balance = asset.balanceOf(msg.sender);
            if (balance < gameRules.assetAmounts[i]) {
                revert MissingGameRules(
                    gameRules.assets[i],
                    gameRules.assetAmounts[i]
                );
            }
            // Transfer the asset to the contract
            asset.safeTransferFrom(
                msg.sender,
                address(this),
                gameRules.assetAmounts[i]
            );
        }

        // Mark the player as enrolled
        if (player1 == address(0)) {
            player1 = msg.sender;
        } else {
            player2 = msg.sender;
        }

        // Initialize encrypted balances
        userAsset1Balance[msg.sender] = TFHE.asEuint256(100);
        userAsset2Balance[msg.sender] = TFHE.asEuint256(100000);

        // Allow contract to operate on encrypted values
        TFHE.allowThis(userAsset1Balance[msg.sender]);
        TFHE.allowThis(userAsset2Balance[msg.sender]);

        emit PlayerEnrolled(msg.sender);
    }

    function buyEth(
        einput encryptedAmount,
        bytes calldata inputProof
    ) public returns (bool) {
        if (msg.sender != player1 && msg.sender != player2) {
            revert PlayerNotEnrolled();
        }
        if (block.timestamp < gameRules.gameStartTime) {
            revert GameNotStarted();
        }
        if (
            block.timestamp > gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameNotEnded();
        }

        // Cast input to euint256 for consistent type usage
        euint256 amount = TFHE.asEuint256(encryptedAmount, inputProof);

        // Fetch the price
        int256 priceRaw = fetchPrice();

        // Convert price to uint256, ensuring it's positive
        uint256 priceUint = uint256(priceRaw > 0 ? priceRaw : -priceRaw);
        euint256 price = TFHE.asEuint256(priceUint);

        // Calculate the cost of tokens to buy
        euint256 cost = TFHE.mul(price, amount);

        // Check if user has enough balance for the purchase
        ebool hasSufficientBalance = TFHE.ge(
            userAsset2Balance[msg.sender],
            cost
        );

        // Update balances conditionally based on sufficiency check
        userAsset1Balance[msg.sender] = TFHE.add(
            userAsset1Balance[msg.sender],
            TFHE.select(hasSufficientBalance, amount, TFHE.asEuint256(0))
        );

        userAsset2Balance[msg.sender] = TFHE.sub(
            userAsset2Balance[msg.sender],
            TFHE.select(hasSufficientBalance, cost, TFHE.asEuint256(0))
        );

        emit AssetTraded(msg.sender, true, block.timestamp);
        return true;
    }

    function sellEth(
        einput encryptedAmount,
        bytes calldata inputProof
    ) public returns (bool) {
        if (msg.sender != player1 && msg.sender != player2) {
            revert PlayerNotEnrolled();
        }
        if (block.timestamp < gameRules.gameStartTime) {
            revert GameNotStarted();
        }
        if (
            block.timestamp > gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameNotEnded();
        }

        euint256 amount = TFHE.asEuint256(encryptedAmount, inputProof);

        // Fetch the price
        int256 priceRaw = fetchPrice();

        // Convert price to uint256, ensuring it's positive
        uint256 priceUint = uint256(priceRaw > 0 ? priceRaw : -priceRaw);
        euint256 price = TFHE.asEuint256(priceUint);

        // Calculate the revenue from selling tokens
        euint256 revenue = TFHE.mul(price, amount);

        // Check if user has enough tokens to sell
        ebool hasSufficientTokens = TFHE.ge(
            userAsset1Balance[msg.sender],
            amount
        );

        // Update balances conditionally based on sufficiency check
        userAsset1Balance[msg.sender] = TFHE.sub(
            userAsset1Balance[msg.sender],
            TFHE.select(hasSufficientTokens, amount, TFHE.asEuint256(0))
        );

        userAsset2Balance[msg.sender] = TFHE.add(
            userAsset2Balance[msg.sender],
            TFHE.select(hasSufficientTokens, revenue, TFHE.asEuint256(0))
        );

        emit AssetTraded(msg.sender, false, block.timestamp);
        return true;
    }

    function fetchPrice() public view returns (int256) {
        // Fetch the latest round data from the Chainlink data feed
        (, int256 answer, , uint256 updatedAt, ) = dataFeed.latestRoundData();

        // Validate the oracle data
        if (updatedAt + oracleExpirationThreshold < block.timestamp) {
            revert PriceOracleExpired();
        }

        if (answer <= 0) {
            revert PriceOracleInvalid();
        }

        return answer;
    }

    function getWinner() public view returns (address) {
        // Check if the game has ended
        if (
            block.timestamp < gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameNotEnded();
        }

        // Check if scores have been decrypted
        if (!scoresDecrypted) {
            revert DataIsNotDecrypted();
        }

        // Compare the decrypted scores to determine the winner
        if (player1FinalScore > player2FinalScore) {
            return player1;
        } else if (player2FinalScore > player1FinalScore) {
            return player2;
        } else {
            // In case of a tie, return address(0)
            return address(0);
        }
    }

    function requestDecryption() public returns (uint256) {
        if (msg.sender != player1 && msg.sender != player2) {
            revert PlayerNotEnrolled();
        }
        if (
            block.timestamp < gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameNotEnded();
        }

        uint256[] memory cts = new uint256[](4);
        cts[0] = Gateway.toUint256(userAsset1Balance[player1]);
        cts[1] = Gateway.toUint256(userAsset2Balance[player1]);
        cts[2] = Gateway.toUint256(userAsset1Balance[player2]);
        cts[3] = Gateway.toUint256(userAsset2Balance[player2]);

        uint256 requestID = Gateway.requestDecryption(
            cts,
            this.callbackUint256.selector,
            0,
            block.timestamp + 100,
            false
        );

        emit DecryptionRequested(requestID);
        return requestID;
    }

    function withdraw() public {
        // Ensure game has ended
        if (
            block.timestamp < gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameNotEnded();
        }

        // Ensure player is a participant
        if (msg.sender != player1 && msg.sender != player2) {
            revert NotAPlayer();
        }

        // Ensure scores have been decrypted
        if (!scoresDecrypted) {
            revert DataIsNotDecrypted();
        }

        // Determine if the caller is player1 or player2
        bool isPlayer1 = (msg.sender == player1);

        // Check if this player has already claimed their reward
        if (
            (isPlayer1 && player1RewardClaimed) ||
            (!isPlayer1 && player2RewardClaimed)
        ) {
            revert RewardAlreadyClaimed();
        }

        // Get the winner
        address winner = getWinner();

        // Calculate amount to return
        uint256 amountToReturn = gameRules.gameStakingAmount;
        bool isWinner = (msg.sender == winner);

        // Add reward amount if this player is the winner
        if (isWinner && winner != address(0)) {
            amountToReturn += gameRules.rewardAmount;
        }

        // Mark as claimed
        if (isPlayer1) {
            player1RewardClaimed = true;
        } else {
            player2RewardClaimed = true;
        }

        // Transfer tokens
        gameToken.safeTransfer(msg.sender, amountToReturn);

        // Emit event
        emit RewardClaimed(msg.sender, amountToReturn, isWinner);
    }

    function callbackUint256(
        uint256 /*requestID*/,
        uint256[] memory decryptedInput
    ) public onlyGateway {
        // Ensure we have all required values
        require(decryptedInput.length >= 4, "Insufficient decrypted inputs");

        // Calculate and set total asset values for each player
        player1FinalScore = decryptedInput[0] + decryptedInput[1];
        player2FinalScore = decryptedInput[2] + decryptedInput[3];

        // Mark scores as decrypted
        scoresDecrypted = true;

        // Emit an event with the scores
        emit ScoresDecrypted(player1FinalScore, player2FinalScore);

        // Determine and emit the winner
        address winner;
        if (player1FinalScore > player2FinalScore) {
            winner = player1;
        } else if (player2FinalScore > player1FinalScore) {
            winner = player2;
        } else {
            winner = address(0); // Tie
        }

        emit GameWinner(winner);
    }
}
