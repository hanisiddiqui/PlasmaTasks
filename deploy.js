const hre = require("hardhat");

async function main() {
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x0000000000000000000000000000000000000000"; // placeholder

  const PlasmaTaskEscrow = await hre.ethers.getContractFactory("PlasmaTaskEscrow");
  const escrow = await PlasmaTaskEscrow.deploy(USDT_ADDRESS);
  await escrow.deployed();
  console.log("PlasmaTaskEscrow deployed to:", escrow.address);

  const InstantGigs = await hre.ethers.getContractFactory("InstantGigs");
  const gigs = await InstantGigs.deploy(USDT_ADDRESS);
  await gigs.deployed();
  console.log("InstantGigs deployed to:", gigs.address);

  const DisputeLogic = await hre.ethers.getContractFactory("DisputeLogic");
  const disputes = await DisputeLogic.deploy();
  await disputes.deployed();
  console.log("DisputeLogic deployed to:", disputes.address);

  const ReviewAndProofs = await hre.ethers.getContractFactory("ReviewAndProofs");
  const reviews = await ReviewAndProofs.deploy();
  await reviews.deployed();
  console.log("ReviewAndProofs deployed to:", reviews.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
