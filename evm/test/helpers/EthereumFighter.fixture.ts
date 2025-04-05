import { ethers } from "hardhat";

export async function deployEthereumFighterFixture(
  priceFeedAddress: string,
  mockTokenAddress: string,
  gameRules: string,
  oracleExpirationThreshold: number
) {
  const EthereumFighter = await ethers.getContractFactory("EthereumFighter");
  
  const fighter = await EthereumFighter.deploy(
    priceFeedAddress,
    mockTokenAddress,
    gameRules,
    oracleExpirationThreshold
  );

  return fighter;
}