// scripts/deploy-escrow-plasma.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying Escrow to Plasma testnet...");
  
  // Use the MockUSDT address we just deployed
  const usdtAddress = "0x0e148B63ce56f1688C8895Cbd7E47f241874aF5a";
  
  // Deploy your original Escrow contract
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(usdtAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  
  console.log("Escrow deployed to:", escrowAddress);
  
  console.log("\n=== 🎉 PLASMA DEPLOYMENT COMPLETE! ===");
  console.log("Network: Plasma Testnet");
  console.log("USDT Address:", usdtAddress);
  console.log("Escrow Address:", escrowAddress);
  console.log("Chain ID: 9746");
  
  console.log("\n=== Update Your Frontend ===");
  console.log("1. Switch main.jsx back to Plasma testnet");
  console.log("2. Update contract addresses:");
  console.log("   - escrowAddress =", `"${escrowAddress}"`);
  console.log("   - usdtAddress =", `"${usdtAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });