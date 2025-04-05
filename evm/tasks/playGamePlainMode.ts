import { task } from "hardhat/config";
import { ethers } from "hardhat";

task("playGamePlainMode", "Mint tokens, enroll players, and perform buy/sell actions")
  .addParam("contract", "The address of the EtherumFighterPlainMode contract")
  .addParam("token", "The address of the game token (MockERC20)")
  .addParam("priceFeed", "The address of the mock price feed")
  .setAction(async (taskArgs, hre) => {
    const { contract, token, priceFeed } = taskArgs;

    const [deployer, player1, player2] = await ethers.getSigners();

    // Attach to the deployed contracts
    const gameToken = await ethers.getContractAt("ForgeToken", token);
    const ethFighter = await ethers.getContractAt("EtherumFighterPlainMode", contract);

    // Mint tokens to player1 and player2
    const mintAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    console.log("Minting tokens...");
    await gameToken.mint(player1.address, mintAmount);
    await gameToken.mint(player2.address, mintAmount);
    console.log(`Minted ${mintAmount} tokens to player1 and player2`);

    // Approve the EtherumFighterPlainMode contract to spend tokens
    console.log("Approving tokens...");
    await gameToken.connect(player1).approve(contract, mintAmount);
    await gameToken.connect(player2).approve(contract, mintAmount);
    console.log("Tokens approved");

    // Player1 enrolls
    console.log("Player1 enrolling...");
    await ethFighter.connect(player1).enrollPlayer();
    console.log("Player1 enrolled");

    // Player2 enrolls
    console.log("Player2 enrolling...");
    await ethFighter.connect(player2).enrollPlayer();
    console.log("Player2 enrolled");

    // Player1 buys ETH
    const buyAmount = 10; // Example amount of ETH to buy
    console.log("Player1 buying ETH...");
    await ethFighter.connect(player1).buyEth(buyAmount);
    console.log(`Player1 bought ${buyAmount} ETH`);

    // Player2 sells ETH
    const sellAmount = 5; // Example amount of ETH to sell
    console.log("Player2 selling ETH...");
    await ethFighter.connect(player2).sellEth(sellAmount);
    console.log(`Player2 sold ${sellAmount} ETH`);

    console.log("Game actions completed!");
  });

export default {};