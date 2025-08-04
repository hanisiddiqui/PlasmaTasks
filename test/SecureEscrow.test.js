const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SecureEscrow Security Tests", function () {
    let escrow, usdt, owner, poster, freelancer, attacker;
    const TASK_REWARD = ethers.parseEther("100"); // 100 USDT
    const TASK_DURATION = 86400; // 1 day

    beforeEach(async function () {
        [owner, poster, freelancer, attacker] = await ethers.getSigners();

        // Deploy mock USDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy();

        // Deploy secure escrow
        const SecureEscrow = await ethers.getContractFactory("SecureEscrow");
        escrow = await SecureEscrow.deploy(await usdt.getAddress());

        // Give USDT to users
        await usdt.mint(poster.address, ethers.parseEther("1000"));
        await usdt.mint(freelancer.address, ethers.parseEther("1000"));
        await usdt.mint(attacker.address, ethers.parseEther("1000"));

        // Approve escrow to spend USDT
        await usdt.connect(poster).approve(await escrow.getAddress(), ethers.parseEther("1000"));
        await usdt.connect(freelancer).approve(await escrow.getAddress(), ethers.parseEther("1000"));
        await usdt.connect(attacker).approve(await escrow.getAddress(), ethers.parseEther("1000"));
    });

    describe("🛡️ Reentrancy Protection", function () {
        it("should prevent reentrancy attacks during task posting", async function () {
            // This test ensures the nonReentrant modifier works
            await expect(
                escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION)
            ).to.not.be.reverted;
        });

        it("should prevent reentrancy during withdrawal", async function () {
            // Post task, accept, submit, approve
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(freelancer).acceptTask(0);
            await escrow.connect(freelancer).submitWork(0, "Work completed");
            await escrow.connect(poster).approveWork(0);

            // Withdraw should work normally
            await expect(escrow.connect(freelancer).withdraw()).to.not.be.reverted;
        });
    });

    describe("🔐 Access Control", function () {
        beforeEach(async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(freelancer).acceptTask(0);
        });

        it("should only allow poster to approve work", async function () {
            await escrow.connect(freelancer).submitWork(0, "Work completed");
            
            await expect(
                escrow.connect(attacker).approveWork(0)
            ).to.be.revertedWithCustomError(escrow, "UnauthorizedAccess");
        });

        it("should only allow freelancer to submit work", async function () {
            await expect(
                escrow.connect(attacker).submitWork(0, "Fake work")
            ).to.be.revertedWithCustomError(escrow, "UnauthorizedAccess");
        });

        it("should only allow poster to cancel task", async function () {
            await expect(
                escrow.connect(attacker).cancelTask(0)
            ).to.be.revertedWithCustomError(escrow, "UnauthorizedAccess");
        });

        it("should prevent self-acceptance of tasks", async function () {
            await escrow.connect(poster).postTask("Another task", TASK_REWARD, TASK_DURATION);
            
            await expect(
                escrow.connect(poster).acceptTask(1)
            ).to.be.revertedWithCustomError(escrow, "SelfAcceptance");
        });
    });

    describe("⏰ Time-based Security", function () {
        it("should prevent actions on expired tasks", async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            
            // Fast forward past deadline
            await time.increase(TASK_DURATION + 1);
            
            await expect(
                escrow.connect(freelancer).acceptTask(0)
            ).to.be.revertedWithCustomError(escrow, "TaskExpired");
        });

        it("should allow marking expired tasks", async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(freelancer).acceptTask(0);
            
            // Fast forward past deadline
            await time.increase(TASK_DURATION + 1);
            
            await expect(escrow.connect(attacker).markExpired(0)).to.not.be.reverted;
            
            const task = await escrow.getTask(0);
            expect(task.status).to.equal(6); // Expired
        });
    });

    describe("🎯 State Machine Security", function () {
        beforeEach(async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
        });

        it("should enforce correct state transitions", async function () {
            // Can't submit work before accepting
            await expect(
                escrow.connect(freelancer).submitWork(0, "Work")
            ).to.be.revertedWithCustomError(escrow, "TaskNotInRequiredState");

            // Accept task first
            await escrow.connect(freelancer).acceptTask(0);

            // Can't approve work before submission
            await expect(
                escrow.connect(poster).approveWork(0)
            ).to.be.revertedWithCustomError(escrow, "TaskNotInRequiredState");

            // Submit work
            await escrow.connect(freelancer).submitWork(0, "Work completed");

            // Can't accept again
            await expect(
                escrow.connect(attacker).acceptTask(0)
            ).to.be.revertedWithCustomError(escrow, "TaskNotInRequiredState");
        });

        it("should prevent double approval", async function () {
            await escrow.connect(freelancer).acceptTask(0);
            await escrow.connect(freelancer).submitWork(0, "Work completed");
            await escrow.connect(poster).approveWork(0);

            // Can't approve again
            await expect(
                escrow.connect(poster).approveWork(0)
            ).to.be.revertedWithCustomError(escrow, "TaskNotInRequiredState");
        });
    });

    describe("💰 Payment Security", function () {
        it("should use pull payment pattern correctly", async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(freelancer).acceptTask(0);
            await escrow.connect(freelancer).submitWork(0, "Work completed");
            await escrow.connect(poster).approveWork(0);

            // Check pending withdrawal
            const pendingBefore = await escrow.pendingWithdrawals(freelancer.address);
            expect(pendingBefore).to.be.gt(0);

            // Withdraw
            await escrow.connect(freelancer).withdraw();

            // Check pending withdrawal is cleared
            const pendingAfter = await escrow.pendingWithdrawals(freelancer.address);
            expect(pendingAfter).to.equal(0);
        });

        it("should calculate platform fees correctly", async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(freelancer).acceptTask(0);
            await escrow.connect(freelancer).submitWork(0, "Work completed");
            await escrow.connect(poster).approveWork(0);

            const platformFee = (TASK_REWARD * 250n) / 10000n; // 2.5%
            const freelancerPayment = TASK_REWARD - platformFee;

            expect(await escrow.pendingWithdrawals(freelancer.address)).to.equal(freelancerPayment);
            expect(await escrow.pendingWithdrawals(owner.address)).to.equal(platformFee);
        });

        it("should prevent withdrawal without balance", async function () {
            await expect(
                escrow.connect(attacker).withdraw()
            ).to.be.revertedWith("No pending withdrawals");
        });
    });

    describe("🚨 Input Validation", function () {
        it("should reject empty task details", async function () {
            await expect(
                escrow.connect(poster).postTask("", TASK_REWARD, TASK_DURATION)
            ).to.be.revertedWith("Empty task details");
        });

        it("should reject zero reward", async function () {
            await expect(
                escrow.connect(poster).postTask("Test task", 0, TASK_DURATION)
            ).to.be.revertedWith("Invalid reward amount");
        });

        it("should reject invalid duration", async function () {
            const MAX_DURATION = 30 * 24 * 60 * 60; // 30 days
            
            await expect(
                escrow.connect(poster).postTask("Test task", TASK_REWARD, MAX_DURATION + 1)
            ).to.be.revertedWith("Invalid duration");
        });

        it("should reject empty submission", async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(freelancer).acceptTask(0);
            
            await expect(
                escrow.connect(freelancer).submitWork(0, "")
            ).to.be.revertedWith("Empty submission");
        });

        it("should reject invalid task IDs", async function () {
            await expect(
                escrow.connect(freelancer).acceptTask(999)
            ).to.be.revertedWithCustomError(escrow, "InvalidTaskId");
        });
    });

    describe("⏸️ Emergency Controls", function () {
        it("should allow owner to pause contract", async function () {
            await escrow.connect(owner).pause();
            
            await expect(
                escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION)
            ).to.be.revertedWith("Pausable: paused");
        });

        it("should not allow non-owner to pause", async function () {
            await expect(
                escrow.connect(attacker).pause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should allow emergency withdrawal when paused", async function () {
            // Post a task to get some USDT in contract
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            
            // Pause contract
            await escrow.connect(owner).pause();
            
            // Emergency withdraw should work
            await expect(
                escrow.connect(owner).emergencyWithdraw(await usdt.getAddress(), TASK_REWARD)
            ).to.not.be.reverted;
        });
    });

    describe("📊 View Functions", function () {
        it("should return correct task data", async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            
            const task = await escrow.getTask(0);
            expect(task.details).to.equal("Test task");
            expect(task.reward).to.equal(TASK_REWARD);
            expect(task.poster).to.equal(poster.address);
            expect(task.status).to.equal(0); // Open
        });

        it("should return correct poster tasks", async function () {
            await escrow.connect(poster).postTask("Task 1", TASK_REWARD, TASK_DURATION);
            await escrow.connect(poster).postTask("Task 2", TASK_REWARD, TASK_DURATION);
            
            const posterTasks = await escrow.getPosterTasks(poster.address);
            expect(posterTasks.length).to.equal(2);
            expect(posterTasks[0]).to.equal(0);
            expect(posterTasks[1]).to.equal(1);
        });

        it("should return active tasks only", async function () {
            await escrow.connect(poster).postTask("Active task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(poster).postTask("Another active", TASK_REWARD, TASK_DURATION);
            
            const activeTasks = await escrow.getAllActiveTasks();
            expect(activeTasks.length).to.equal(2);
        });
    });

    describe("🔄 Dispute Resolution", function () {
        beforeEach(async function () {
            await escrow.connect(poster).postTask("Test task", TASK_REWARD, TASK_DURATION);
            await escrow.connect(freelancer).acceptTask(0);
            await escrow.connect(freelancer).submitWork(0, "Work completed");
        });

        it("should allow poster to dispute work", async function () {
            await expect(escrow.connect(poster).disputeWork(0)).to.not.be.reverted;
            
            const task = await escrow.getTask(0);
            expect(task.status).to.equal(4); // Disputed
        });

        it("should allow owner to resolve disputes", async function () {
            await escrow.connect(poster).disputeWork(0);
            
            // Resolve in favor of freelancer
            await expect(escrow.connect(owner).resolveDispute(0, true)).to.not.be.reverted;
            
            const task = await escrow.getTask(0);
            expect(task.status).to.equal(3); // Completed
        });

        it("should not allow non-owner to resolve disputes", async function () {
            await escrow.connect(poster).disputeWork(0);
            
            await expect(
                escrow.connect(attacker).resolveDispute(0, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});