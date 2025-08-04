// scripts/test-deployment.js
const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing deployed contracts...");
  
  const usdtAddress = "0xe86E7fFb5A8f7C4506487FFcF924E164263BE157";
  const escrowAddress = "0xf6a5C743d21277291938e28a618f7E43DEA6262C";
  
  // Get contracts
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = MockUSDT.attach(usdtAddress);
  
  const SecureEscrow = await hre.ethers.getContractFactory("StandaloneSecureEscrow");
  const escrow = SecureEscrow.attach(escrowAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  
  try {
    // Check contract info
    console.log("\n📋 Contract Information:");
    const owner = await escrow.owner();
    const usdt = await escrow.usdt();
    const platformFee = await escrow.PLATFORM_FEE();
    
    console.log("Escrow Owner:", owner);
    console.log("USDT Address:", usdt);
    console.log("Platform Fee:", platformFee.toString(), "(2.5%)");
    
    // Check USDT balance
    const balance = await mockUSDT.balanceOf(deployer.address);
    console.log("Your USDT balance:", hre.ethers.formatEther(balance));
    
    // Check if we can get tasks
    const activeTasks = await escrow.getAllActiveTasks();
    console.log("Active tasks:", activeTasks.length);
    
    if (activeTasks.length > 0) {
      console.log("First task:", {
        id: activeTasks[0].id.toString(),
        details: activeTasks[0].details,
        reward: hre.ethers.formatEther(activeTasks[0].reward),
        poster: activeTasks[0].poster,
        status: activeTasks[0].status.toString()
      });
    }
    
    console.log("\n✅ Contract tests completed successfully!");
    console.log("\n🔧 UPDATE YOUR FRONTEND:");
    console.log(`const escrowAddress = "${escrowAddress}";`);
    console.log(`const usdtAddress = "${usdtAddress}";`);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });