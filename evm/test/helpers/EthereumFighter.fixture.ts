import { ethers } from "hardhat";

export async function deployEthereumFighterFixture(
  priceFeedAddress: string,
  gameRules: string,
  oracleExpirationThreshold: number
) {
  const EthereumFighter = await ethers.getContractFactory("EthereumFighter");
  
  const fighter = await EthereumFighter.deploy(
    priceFeedAddress,
    gameRules,
    oracleExpirationThreshold
  );

  return fighter;
}