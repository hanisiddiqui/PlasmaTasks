// scripts/deploy-usdt.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying MockUSDT to Sepolia testnet...");

  // Deploy MockUSDT
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const usdtAddress = await mockUSDT.getAddress();
  
  console.log("MockUSDT deployed to:", usdtAddress);
  
  // Get some test tokens
  console.log("Minting test tokens...");
  const [deployer] = await hre.ethers.getSigners();
  await mockUSDT.gimmeTokens();
  
  const balance = await mockUSDT.balanceOf(deployer.address);
  console.log("Your USDT balance:", hre.ethers.formatEther(balance), "USDT");
  
  console.log("\n=== COPY THESE ADDRESSES ===");
  console.log("USDT Address:", usdtAddress);
  console.log("Escrow Address: 0xD5fad67d64f85d40672256eb30B29192e3B57c18");
  console.log("\nAdd USDT token to MetaMask:");
  console.log("Contract Address:", usdtAddress);
  console.log("Symbol: USDT");
  console.log("Decimals: 18");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });