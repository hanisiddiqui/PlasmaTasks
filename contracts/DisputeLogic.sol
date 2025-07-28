// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DisputeLogic {
    enum DisputeStatus { None, Raised, Escalated, Resolved }

    struct Dispute {
        address raisedBy;
        string reason;
        DisputeStatus status;
        uint256 raisedAt;
    }

    mapping(uint256 => Dispute) public disputes;

    event DisputeRaised(uint256 indexed taskId, address indexed by, string reason);
    event DisputeEscalated(uint256 indexed taskId);
    event DisputeResolved(uint256 indexed taskId, string resolution);

    modifier onlyInDispute(uint256 taskId) {
        require(disputes[taskId].status != DisputeStatus.None, "No dispute found");
        _;
    }

    function raiseDispute(uint256 taskId, string calldata reason) external {
        require(disputes[taskId].status == DisputeStatus.None, "Dispute already exists");

        disputes[taskId] = Dispute({
            raisedBy: msg.sender,
            reason: reason,
            status: DisputeStatus.Raised,
            raisedAt: block.timestamp
        });

        emit DisputeRaised(taskId, msg.sender, reason);
    }

    function escalateDispute(uint256 taskId) external onlyInDispute(taskId) {
        require(disputes[taskId].status == DisputeStatus.Raised, "Not eligible to escalate");
        disputes[taskId].status = DisputeStatus.Escalated;
        emit DisputeEscalated(taskId);
    }

    function resolveDispute(uint256 taskId, string calldata resolution) external onlyInDispute(taskId) {
        disputes[taskId].status = DisputeStatus.Resolved;
        emit DisputeResolved(taskId, resolution);
    }

    function getDispute(uint256 taskId) external view returns (
        address raisedBy,
        string memory reason,
        DisputeStatus status,
        uint256 raisedAt
    ) {
        Dispute storage d = disputes[taskId];
        return (d.raisedBy, d.reason, d.status, d.raisedAt);
    }
}
