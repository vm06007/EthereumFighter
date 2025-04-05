// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ForgeTokenModule = buildModule("ForgeTokenModule", (m) => {
  // Parameters for deployment
 const initialSupply = m.getParameter("initialSupply", 1000000); // Example initial supply
  // Deploy the ForgeToken contract
  const forgeToken = m.contract("ForgeToken", [initialSupply]);

  return { forgeToken };
});

export default ForgeTokenModule;
