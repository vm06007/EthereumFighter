// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EthereumFighterModule = buildModule("EthereumFighterModule", (m) => {
  // Parameters for deployment
  const dataFeeds = m.getParameter("_dataFeeds", "0xc929ad75B72593967DE83E7F7Cda0493458261D9"); // Replace with actual address
  const gameToken = m.getParameter("_gameToken", "0xc929ad75B72593967DE83E7F7Cda0493458261D9"); // Replace with actual address
  const oracleExpirationThreshold = m.getParameter("oracleExpirationThreshold", 3600); // 1 hour

  const gameRules = {
    gameStakingAmount: m.getParameter("gameStakingAmount", 1000), // Example staking amount
    gameDuration: m.getParameter("gameDuration", 86400), // 1 day
    gameStartTime: m.getParameter("gameStartTime", Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
    rewardAmount: m.getParameter("rewardAmount", 500), // Example reward amount
    assets: m.getParameter("assets", []), // Replace with actual asset addresses
    assetAmounts: m.getParameter("assetAmounts", []), // Example asset amounts
  };

  // Deploy the EthereumFighter contract
  const ethereumFighter = m.contract("EthereumFighter", [dataFeeds,gameToken, gameRules, oracleExpirationThreshold]);

  return { ethereumFighter };
});

export default EthereumFighterModule;
