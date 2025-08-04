// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUSDT {
    function transferFrom(address sender, address recipient, uint amount) external returns (bool);
    function transfer(address recipient, uint amount) external returns (bool);
}

contract Escrow {
    address public owner;
    IUSDT public usdt;

    struct Task {
        string details;
        uint256 reward;
        address poster;
        bool isActive;
    }

    Task[] public tasks;

    constructor(address _usdtAddress) {
        owner = msg.sender;
        usdt = IUSDT(_usdtAddress);
    }

    function postTask(string memory _details, uint256 _reward) external {
        require(usdt.transferFrom(msg.sender, address(this), _reward), "USDT transfer failed");

        tasks.push(Task({
            details: _details,
            reward: _reward,
            poster: msg.sender,
            isActive: true
        }));
    }

    function getAllTasks() external view returns (Task[] memory) {
        return tasks;
    }

    function cancelTask(uint taskId) external {
        Task storage task = tasks[taskId];
        require(msg.sender == task.poster, "Not poster");
        require(task.isActive, "Already inactive");

        task.isActive = false;
        require(usdt.transfer(msg.sender, task.reward), "Refund failed");
    }
}
