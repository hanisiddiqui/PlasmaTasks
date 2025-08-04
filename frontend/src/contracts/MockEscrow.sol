// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MockEscrow {
    struct Task {
        string details;
        uint256 reward;
        address poster;
        bool isActive;
    }
    
    Task[] public tasks;
    IERC20 public usdt;
    address public owner;
    
    event TaskPosted(uint256 indexed taskId, address indexed poster, string details, uint256 reward);
    event TaskCancelled(uint256 indexed taskId);
    
    constructor(address _usdtAddress) {
        usdt = IERC20(_usdtAddress);
        owner = msg.sender;
    }
    
    function postTask(string memory _details, uint256 _reward) public {
        // Transfer USDT from poster to this contract
        require(usdt.transferFrom(msg.sender, address(this), _reward), "USDT transfer failed");
        
        // Create the task
        tasks.push(Task({
            details: _details,
            reward: _reward,
            poster: msg.sender,
            isActive: true
        }));
        
        emit TaskPosted(tasks.length - 1, msg.sender, _details, _reward);
    }
    
    function cancelTask(uint256 taskId) public {
        require(taskId < tasks.length, "Task does not exist");
        require(tasks[taskId].poster == msg.sender, "Not poster");
        require(tasks[taskId].isActive, "Already inactive");
        
        // Mark as inactive
        tasks[taskId].isActive = false;
        
        // Refund the USDT
        require(usdt.transfer(msg.sender, tasks[taskId].reward), "Refund failed");
        
        emit TaskCancelled(taskId);
    }
    
    function getAllTasks() public view returns (Task[] memory) {
        return tasks;
    }
    
    function getTaskCount() public view returns (uint256) {
        return tasks.length;
    }
}