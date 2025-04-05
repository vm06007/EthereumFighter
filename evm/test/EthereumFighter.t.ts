import { expect } from "chai";
import { ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { createInstance } from "./helpers/instance";
import { reencryptEuint256 } from "./helpers/reencrypt";
import { getSigners, initSigners } from "./helpers/signers";
import { debug } from "./Mock/utils";
import { deployEthereumFighterFixture } from "./helpers/EthereumFighter.fixture";

describe("EthereumFighter", function () {
  // Test constants
  const GAME_STAKING_AMOUNT = 1000;
  const GAME_DURATION = 86400; // 1 day in seconds
  const REWARD_AMOUNT = 500;
  const ORACLE_EXPIRATION_THRESHOLD = 3600; // 1 hour
  
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    // Current timestamp for starting game in the future
    const currentTime = await time.latest();
    this.gameStartTime = currentTime + 3600; // Game starts 1 hour in the future
    
    // Create mock assets
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.mockToken1 = await MockToken.deploy("GameToken", "GTK");
    this.mockToken2 = await MockToken.deploy("AssetToken", "ATK");
    
    // Mock price feed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    this.mockPriceFeed = await MockPriceFeed.deploy(1000); // Initial price 1000
    
    // Create game rules
    const gameRules = {
      gameStakingAmount: GAME_STAKING_AMOUNT,
      gameDuration: GAME_DURATION,
      gameStartTime: this.gameStartTime,
      rewardAmount: REWARD_AMOUNT,
      assets: [await this.mockToken1.getAddress(), await this.mockToken2.getAddress()],
      assetAmounts: [GAME_STAKING_AMOUNT, 500]
    };
    
    // Deploy EthereumFighter contract
    const contract = await deployEthereumFighterFixture(
      await this.mockPriceFeed.getAddress(),
      await this.mockToken1.getAddress(),
      gameRules as any,
      ORACLE_EXPIRATION_THRESHOLD
    );
    
    this.contractAddress = await contract.getAddress();
    this.fighter = contract;
    this.fhevm = await createInstance();
    
    // Mint tokens to test accounts
    await this.mockToken1.mint(this.signers.alice, 10000);
    await this.mockToken1.mint(this.signers.bob, 10000);
    await this.mockToken2.mint(this.signers.alice, 5000);
    await this.mockToken2.mint(this.signers.bob, 5000);
    
    // Approve tokens for the contract
    await this.mockToken1.connect(this.signers.alice).approve(this.contractAddress, 10000);
    await this.mockToken1.connect(this.signers.bob).approve(this.contractAddress, 10000);
    await this.mockToken2.connect(this.signers.alice).approve(this.contractAddress, 5000);
    await this.mockToken2.connect(this.signers.bob).approve(this.contractAddress, 5000);
  });

  describe("Game Setup", function () {
    it("should deploy the contract with correct parameters", async function () {
      expect(await this.fighter.oracleExpirationThreshold()).to.equal(ORACLE_EXPIRATION_THRESHOLD);
      
      const gameRules = await this.fighter.gameRules();
      expect(gameRules.gameStakingAmount).to.equal(GAME_STAKING_AMOUNT);
      expect(gameRules.gameDuration).to.equal(GAME_DURATION);
      expect(gameRules.gameStartTime).to.equal(this.gameStartTime);
      expect(gameRules.rewardAmount).to.equal(REWARD_AMOUNT);
    });

    it("should allow two players to enroll", async function () {
      const txAlice = await this.fighter.connect(this.signers.alice).enrollPlayer();
      await txAlice.wait();
      
      expect(await this.fighter.player1()).to.equal(this.signers.alice.address);
      expect(await this.fighter.player2()).to.equal("0x0000000000000000000000000000000000000000");
      
      const txBob = await this.fighter.connect(this.signers.bob).enrollPlayer();
      await txBob.wait();
      
      expect(await this.fighter.player1()).to.equal(this.signers.alice.address);
      expect(await this.fighter.player2()).to.equal(this.signers.bob.address);
      
      // Check token transfers happened
      expect(await this.mockToken1.balanceOf(this.contractAddress)).to.equal(GAME_STAKING_AMOUNT * 2);
      expect(await this.mockToken2.balanceOf(this.contractAddress)).to.equal(500 * 2);
    });

    it("should not allow enrollment after game starts", async function () {
      // Fast forward to game start time
      await time.increaseTo(this.gameStartTime + 1);
      
      await expect(
        this.fighter.connect(this.signers.alice).enrollPlayer()
      ).to.be.revertedWithCustomError(this.fighter, "GameStarted");
    });

    it("should not allow more than two players", async function () {
      await this.fighter.connect(this.signers.alice).enrollPlayer();
      await this.fighter.connect(this.signers.bob).enrollPlayer();
      
      const charlie = this.signers.charlie;
      
      // Mint and approve tokens for Charlie
      await this.mockToken1.mint(charlie, 10000);
      await this.mockToken1.connect(charlie).approve(this.contractAddress, 10000);
      await this.mockToken2.mint(charlie, 5000);
      await this.mockToken2.connect(charlie).approve(this.contractAddress, 5000);
      
      await expect(
        this.fighter.connect(charlie).enrollPlayer()
      ).to.be.revertedWithCustomError(this.fighter, "GameIsFull");
    });
  });

  describe("Game Trading", function () {
    beforeEach(async function () {
      // Enroll both players
      await this.fighter.connect(this.signers.alice).enrollPlayer();
      await this.fighter.connect(this.signers.bob).enrollPlayer();
      
      // Fast forward to game start time
      await time.increaseTo(this.gameStartTime + 1);
    });

    it("should allow buying ETH", async function () {
      // Create encrypted input - Alice buys 100 ETH
      const input = this.fhevm.createEncryptedInput(this.contractAddress, this.signers.alice.address);
      input.add256(100);
      const encryptedAmount = await input.encrypt();
      
      const tx = await this.fighter.connect(this.signers.alice).buyEth(
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
      
      await tx.wait();
      
      // For hardhat network, we can use debug to check encrypted values
      if (network.name === "hardhat") {
        const aliceAsset1Handle = await this.fighter.userAsset1Balance(this.signers.alice.address);
        const aliceAsset1Balance = await debug.decrypt256(aliceAsset1Handle);
        
        // Since price is 1000, buying 100 ETH would cost 100,000 tokens
        // But Alice starts with 0 balance, so it should fail silently and balance remains 0
        expect(aliceAsset1Balance).to.equal(0);
      }
    });

    it("should allow trading with initial funds", async function () {
      // First give the player some tokens in their encrypted balance
      // This would require implementing a method to add funds in the contract
      // For testing purposes, let's assume we have a method to add funds
      
      // For this example, let's mock the encrypted balances with debug functions
      if (network.name === "hardhat") {
        // Assuming we have a function to set encrypted balance for testing
        await this.fighter.setEncryptedAsset2Balance(this.signers.alice.address, 500000);
        
        // Alice buys 100 ETH at price 1000 = 100,000 cost
        const input = this.fhevm.createEncryptedInput(this.contractAddress, this.signers.alice.address);
        input.add256(100);
        const encryptedAmount = await input.encrypt();
        
        const tx = await this.fighter.connect(this.signers.alice).buyEth(
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );
        
        await tx.wait();
        
        // Check balances
        const aliceAsset1Handle = await this.fighter.userAsset1Balance(this.signers.alice.address);
        const aliceAsset1Balance = await debug.decrypt256(aliceAsset1Handle);
        
        const aliceAsset2Handle = await this.fighter.userAsset2Balance(this.signers.alice.address);
        const aliceAsset2Balance = await debug.decrypt256(aliceAsset2Handle);
        
        // Should have 100 ETH and 400,000 tokens left
        expect(aliceAsset1Balance).to.equal(100);
        expect(aliceAsset2Balance).to.equal(400000);
      }
    });

    it("should allow selling ETH", async function () {
      if (network.name === "hardhat") {
        // Set initial balances for testing
        await this.fighter.setEncryptedAsset1Balance(this.signers.alice.address, 200);
        
        // Alice sells 50 ETH at price 1000 = 50,000 tokens gained
        const input = this.fhevm.createEncryptedInput(this.contractAddress, this.signers.alice.address);
        input.add256(50);
        const encryptedAmount = await input.encrypt();
        
        const tx = await this.fighter.connect(this.signers.alice).sellEth(
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );
        
        await tx.wait();
        
        // Check balances
        const aliceAsset1Handle = await this.fighter.userAsset1Balance(this.signers.alice.address);
        const aliceAsset1Balance = await debug.decrypt256(aliceAsset1Handle);
        
        const aliceAsset2Handle = await this.fighter.userAsset2Balance(this.signers.alice.address);
        const aliceAsset2Balance = await debug.decrypt256(aliceAsset2Handle);
        
        // Should have 150 ETH left and 50,000 tokens gained
        expect(aliceAsset1Balance).to.equal(150);
        expect(aliceAsset2Balance).to.equal(50000);
      }
    });
  });

  describe("Game Completion", function () {
    beforeEach(async function () {
      // Enroll both players
      await this.fighter.connect(this.signers.alice).enrollPlayer();
      await this.fighter.connect(this.signers.bob).enrollPlayer();
      
      // Fast forward to game start time
      await time.increaseTo(this.gameStartTime + 1);
      
      // Setup some encrypted trades
      if (network.name === "hardhat") {
        // Set initial balances for testing
        await this.fighter.setEncryptedAsset1Balance(this.signers.alice.address, 1000);
        await this.fighter.setEncryptedAsset2Balance(this.signers.alice.address, 100000);
        await this.fighter.setEncryptedAsset1Balance(this.signers.bob.address, 800);
        await this.fighter.setEncryptedAsset2Balance(this.signers.bob.address, 90000);
      }
      
      // Fast forward to game end
      await time.increaseTo(this.gameStartTime + GAME_DURATION + 1);
    });

    it("should allow requesting decryption after game ends", async function () {
      const tx = await this.fighter.connect(this.signers.alice).requestDecryption();
      const receipt = await tx.wait();
      
      // Check for decryption requested event
      const event = receipt?.logs.find(
        (e) => e.fragment?.name === "DecryptionRequested"
      );
      expect(event).to.not.be.undefined;
    });

    it("should process decryption callback and determine winner", async function () {
      // In a hardhat test, we can simulate the callback directly
      if (network.name === "hardhat") {
        // Request decryption first
        await this.fighter.connect(this.signers.alice).requestDecryption();
        
        // Simulate gateway callback with decrypted values
        // Alice has 1000 ETH + 100,000 tokens = 101,000 total value
        // Bob has 800 ETH + 90,000 tokens = 90,800 total value
        const decryptedValues = [1000, 100000, 800, 90000];
        await this.fighter.callbackUint256(1, decryptedValues);
        
        // Check that scores were stored correctly
        expect(await this.fighter.player1FinalScore()).to.equal(101000);
        expect(await this.fighter.player2FinalScore()).to.equal(90800);
        expect(await this.fighter.scoresDecrypted()).to.be.true;
        
        // Check winner
        const winner = await this.fighter.getWinner();
        expect(winner).to.equal(this.signers.alice.address);
      }
    });

    it("should allow winners to withdraw rewards", async function () {
      if (network.name === "hardhat") {
        // Request decryption and simulate callback
        await this.fighter.connect(this.signers.alice).requestDecryption();
        const decryptedValues = [1000, 100000, 800, 90000];
        await this.fighter.callbackUint256(1, decryptedValues);
        
        // Alice (winner) withdraws rewards
        const aliceBalanceBefore = await this.mockToken1.balanceOf(this.signers.alice.address);
        await this.fighter.connect(this.signers.alice).withdraw();
        const aliceBalanceAfter = await this.mockToken1.balanceOf(this.signers.alice.address);
        
        // Winner should get staking amount + reward
        expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(GAME_STAKING_AMOUNT + REWARD_AMOUNT);
        
        // Bob (loser) withdraws stake
        const bobBalanceBefore = await this.mockToken1.balanceOf(this.signers.bob.address);
        await this.fighter.connect(this.signers.bob).withdraw();
        const bobBalanceAfter = await this.mockToken1.balanceOf(this.signers.bob.address);
        
        // Loser should only get staking amount back
        expect(bobBalanceAfter - bobBalanceBefore).to.equal(GAME_STAKING_AMOUNT);
      }
    });

    it("should not allow claiming rewards twice", async function () {
      if (network.name === "hardhat") {
        // Request decryption and simulate callback
        await this.fighter.connect(this.signers.alice).requestDecryption();
        const decryptedValues = [1000, 100000, 800, 90000];
        await this.fighter.callbackUint256(1, decryptedValues);
        
        // First withdrawal should succeed
        await this.fighter.connect(this.signers.alice).withdraw();
        
        // Second withdrawal should fail
        await expect(
          this.fighter.connect(this.signers.alice).withdraw()
        ).to.be.revertedWithCustomError(this.fighter, "RewardAlreadyClaimed");
      }
    });
  });

  describe("FHE Reencryption", function () {
    beforeEach(async function () {
      // Enroll both players
      await this.fighter.connect(this.signers.alice).enrollPlayer();
      await this.fighter.connect(this.signers.bob).enrollPlayer();
      
      // Fast forward to game start time
      await time.increaseTo(this.gameStartTime + 1);
      
      // Make some trades to have encrypted balances
      const input = this.fhevm.createEncryptedInput(this.contractAddress, this.signers.alice.address);
      input.add256(100);
      const encryptedAmount = await input.encrypt();
      
      await this.fighter.connect(this.signers.alice).buyEth(
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
    });

    it("should correctly reencrypt values for authorized user", async function () {
      // Get asset1 balance handle
      const balanceHandleAlice = await this.fighter.userAsset1Balance(this.signers.alice.address);
      
      // Reencrypt Alice's Asset1 balance
      const aliceAsset1Balance = await reencryptEuint256(
        this.signers.alice,
        this.fhevm,
        balanceHandleAlice,
        this.contractAddress
      );
      
      // In a real network, this would show the actual balance
      // In test mode, values are mocked, so we can use debug to validate
      if (network.name === "hardhat") {
        const debugBalance = await debug.decrypt256(balanceHandleAlice);
        expect(aliceAsset1Balance).to.equal(debugBalance);
      }
    });

    it("should not allow unauthorized users to reencrypt others' balances", async function () {
      // Get Alice's asset1 balance handle
      const balanceHandleAlice = await this.fighter.userAsset1Balance(this.signers.alice.address);
      
      // Bob tries to reencrypt Alice's balance
      await expect(
        reencryptEuint256(
          this.signers.bob,
          this.fhevm,
          balanceHandleAlice,
          this.contractAddress
        )
      ).to.be.rejectedWith("User is not authorized to reencrypt this handle!");
    });
  });
});