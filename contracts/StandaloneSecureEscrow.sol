// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title StandaloneSecureEscrow
 * @dev Secure escrow contract without external dependencies
 */
contract StandaloneSecureEscrow {
    address public owner;
    IERC20 public immutable usdt;
    uint256 public taskCounter;
    uint256 public constant PLATFORM_FEE = 250; // 2.5%
    uint256 public constant MAX_TASK_DURATION = 30 days;
    bool public paused = false;
    
    // Reentrancy guard
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    
    enum TaskStatus {
        Open, Accepted, Submitted, Completed, Disputed, Cancelled, Expired
    }
    
    struct Task {
        uint256 id;
        string details;
        uint256 reward;
        uint256 deadline;
        address poster;
        address freelancer;
        string submission;
        TaskStatus status;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 submittedAt;
    }
    
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public posterTasks;
    mapping(address => uint256[]) public freelancerTasks;
    mapping(address => uint256) public pendingWithdrawals;
    
    // Events
    event TaskPosted(uint256 indexed taskId, address indexed poster, string details, uint256 reward, uint256 deadline);
    event TaskAccepted(uint256 indexed taskId, address indexed freelancer, uint256 acceptedAt);
    event WorkSubmitted(uint256 indexed taskId, address indexed freelancer, string submission, uint256 submittedAt);
    event TaskCompleted(uint256 indexed taskId, address indexed freelancer, uint256 reward, uint256 platformFee);
    event TaskCancelled(uint256 indexed taskId, address indexed poster, uint256 refundAmount);
    event TaskDisputed(uint256 indexed taskId, address indexed disputer);
    event WithdrawalMade(address indexed user, uint256 amount);
    
    // Custom errors
    error InvalidTaskId();
    error TaskNotInRequiredState(TaskStatus required, TaskStatus actual);
    error UnauthorizedAccess();
    error TaskExpired();
    error SelfAcceptance();
    error ContractPaused();
    error ReentrancyDetected();
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyDetected();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    
    modifier validTaskId(uint256 taskId) {
        if (taskId >= taskCounter) revert InvalidTaskId();
        _;
    }
    
    modifier onlyPoster(uint256 taskId) {
        if (tasks[taskId].poster != msg.sender) revert UnauthorizedAccess();
        _;
    }
    
    modifier onlyFreelancer(uint256 taskId) {
        if (tasks[taskId].freelancer != msg.sender) revert UnauthorizedAccess();
        _;
    }
    
    modifier inState(uint256 taskId, TaskStatus requiredStatus) {
        TaskStatus currentStatus = tasks[taskId].status;
        if (currentStatus != requiredStatus) {
            revert TaskNotInRequiredState(requiredStatus, currentStatus);
        }
        _;
    }
    
    modifier notExpired(uint256 taskId) {
        if (block.timestamp > tasks[taskId].deadline) revert TaskExpired();
        _;
    }

    constructor(address _usdtAddress) {
        require(_usdtAddress != address(0), "Invalid USDT address");
        owner = msg.sender;
        usdt = IERC20(_usdtAddress);
        _status = _NOT_ENTERED;
    }

    function postTask(string calldata _details, uint256 _reward, uint256 _duration) 
        external nonReentrant whenNotPaused 
    {
        require(bytes(_details).length > 0, "Empty task details");
        require(_reward > 0, "Invalid reward amount");
        require(_duration > 0 && _duration <= MAX_TASK_DURATION, "Invalid duration");
        
        uint256 deadline = block.timestamp + _duration;
        uint256 taskId = taskCounter++;
        
        Task storage task = tasks[taskId];
        task.id = taskId;
        task.details = _details;
        task.reward = _reward;
        task.deadline = deadline;
        task.poster = msg.sender;
        task.status = TaskStatus.Open;
        task.createdAt = block.timestamp;
        
        posterTasks[msg.sender].push(taskId);
        
        require(usdt.transferFrom(msg.sender, address(this), _reward), "USDT transfer failed");
        
        emit TaskPosted(taskId, msg.sender, _details, _reward, deadline);
    }

    function acceptTask(uint256 taskId) 
        external validTaskId(taskId) inState(taskId, TaskStatus.Open) notExpired(taskId) whenNotPaused 
    {
        Task storage task = tasks[taskId];
        if (task.poster == msg.sender) revert SelfAcceptance();
        
        task.freelancer = msg.sender;
        task.status = TaskStatus.Accepted;
        task.acceptedAt = block.timestamp;
        
        freelancerTasks[msg.sender].push(taskId);
        
        emit TaskAccepted(taskId, msg.sender, block.timestamp);
    }

    function submitWork(uint256 taskId, string calldata _submission)
        external validTaskId(taskId) onlyFreelancer(taskId) inState(taskId, TaskStatus.Accepted) 
        notExpired(taskId) whenNotPaused
    {
        require(bytes(_submission).length > 0, "Empty submission");
        
        Task storage task = tasks[taskId];
        task.submission = _submission;
        task.status = TaskStatus.Submitted;
        task.submittedAt = block.timestamp;
        
        emit WorkSubmitted(taskId, msg.sender, _submission, block.timestamp);
    }

    function approveWork(uint256 taskId)
        external validTaskId(taskId) onlyPoster(taskId) inState(taskId, TaskStatus.Submitted) 
        nonReentrant whenNotPaused
    {
        Task storage task = tasks[taskId];
        task.status = TaskStatus.Completed;
        
        uint256 reward = task.reward;
        uint256 platformFee = (reward * PLATFORM_FEE) / 10000;
        uint256 freelancerPayment = reward - platformFee;
        
        pendingWithdrawals[task.freelancer] += freelancerPayment;
        pendingWithdrawals[owner] += platformFee;
        
        emit TaskCompleted(taskId, task.freelancer, freelancerPayment, platformFee);
    }

    function disputeWork(uint256 taskId)
        external validTaskId(taskId) onlyPoster(taskId) inState(taskId, TaskStatus.Submitted) whenNotPaused
    {
        Task storage task = tasks[taskId];
        task.status = TaskStatus.Disputed;
        
        emit TaskDisputed(taskId, msg.sender);
    }

    function cancelTask(uint256 taskId)
        external validTaskId(taskId) onlyPoster(taskId) nonReentrant whenNotPaused
    {
        Task storage task = tasks[taskId];
        
        bool canCancel = (task.status == TaskStatus.Open) ||
                        (task.status == TaskStatus.Accepted && block.timestamp > task.deadline);
        
        require(canCancel, "Cannot cancel task in current state");
        
        task.status = TaskStatus.Cancelled;
        pendingWithdrawals[task.poster] += task.reward;
        
        emit TaskCancelled(taskId, msg.sender, task.reward);
    }

    function resolveDispute(uint256 taskId, bool approveWork)
        external onlyOwner validTaskId(taskId) inState(taskId, TaskStatus.Disputed) nonReentrant
    {
        Task storage task = tasks[taskId];
        
        if (approveWork) {
            task.status = TaskStatus.Completed;
            
            uint256 reward = task.reward;
            uint256 platformFee = (reward * PLATFORM_FEE) / 10000;
            uint256 freelancerPayment = reward - platformFee;
            
            pendingWithdrawals[task.freelancer] += freelancerPayment;
            pendingWithdrawals[owner] += platformFee;
            
            emit TaskCompleted(taskId, task.freelancer, freelancerPayment, platformFee);
        } else {
            task.status = TaskStatus.Cancelled;
            pendingWithdrawals[task.poster] += task.reward;
            
            emit TaskCancelled(taskId, task.poster, task.reward);
        }
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawals");
        
        pendingWithdrawals[msg.sender] = 0;
        require(usdt.transfer(msg.sender, amount), "Transfer failed");
        
        emit WithdrawalMade(msg.sender, amount);
    }

    function markExpired(uint256 taskId) external validTaskId(taskId) {
        Task storage task = tasks[taskId];
        
        require(block.timestamp > task.deadline, "Task not expired yet");
        require(
            task.status == TaskStatus.Open || task.status == TaskStatus.Accepted,
            "Cannot expire task in current state"
        );
        
        task.status = TaskStatus.Expired;
        pendingWithdrawals[task.poster] += task.reward;
        
        emit TaskCancelled(taskId, task.poster, task.reward);
    }

    // View functions
    function getTask(uint256 taskId) external view validTaskId(taskId) returns (Task memory) {
        return tasks[taskId];
    }
    
    function getPosterTasks(address poster) external view returns (uint256[] memory) {
        return posterTasks[poster];
    }
    
    function getFreelancerTasks(address freelancer) external view returns (uint256[] memory) {
        return freelancerTasks[freelancer];
    }
    
    function getAllActiveTasks() external view returns (Task[] memory) {
        Task[] memory activeTasks = new Task[](taskCounter);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < taskCounter; i++) {
            if (tasks[i].status == TaskStatus.Open || tasks[i].status == TaskStatus.Accepted) {
                activeTasks[activeCount] = tasks[i];
                activeCount++;
            }
        }
        
        Task[] memory result = new Task[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeTasks[i];
        }
        
        return result;
    }

    // Emergency functions
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(paused, "Contract must be paused");
        IERC20(token).transfer(owner, amount);
    }
}