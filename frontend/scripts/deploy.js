// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to Sepolia testnet...");

  // Deploy MockUSDT first
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const usdtAddress = await mockUSDT.getAddress();
  
  console.log("MockUSDT deployed to:", usdtAddress);

  // Deploy MockEscrow with USDT address
  const MockEscrow = await hre.ethers.getContractFactory("MockEscrow");
  const mockEscrow = await MockEscrow.deploy(usdtAddress);
  await mockEscrow.waitForDeployment();
  const escrowAddress = await mockEscrow.getAddress();
  
  console.log("MockEscrow deployed to:", escrowAddress);
  
  // Get some test tokens
  console.log("Minting test tokens...");
  const [deployer] = await hre.ethers.getSigners();
  await mockUSDT.gimmeTokens();
  
  const balance = await mockUSDT.balanceOf(deployer.address);
  console.log("Your USDT balance:", hre.ethers.formatEther(balance), "USDT");
  
  console.log("\n=== COPY THESE ADDRESSES ===");
  console.log("USDT Address:", usdtAddress);
  console.log("Escrow Address:", escrowAddress);
  console.log("Your Wallet:", deployer.address);
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