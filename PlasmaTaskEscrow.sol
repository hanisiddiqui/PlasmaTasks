
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract PlasmaTaskEscrow {
    enum TaskStatus { Open, Selected, Funded, InProgress, Submitted, Approved, Disputed, Resolved }

    struct Task {
        address client;
        address freelancer;
        string description;
        uint256 reward;
        uint256 deadline;
        uint256 createdAt;
        TaskStatus status;
    }

    uint256 public taskCounter;
    address public USDT;
    mapping(uint256 => Task) public tasks;

    mapping(uint256 => address[]) public applicants;
    mapping(uint256 => mapping(address => string)) public proposals;

    event TaskPosted(uint256 indexed taskId, address indexed client, uint256 reward, string description);
    event FreelancerApplied(uint256 indexed taskId, address indexed freelancer, string proposal);
    event FreelancerSelected(uint256 indexed taskId, address indexed freelancer, uint256 deadline);
    event TaskFunded(uint256 indexed taskId, uint256 amount);
    event WorkSubmitted(uint256 indexed taskId, address indexed freelancer);
    event WorkApproved(uint256 indexed taskId, address indexed client);

    constructor(address _usdt) {
        USDT = _usdt;
    }

    function postTask(string calldata description, uint256 reward) external {
        taskCounter++;
        tasks[taskCounter] = Task({
            client: msg.sender,
            freelancer: address(0),
            description: description,
            reward: reward,
            deadline: 0,
            createdAt: block.timestamp,
            status: TaskStatus.Open
        });

        emit TaskPosted(taskCounter, msg.sender, reward, description);
    }

    function selectFreelancer(uint256 taskId, address freelancer, uint256 deadlineTimestamp) external {
        Task storage task = tasks[taskId];
        require(msg.sender == task.client, "Not task owner");
        require(task.status == TaskStatus.Open, "Task not open");

        task.freelancer = freelancer;
        task.deadline = deadlineTimestamp;
        task.status = TaskStatus.Selected;

        emit FreelancerSelected(taskId, freelancer, deadlineTimestamp);
    }

    function fundTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(msg.sender == task.client, "Not task owner");
        require(task.status == TaskStatus.Selected, "Freelancer not selected");

        IERC20(USDT).transferFrom(msg.sender, address(this), task.reward);
        task.status = TaskStatus.Funded;

        emit TaskFunded(taskId, task.reward);
    }

    function approveWork(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(msg.sender == task.client, "Not task owner");
        require(task.status == TaskStatus.Submitted, "No work to approve");

        task.status = TaskStatus.Approved;
        IERC20(USDT).transfer(task.freelancer, task.reward);

        emit WorkApproved(taskId, msg.sender);
    }

    function applyForTask(uint256 taskId, string calldata proposalText) external {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Applications closed");

        applicants[taskId].push(msg.sender);
        proposals[taskId][msg.sender] = proposalText;

        emit FreelancerApplied(taskId, msg.sender, proposalText);
    }

    function submitWork(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(msg.sender == task.freelancer, "Not assigned freelancer");
        require(task.status == TaskStatus.Funded, "Task not funded");

        task.status = TaskStatus.Submitted;

        emit WorkSubmitted(taskId, msg.sender);
    }

    function getApplicants(uint256 taskId) external view returns (address[] memory) {
        return applicants[taskId];
    }

    function getProposal(uint256 taskId, address freelancer) external view returns (string memory) {
        return proposals[taskId][freelancer];
    }
}
