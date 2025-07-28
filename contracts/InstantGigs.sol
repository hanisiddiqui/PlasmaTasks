// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract InstantGigs {
    struct Gig {
        address seller;
        string title;
        string description;
        uint256 price;
        bool active;
    }

    uint256 public gigCounter;
    address public USDT;

    mapping(uint256 => Gig) public gigs;
    mapping(uint256 => address) public buyers;
    mapping(address => uint256[]) public gigsBySeller;

    event GigCreated(uint256 indexed gigId, address indexed seller, string title, uint256 price);
    event GigPurchased(uint256 indexed gigId, address indexed buyer);

    constructor(address _usdt) {
        USDT = _usdt;
    }

    function createGig(string calldata title, string calldata description, uint256 price) external {
        gigCounter++;
        gigs[gigCounter] = Gig({
            seller: msg.sender,
            title: title,
            description: description,
            price: price,
            active: true
        });
        gigsBySeller[msg.sender].push(gigCounter);

        emit GigCreated(gigCounter, msg.sender, title, price);
    }

    function purchaseGig(uint256 gigId) external {
        Gig storage gig = gigs[gigId];
        require(gig.active, "Gig not active");

        IERC20(USDT).transferFrom(msg.sender, gig.seller, gig.price);
        buyers[gigId] = msg.sender;

        emit GigPurchased(gigId, msg.sender);
    }

    function getSellerGigs(address seller) external view returns (uint256[] memory) {
        return gigsBySeller[seller];
    }

    function deactivateGig(uint256 gigId) external {
        require(gigs[gigId].seller == msg.sender, "Not seller");
        gigs[gigId].active = false;
    }
}
