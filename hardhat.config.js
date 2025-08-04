require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Load private key from environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Add this to your hardhat.config.js networks section:
plasma: {
  url: "https://testnet-rpc.plasma.to",
  accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
  chainId: 9746,
  timeout: 60000,
  gasPrice: 1000000000,
},
plasma2: {
  url: "https://rpc.testnet.plasma.to",
  accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
  chainId: 9746,
  timeout: 60000,
},
    sepolia: {
      url: "https://rpc.sepolia.org", // Free public RPC
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
    },
    // Alternative Sepolia RPCs
    sepolia2: {
      url: "https://sepolia.gateway.tenderly.co",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111
    },
    sepolia3: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY // Optional, for contract verification
  }
};