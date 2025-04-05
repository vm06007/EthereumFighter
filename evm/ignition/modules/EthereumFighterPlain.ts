// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EthereumFighterModule = buildModule("EtherumFighterPlainModeModule", (m) => {
  // Parameters for deployment
  const dataFeeds = m.getParameter("dataFeeds", "0xc929ad75B72593967DE83E7F7Cda0493458261D9"); // Replace with actual address
  const oracleExpirationThreshold = m.getParameter("oracleExpirationThreshold", 3600); // 1 hour

// Update your gameRules object to include matching arrays
const gameRules = {
  gameStakingAmount: m.getParameter("gameStakingAmount", 1000),
  gameDuration: m.getParameter("gameDuration", 86400), // 1 day
  gameStartTime: m.getParameter("gameStartTime", Math.floor(Date.now() / 1000) + 3600),
  rewardAmount: m.getParameter("rewardAmount", 500),
  // Either provide actual addresses or use matching empty arrays
  assets: m.getParameter("assets", ["0x1234567890123456789012345678901234567890"]), // Example address
  assetAmounts: m.getParameter("assetAmounts", [100]), // Matching amount
};

  // Deploy the EthereumFighter contract
  const ethereumFighter = m.contract("EtherumFighterPlainMode", [dataFeeds, gameRules, oracleExpirationThreshold]);

  return { ethereumFighter };
});

export default EthereumFighterModule;
