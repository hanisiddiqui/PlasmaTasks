const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PlasmaTaskEscrow", function () {
  let escrow;
  let usdt;
  let owner;
  let client;
  let freelancer;

  beforeEach(async () => {
    [owner, client, freelancer] = await ethers.getSigners();

    // Mock USDT token
    const USDT = await ethers.getContractFactory("MockUSDT");
    usdt = await USDT.deploy();
    await usdt.deployed();

    // Deploy PlasmaTaskEscrow
    const Escrow = await ethers.getContractFactory("PlasmaTaskEscrow");
    escrow = await Escrow.deploy(usdt.address);
    await escrow.deployed();

    // Fund client with USDT
    await usdt.transfer(client.address, 1000);
  });

  it("Should allow a client to post a task", async () => {
    await escrow.connect(client).postTask("Write a blog post", 100);
    const task = await escrow.tasks(1);
    expect(task.description).to.equal("Write a blog post");
    expect(task.reward).to.equal(100);
  });

  it("Should let freelancer apply and client select them", async () => {
    await escrow.connect(client).postTask("Create logo", 200);
    await escrow.connect(freelancer).applyForTask(1, "I'm a great designer");

    const applicants = await escrow.getApplicants(1);
    expect(applicants[0]).to.equal(freelancer.address);

    await escrow.connect(client).selectFreelancer(1, freelancer.address, Date.now() + 86400);
    const task = await escrow.tasks(1);
    expect(task.freelancer).to.equal(freelancer.address);
  });
});
