import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("verify-deployed", "Verifies an already deployed contract on Etherscan")
  .addParam("address", "The contract's address")
  .addOptionalParam("contract", "Full contract path (e.g., 'contracts/MyToken.sol:MyToken')")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    if (hre.network.name === "hardhat") {
      throw new Error("Etherscan verification is not possible in Hardhat's local network. Use a real network instead.");
    }

    const { address } = taskArgs;
    const contract = taskArgs.contract ?? "contracts/EthereumFighter.sol:EthereumFighter";

    console.info("\n🔍 Starting contract verification...");
    console.info("📄 Contract:", contract);
    console.info("📍 Address:", address);

    try {
      // Define the actual constructor arguments used in deployment
      const dataFeeds = "0xc929ad75B72593967DE83E7F7Cda0493458261D9"; // Example address
      const oracleExpirationThreshold = 3600;

      const gameRules = {
        gameStakingAmount: 1000,
        gameDuration: 86400,
        gameStartTime: Math.floor(Date.now() / 1000) + 3600,
        rewardAmount: 500,
        assets: [],
        assetAmounts: [],
      };

      // These args must match your contract's constructor exactly
      const constructorArguments = [
        dataFeeds,
        gameRules,
        oracleExpirationThreshold,
      ];

      console.info("🧱 Constructor Arguments:", constructorArguments);

      await hre.run("verify:verify", {
        address,
        contract,
        constructorArguments,
      });

      console.info("\n✅ Contract verification completed successfully!");
    } catch (error) {
      const errMsg = (error as Error).message;
      if (errMsg.includes("Already Verified")) {
        console.info("\nℹ️ Contract is already verified!");
      } else {
        console.error("\n❌ Verification failed:", errMsg);
        console.info("\n💡 Example usage:");
        console.info("npx hardhat verify-deployed \\");
        console.info(`  --address ${address} \\`);
        console.info(`  --contract ${contract} \\`);
        console.info("  --network <network>");
      }
    }
  });
