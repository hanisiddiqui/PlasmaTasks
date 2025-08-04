export const escrowAbi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_usdtAddress",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "taskId",
          "type": "uint256"
        }
      ],
      "name": "cancelTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAllTasks",
      "outputs": [
        {
          "components": [
            {
              "internalType": "string",
              "name": "details",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "reward",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "poster",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "isActive",
              "type": "bool"
            }
          ],
          "internalType": "struct Escrow.Task[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_details",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_reward",
          "type": "uint256"
        }
      ],
      "name": "postTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tasks",
      "outputs": [
        {
          "internalType": "string",
          "name": "details",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "reward",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "poster",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "usdt",
      "outputs": [
        {
          "internalType": "contract IUSDT",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
    ];