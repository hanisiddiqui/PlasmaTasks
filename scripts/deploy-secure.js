// scripts/deploy-standalone.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Standalone Secure PlasmaTasks to Plasma testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "XPL");
  
  try {
    // Deploy MockUSDT first (for testing)
    console.log("\n📄 Deploying MockUSDT...");
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    const usdtAddress = await mockUSDT.getAddress();
    console.log("✅ MockUSDT deployed to:", usdtAddress);
    
    // Deploy StandaloneSecureEscrow
    console.log("\n🛡️ Deploying StandaloneSecureEscrow...");
    const SecureEscrow = await hre.ethers.getContractFactory("StandaloneSecureEscrow");
    const escrow = await SecureEscrow.deploy(usdtAddress);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("✅ StandaloneSecureEscrow deployed to:", escrowAddress);
    
    // Mint test tokens for deployer
    console.log("\n💰 Minting test USDT tokens...");
    const mintAmount = hre.ethers.parseEther("10000"); // 10k USDT for testing
    await mockUSDT.mint(deployer.address, mintAmount);
    console.log("✅ Minted 10,000 test USDT to deployer");
    
    // Verify contract parameters
    console.log("\n🔍 Verifying deployment...");
    const usdtFromContract = await escrow.usdt();
    const platformFee = await escrow.PLATFORM_FEE();
    const maxDuration = await escrow.MAX_TASK_DURATION();
    const owner = await escrow.owner();
    
    console.log("USDT address in contract:", usdtFromContract);
    console.log("Platform fee:", platformFee.toString(), "(2.5%)");
    console.log("Max task duration:", maxDuration.toString(), "seconds");
    console.log("Contract owner:", owner);
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    // Approve USDT spending
    const testAmount = hre.ethers.parseEther("100");
    await mockUSDT.approve(escrowAddress, testAmount);
    console.log("✅ Approved USDT spending");
    
    // Post a test task
    const taskDuration = 86400; // 1 day
    const tx = await escrow.postTask("Test task - please ignore", testAmount, taskDuration);
    await tx.wait();
    console.log("✅ Posted test task successfully");
    
    // Get task details
    const task = await escrow.getTask(0);
    console.log("Test task details:", {
      details: task.details,
      reward: hre.ethers.formatEther(task.reward),
      poster: task.poster,
      status: task.status.toString()
    });
    
    console.log("\n🎉 STANDALONE SECURE DEPLOYMENT COMPLETE!");
    console.log("═══════════════════════════════════════");
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("═══════════════════════════════════════");
    console.log("🌐 Network: Plasma Testnet");
    console.log("⛓️  Chain ID: 9746");
    console.log("📄 MockUSDT:", usdtAddress);
    console.log("🛡️ StandaloneSecureEscrow:", escrowAddress);
    console.log("👤 Owner:", deployer.address);
    console.log("💰 Platform Fee: 2.5%");
    console.log("⏰ Max Task Duration: 30 days");
    console.log("═══════════════════════════════════════");
    
    console.log("\n🔧 FRONTEND UPDATE INSTRUCTIONS:");
    console.log("1. Update PostTaskForm.jsx:");
    console.log(`   const escrowAddress = "${escrowAddress}";`);
    console.log(`   const usdtAddress = "${usdtAddress}";`);
    console.log("\n2. New ABI functions available:");
    console.log("   - acceptTask(taskId)");
    console.log("   - submitWork(taskId, submission)");
    console.log("   - approveWork(taskId)");
    console.log("   - withdraw()");
    console.log("   - getAllActiveTasks()");
    
    console.log("\n🧪 COMPLETE WORKFLOW TEST:");
    console.log("1. ✅ Post task");
    console.log("2. □ Accept task (different user)");
    console.log("3. □ Submit work");
    console.log("4. □ Approve work");
    console.log("5. □ Withdraw payment");
    
    console.log("\n🔒 SECURITY FEATURES ENABLED:");
    console.log("✅ Reentrancy protection (custom implementation)");
    console.log("✅ Access control modifiers");
    console.log("✅ Pull payment pattern");
    console.log("✅ State machine validation");
    console.log("✅ Emergency pause mechanism");
    console.log("✅ Input validation");
    console.log("✅ Time-based controls");
    console.log("✅ Custom errors for gas efficiency");
    console.log("✅ Platform fee system (2.5%)");
    
    console.log("\n⚠️  NEXT STEPS:");
    console.log("1. Update frontend with new contract addresses");
    console.log("2. Add acceptTask, submitWork, approveWork functions");
    console.log("3. Implement withdraw functionality");
    console.log("4. Test complete freelancer workflow");
    console.log("5. Add task listing/browsing features");
    
    console.log("\n📱 SUGGESTED FRONTEND COMPONENTS:");
    console.log("- TaskList.jsx (browse available tasks)");
    console.log("- TaskDetail.jsx (accept/submit work)");
    console.log("- Dashboard.jsx (my tasks/earnings)");
    console.log("- WithdrawModal.jsx (pull payments)");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });