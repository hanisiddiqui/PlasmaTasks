const hre = require("hardhat");

async function main() {
  const usdtAddress = process.env.USDT_ADDRESS;

  if (!usdtAddress) {
    console.error("❌ Missing USDT_ADDRESS in .env");
    process.exit(1);
  }

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(usdtAddress);

  await escrow.waitForDeployment();

  console.log("✅ Escrow deployed to:", await escrow.getAddress());
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
