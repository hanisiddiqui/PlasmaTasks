// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReviewAndProofs {
    struct Review {
        uint8 quality;        // 1–5
        uint8 timeliness;     // 1–5
        uint8 communication;  // 1–5
        string comment;
    }

    struct ClientReview {
        uint8 fairness;
        uint8 responsiveness;
        uint8 clarity;
        string comment;
    }

    struct Proof {
        string uri;     // IPFS or HTTPS
        uint256 timestamp;
    }

    mapping(uint256 => Review) public freelancerReviews;
    mapping(uint256 => ClientReview) public clientReviews;
    mapping(uint256 => Proof[]) public deliveryProofs;

    event WorkProofUploaded(uint256 indexed taskId, string uri, uint256 timestamp);
    event FreelancerReviewed(uint256 indexed taskId, uint8 quality, uint8 timeliness, uint8 communication);
    event ClientReviewed(uint256 indexed taskId, uint8 fairness, uint8 responsiveness, uint8 clarity);

    function uploadProof(uint256 taskId, string calldata uri) external {
        deliveryProofs[taskId].push(Proof({
            uri: uri,
            timestamp: block.timestamp
        }));

        emit WorkProofUploaded(taskId, uri, block.timestamp);
    }

    function reviewFreelancer(uint256 taskId, uint8 quality, uint8 timeliness, uint8 communication, string calldata comment) external {
        freelancerReviews[taskId] = Review({
            quality: quality,
            timeliness: timeliness,
            communication: communication,
            comment: comment
        });

        emit FreelancerReviewed(taskId, quality, timeliness, communication);
    }

    function reviewClient(uint256 taskId, uint8 fairness, uint8 responsiveness, uint8 clarity, string calldata comment) external {
        clientReviews[taskId] = ClientReview({
            fairness: fairness,
            responsiveness: responsiveness,
            clarity: clarity,
            comment: comment
        });

        emit ClientReviewed(taskId, fairness, responsiveness, clarity);
    }

    function getProofs(uint256 taskId) external view returns (Proof[] memory) {
        return deliveryProofs[taskId];
    }
}
