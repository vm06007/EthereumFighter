import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "./tasks/etherscanVerify";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
};

export default config;
