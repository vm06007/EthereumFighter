// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EtherumFighterPlainMode
 * @notice A trading game contract where two players compete to earn the highest portfolio value
 * @dev Gas-optimized version without FHE encryption
 */
contract EtherumFighterPlainMode {
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    // Player addresses
    address public player1;
    address public player2;

    // Token used for staking and rewards
    IERC20 public immutable gameToken;

    // Asset balances for each player
    mapping(address => uint256) public userAsset1Balance;
    mapping(address => uint256) public userAsset2Balance;

    // Oracle configuration
    uint256 public immutable oracleExpirationThreshold;
    AggregatorV3Interface public immutable dataFeed;

    // Reward claim tracking using a single uint256 for gas optimization

    // Individual reward claim tracking
    bool private player1RewardClaimed;
    bool private player2RewardClaimed;

    /* ========== GAME CONFIGURATION ========== */

    struct GameRules {
        uint256 gameStakingAmount;
        uint256 gameDuration;
        uint256 gameStartTime;
        uint256 rewardAmount;
        address[] assets;
        uint256[] assetAmounts;
    }

    GameRules public gameRules;

    /* ========== EVENTS ========== */

    event PlayerEnrolled(address indexed player);
    event AssetTraded(
        address indexed player,
        bool isBuy,
        uint256 assetAmount,
        uint256 price
    );
    event GameStarted(uint256 startTime, uint256 duration);
    event GameWinner(address indexed winner);
    event RewardClaimed(address indexed player, uint256 amount, bool isWinner);

    /* ========== ERRORS ========== */

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDuration();
    error InvalidArrayLength();
    error GameIsFull();
    error NotAuthorized();
    error GameInProgress();
    error GameNotStarted();
    error GameEnded();
    error GameNotEnded();
    error InsufficientBalance(uint256 required, uint256 available);
    error PriceOracleExpired();
    error PriceOracleInvalid();
    error RewardAlreadyClaimed();
    error TransferFailed();
    error InvalidGameStatus();

    /* ========== CONSTRUCTOR ========== */

    /**
     * @notice Initializes the EthereumFighter game contract
     * @param _dataFeeds Address of the Chainlink price feed
     * @param _gameToken Address of the game token
     * @param _gameRules Game rules and configuration
     * @param _oracleExpirationThreshold Max allowed age of price data in seconds
     */
    constructor(
        address _dataFeeds,
        address _gameToken, // Added gameToken as a constructor parameter
        GameRules memory _gameRules,
        uint256 _oracleExpirationThreshold
    ) {
        if (_dataFeeds == address(0)) {
            revert InvalidAddress();
        }
        if (_gameToken == address(0)) {
            revert InvalidAddress();
        }
        if (_gameRules.gameStakingAmount == 0) {
            revert InvalidAmount();
        }
        if (_gameRules.rewardAmount == 0) {
            revert InvalidAmount();
        }
        if (_gameRules.gameDuration == 0) {
            revert InvalidDuration();
        }
        if (_gameRules.assets.length != _gameRules.assetAmounts.length) {
            revert InvalidArrayLength();
        }
        if (_oracleExpirationThreshold == 0) {
            revert InvalidDuration();
        }

        gameRules = _gameRules;
        gameToken = IERC20(_gameToken); // Initialize gameToken directly from the constructor parameter
        dataFeed = AggregatorV3Interface(_dataFeeds);
        oracleExpirationThreshold = _oracleExpirationThreshold;
    }

    /* ========== MODIFIERS ========== */

    /**
     * @dev Ensures the function is called by a registered player
     */
    modifier onlyPlayers() {
        if (msg.sender != player1 && msg.sender != player2)
            revert NotAuthorized();
        _;
    }

    /* ========== GAME MECHANICS ========== */

    /**
     * @notice Allows a player to join the game by staking tokens
     * @dev Transfers required tokens from player to contract
     */
    function enrollPlayer() external {
        // Check if game start time has passed
        if (block.timestamp >= gameRules.gameStartTime) revert GameInProgress();

        // Check player is not already enrolled
        if (msg.sender == player1 || msg.sender == player2)
            revert NotAuthorized();

        // Check if game is full
        if (player1 != address(0) && player2 != address(0)) revert GameIsFull();

        // Stake the game token
        gameToken.safeTransferFrom(
            msg.sender,
            address(this),
            gameRules.gameStakingAmount
        );

        // Transfer required assets
        uint256 assetCount = gameRules.assets.length;
        for (uint256 i = 0; i < assetCount; ++i) {
            IERC20 asset = IERC20(gameRules.assets[i]);
            uint256 requiredAmount = gameRules.assetAmounts[i];

            if (asset.balanceOf(msg.sender) < requiredAmount) {
                revert InsufficientBalance(
                    requiredAmount,
                    asset.balanceOf(msg.sender)
                );
            }

            asset.safeTransferFrom(msg.sender, address(this), requiredAmount);
        }

        // Register player
        if (player1 == address(0)) {
            player1 = msg.sender;
        } else {
            player2 = msg.sender;
        }

        // Initialize player balances
        userAsset1Balance[msg.sender] = 100; // Give some initial balance for gameplay
        userAsset2Balance[msg.sender] = 10000; // Give some initial balance for gameplay

        emit PlayerEnrolled(msg.sender);

        // If both players are enrolled, update game status
        if (player1 != address(0) && player2 != address(0)) {
            // Check if game should start immediately
            if (block.timestamp >= gameRules.gameStartTime) {
                emit GameStarted(block.timestamp, gameRules.gameDuration);
            }
        }
    }

    /**
     * @notice Allows a player to buy ETH at the current oracle price
     * @param amount Amount of ETH to buy
     * @return success True if the operation succeeded
     */
    function buyEth(uint256 amount) external onlyPlayers returns (bool) {
        // Check if game has ended
        if (
            block.timestamp > gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameEnded();
        }

        // Skip operation if amount is zero
        if (amount == 0) return true;

        // Fetch current ETH price
        uint256 price = fetchPrice();

        // Calculate cost
        uint256 cost = price * amount;

        // Check player has sufficient balance
        if (userAsset2Balance[msg.sender] < cost) {
            revert InsufficientBalance(cost, userAsset2Balance[msg.sender]);
        }

        // Update balances
        userAsset1Balance[msg.sender] += amount;
        userAsset2Balance[msg.sender] -= cost;

        emit AssetTraded(msg.sender, true, amount, price);
        return true;
    }

    /**
     * @notice Allows a player to sell ETH at the current oracle price
     * @param amount Amount of ETH to sell
     * @return success True if the operation succeeded
     */
    function sellEth(uint256 amount) external onlyPlayers returns (bool) {
        // Check if game has ended
        if (
            block.timestamp > gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameEnded();
        }

        // Skip operation if amount is zero
        if (amount == 0) return true;

        // Fetch current ETH price
        uint256 price = fetchPrice();

        // Calculate revenue
        uint256 revenue = price * amount;

        // Check player has sufficient ETH
        if (userAsset1Balance[msg.sender] < amount) {
            revert InsufficientBalance(amount, userAsset1Balance[msg.sender]);
        }

        // Update balances
        userAsset1Balance[msg.sender] -= amount;
        userAsset2Balance[msg.sender] += revenue;

        emit AssetTraded(msg.sender, false, amount, price);
        return true;
    }

    /**
     * @notice Allows a player to withdraw their stake and potential rewards
     * @dev Can only be called after the game has ended
     */
    function withdraw() public onlyPlayers {
        // Ensure game has ended
        if (
            block.timestamp < gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameNotEnded();
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
        address winner = _getWinner();

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

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Gets the winner of the game
     * @dev Can only be called after game has ended
     * @return winner The address of the winner, or address(0) if tie
     */
    function getWinner() external view returns (address) {
        // Check if the game has ended
        if (
            block.timestamp <= gameRules.gameStartTime + gameRules.gameDuration
        ) {
            revert GameNotEnded();
        }

        return _getWinner();
    }

    /**
     * @notice Gets the game end time
     * @return endTime The timestamp when the game ends
     */
    function getGameEndTime() external view returns (uint256) {
        return gameRules.gameStartTime + gameRules.gameDuration;
    }

    /**
     * @notice Checks if a player has claimed their reward
     * @param player The address to check
     * @return claimed True if the player has claimed their reward
     */
    function hasClaimedReward(address player) external view returns (bool) {
        if (player == player1) {
            return player1RewardClaimed;
        } else if (player == player2) {
            return player2RewardClaimed;
        }
        return false;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function fetchPrice() public view returns (uint256) {
        // Fetch the latest round data from the Chainlink data feed
        (, int256 answer, , uint256 updatedAt, ) = dataFeed.latestRoundData();

        // Validate the oracle data
        if (updatedAt + oracleExpirationThreshold < block.timestamp) {
            revert PriceOracleExpired();
        }

        if (answer <= 0) {
            revert PriceOracleInvalid();
        }

        return uint256(answer);
    }

    /**
     * @dev Determines the winner based on final portfolio values
     * @return winner The address of the winner or address(0) if tie
     */
    function _getWinner() internal view returns (address) {
        uint256 player1Value = userAsset1Balance[player1] +
            userAsset2Balance[player1];
        uint256 player2Value = userAsset1Balance[player2] +
            userAsset2Balance[player2];

        if (player1Value > player2Value) {
            return player1;
        } else if (player2Value > player1Value) {
            return player2;
        } else {
            return address(0); // Tie
        }
    }
}
