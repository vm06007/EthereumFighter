// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EthereumFighterModule = buildModule("EtherumFighterPlainModeModule", (m) => {
  // Parameters for deployment
  const dataFeeds = m.getParameter("_dataFeeds", "0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e"); // Celo/USD price feed
  const gameToken = m.getParameter("_gameToken", "0xe652aD467100c6C62856DC663b59C6ad4e3F60A8"); // our token in celo chain
  const oracleExpirationThreshold = m.getParameter("oracleExpirationThreshold", 3*60); // 1 hour

// Update your gameRules object to include matching arrays
const gameRules = {
  gameStakingAmount: m.getParameter("gameStakingAmount", 1000),
  gameDuration: m.getParameter("gameDuration", 86400), // 1 day
  gameStartTime: m.getParameter("gameStartTime", Math.floor(Date.now() / 1000) + 3600),
  rewardAmount: m.getParameter("rewardAmount", 500),
  // Either provide actual addresses or use matching empty arrays
  assets: m.getParameter("assets", []), // Example address
  assetAmounts: m.getParameter("assetAmounts", []), // Matching amount
};

  // Deploy the EthereumFighter contract
  const ethereumFighter = m.contract("EtherumFighterPlainMode", [dataFeeds,gameToken, gameRules, oracleExpirationThreshold]);

  return { ethereumFighter };
});

export default EthereumFighterModule;
