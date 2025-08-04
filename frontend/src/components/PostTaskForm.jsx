import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const PostTaskForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward: '',
    deadline: '', // Will be set to default value
    skills: ''
  });
  
  // Set default deadline when component mounts
  useEffect(() => {
    // Set default deadline to 3 days from now
    const defaultDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const defaultDeadlineString = defaultDeadline.toISOString().slice(0, 16);
    
    setFormData(prev => ({
      ...prev,
      deadline: defaultDeadlineString
    }));
  }, []);
  
  const [userAddress, setUserAddress] = useState('');
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [contracts, setContracts] = useState({ escrow: null, usdt: null });
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'approve', 'create', 'success'

  // Contract addresses
  const ESCROW_ADDRESS = "0xf6a5C743d21277291938e28a618f7E43DEA6262C";
  const USDT_ADDRESS = "0xe86E7fFb5A8f7C4506487FFcF924E164263BE157";

  // Contract ABIs - Complete ABI based on your contract
  const ESCROW_ABI = [
    "function postTask(string memory _details, uint256 _reward, uint256 _duration) external",
    "function taskCounter() view returns (uint256)",
    "function getTask(uint256 taskId) view returns (tuple(uint256 id, string title, uint256 reward, uint256 deadline, address creator, address worker, string description, uint8 status, uint256 createdAt, uint256 completedAt, uint256 rating))",
    "function acceptTask(uint256 taskId) external",
    "function owner() view returns (address)",
    "function paused() view returns (bool)"
  ];

  const USDT_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Check if already connected
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        }).catch(() => []);
        
        if (accounts.length > 0) {
          await setupWeb3(accounts[0]);
        } else {
          setNetworkStatus('wallet-not-connected');
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) {
            setupWeb3(accounts[0]);
          } else {
            setUserAddress('');
            setContracts({ escrow: null, usdt: null });
            setNetworkStatus('wallet-not-connected');
          }
        });
        
        // Listen for network changes
        window.ethereum.on('chainChanged', (chainId) => {
          const newChainId = parseInt(chainId, 16);
          if (newChainId === 9746 && userAddress) {
            setupWeb3(userAddress);
          } else if (newChainId !== 9746) {
            setNetworkStatus('wrong-network');
          }
        });
        
      } else {
        setNetworkStatus('no-wallet');
      }
    } catch (error) {
      console.error('Web3 initialization error:', error);
      setNetworkStatus('error');
    }
  };

  const setupWeb3 = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Check network
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 9746) {
        setNetworkStatus('wrong-network');
        return;
      }

      // Create contract instances
      const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      
      setUserAddress(address);
      setContracts({ escrow: escrowContract, usdt: usdtContract });
      setNetworkStatus('connected');
      
      // Get USDT balance
      const balance = await usdtContract.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(balance, 6));
      
      console.log('✅ Web3 setup complete for task posting');
      
    } catch (error) {
      console.error('❌ Failed to setup Web3:', error);
      setNetworkStatus('error');
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          await setupWeb3(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet: ' + error.message);
      }
    } else {
      alert('Please install MetaMask to post tasks!');
    }
  };

  const switchToPlasmaNetwork = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2612' }], // 9746 in hex
        });
      } catch (error) {
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x2612',
                chainName: 'Plasma Testnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://testnet-rpc.plasma.to'],
                blockExplorerUrls: ['https://plasma.to']
              }]
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
          }
        }
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      alert('Please enter a task title');
      return false;
    }
    if (!formData.description.trim()) {
      alert('Please enter a task description');
      return false;
    }
    if (!formData.reward || parseFloat(formData.reward) <= 0) {
      alert('Please enter a valid reward amount');
      return false;
    }
    if (!formData.deadline) {
      alert('Please select a deadline');
      return false;
    }
    
    const selectedDate = new Date(formData.deadline);
    const now = new Date();
    if (selectedDate <= now) {
      alert('Deadline must be in the future');
      return false;
    }
    
    if (parseFloat(formData.reward) > parseFloat(usdtBalance)) {
      alert(`Insufficient USDT balance. You have ${usdtBalance} USDT`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (networkStatus !== 'connected') {
      alert('Please connect your wallet and switch to Plasma network first');
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStep('approve');
      
      const rewardAmount = ethers.parseUnits(formData.reward, 6);
      
      // Calculate duration in seconds from now to deadline
      const deadlineTime = new Date(formData.deadline).getTime();
      const currentTime = Date.now();
      const durationInSeconds = Math.floor((deadlineTime - currentTime) / 1000);
      
      // Combine title and description into one details string
      const taskDetails = `Title: ${formData.title}\n\nDescription: ${formData.description}\n\nSkills: ${formData.skills || 'Not specified'}`;
      
      console.log('📊 Task creation parameters:');
      console.log('Selected deadline:', formData.deadline);
      console.log('Deadline time (ms):', deadlineTime);
      console.log('Current time (ms):', currentTime);
      console.log('Duration (seconds):', durationInSeconds);
      console.log('Duration (hours):', (durationInSeconds / 3600).toFixed(1));
      console.log('Duration (days):', (durationInSeconds / (24 * 60 * 60)).toFixed(1));
      console.log('Details string:', taskDetails);
      
      if (durationInSeconds <= 0) {
        alert(`Deadline must be in the future!\n\nYou selected: ${new Date(deadlineTime).toLocaleString()}\nCurrent time: ${new Date(currentTime).toLocaleString()}`);
        return;
      }
      
      if (durationInSeconds < 3600) { // Less than 1 hour
        alert(`Please set a deadline at least 1 hour in the future.\n\nCurrent duration: ${(durationInSeconds / 60).toFixed(1)} minutes`);
        return;
      }
      
      // Check if duration is too large (your contract has MAX_TASK_DURATION = 30 days)
      const maxDuration = 30 * 24 * 60 * 60; // 30 days in seconds
      if (durationInSeconds > maxDuration) {
        alert(`Deadline too far in the future. Maximum duration is 30 days.\n\nYour duration: ${(durationInSeconds / (24 * 60 * 60)).toFixed(1)} days`);
        return;
      }
      
      // Step 1: Check and approve USDT spending
      console.log('🔍 Checking USDT allowance...');
      const currentAllowance = await contracts.usdt.allowance(userAddress, ESCROW_ADDRESS);
      
      if (currentAllowance < rewardAmount) {
        console.log('💰 Approving USDT spending...');
        const approveTx = await contracts.usdt.approve(ESCROW_ADDRESS, rewardAmount);
        console.log('📤 Approval transaction sent:', approveTx.hash);
        
        await approveTx.wait();
        console.log('✅ USDT approval confirmed');
      } else {
        console.log('✅ USDT already approved');
      }
      
      // Step 2: Create the task
      setCurrentStep('create');
      console.log('📝 Creating task on blockchain...');
      console.log('📊 Contract:', contracts.escrow);
      console.log('📊 Contract address:', ESCROW_ADDRESS);
      console.log('📊 postTask function exists?', typeof contracts.escrow.postTask);
      
      if (typeof contracts.escrow.postTask !== 'function') {
        throw new Error('postTask function not found in contract. Available functions: ' + Object.keys(contracts.escrow.interface.functions));
      }
      
      const createTx = await contracts.escrow.postTask(
        taskDetails,
        rewardAmount,
        durationInSeconds
      );
      
      console.log('📤 Task creation transaction sent:', createTx.hash);
      
      const receipt = await createTx.wait();
      console.log('✅ Task created successfully:', receipt);
      
      // Get the new task ID
      const taskCounter = await contracts.escrow.taskCounter();
      
      setCurrentStep('success');
      
      // Show success message
      alert(`🎉 Task created successfully!\n\nTask ID: ${taskCounter}\nTransaction: ${receipt.transactionHash}\nBlock: ${receipt.blockNumber}`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        reward: '',
        deadline: '',
        skills: ''
      });
      
      // Update balance
      const newBalance = await contracts.usdt.balanceOf(userAddress);
      setUsdtBalance(ethers.formatUnits(newBalance, 6));
      
    } catch (error) {
      console.error('❌ Error creating task:', error);
      
      let errorMessage = 'Failed to create task';
      
      if (error.code === -32005 || error.message.includes('rate limit')) {
        errorMessage = '⏳ Network is busy. Please wait a few minutes and try again.\n\nTip: The Plasma testnet has rate limits to prevent spam.';
      } else if (error.reason) {
        errorMessage += ': ' + error.reason;
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user';
      } else {
        errorMessage += ': ' + error.message;
      }
      
      alert('❌ ' + errorMessage);
    } finally {
      setIsSubmitting(false);
      setCurrentStep('form');
    }
  };

  const getNetworkStatusDisplay = () => {
    switch (networkStatus) {
      case 'checking': return { text: '🔄 Checking connection...', color: '#F59E0B' };
      case 'connected': return { text: '⛓️ Connected to Plasma', color: '#10B981' };
      case 'wrong-network': return { text: '❌ Wrong network', color: '#EF4444' };
      case 'wallet-not-connected': return { text: '🔗 Connect wallet', color: '#F59E0B' };
      case 'no-wallet': return { text: '🦊 Install MetaMask', color: '#6B7280' };
      case 'error': return { text: '⚠️ Connection error', color: '#EF4444' };
      default: return { text: '📡 Loading...', color: '#6B7280' };
    }
  };

  const getStepDisplay = () => {
    switch (currentStep) {
      case 'approve': return '💰 Approving USDT...';
      case 'create': return '📝 Creating task...';
      case 'success': return '🎉 Task created!';
      default: return null;
    }
  };

  const networkDisplay = getNetworkStatusDisplay();

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '30px',
        borderRadius: '20px',
        marginBottom: '30px',
        textAlign: 'center',
        color: 'white'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', fontWeight: 'bold' }}>
          ✏️ Post a New Task
        </h1>
        <p style={{ margin: '0 0 15px 0', fontSize: '1.1rem', opacity: 0.9 }}>
          Create a task and find the perfect freelancer for your project
        </p>
        
        {/* Connection Status */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          padding: '10px 20px', 
          borderRadius: '25px',
          display: 'inline-block',
          marginBottom: userAddress ? '10px' : '0'
        }}>
          <span style={{ color: networkDisplay.color }}>●</span> {networkDisplay.text}
        </div>
        
        {/* Wallet Info */}
        {userAddress && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: '8px 16px', 
              borderRadius: '20px',
              display: 'inline-block',
              fontSize: '0.9rem',
              marginRight: '10px'
            }}>
              🔗 {userAddress.slice(0,6)}...{userAddress.slice(-4)}
            </div>
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: '8px 16px', 
              borderRadius: '20px',
              display: 'inline-block',
              fontSize: '0.9rem'
            }}>
              💰 {parseFloat(usdtBalance).toFixed(2)} USDT
            </div>
          </div>
        )}
      </div>

      {/* Connection Actions */}
      {networkStatus === 'wallet-not-connected' && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '2px solid #0ea5e9',
          borderRadius: '15px',
          padding: '25px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#0369a1', margin: '0 0 15px 0' }}>🦊 Connect Your Wallet</h3>
          <p style={{ color: '#0369a1', margin: '0 0 20px 0' }}>
            Connect your MetaMask wallet to post tasks on the blockchain
          </p>
          <button 
            onClick={connectWallet}
            style={{
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔗 Connect Wallet
          </button>
        </div>
      )}

      {networkStatus === 'wrong-network' && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '15px',
          padding: '25px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#dc2626', margin: '0 0 15px 0' }}>❌ Wrong Network</h3>
          <p style={{ color: '#dc2626', margin: '0 0 20px 0' }}>
            Please switch to Plasma testnet (Chain ID: 9746) to post tasks
          </p>
          <button 
            onClick={switchToPlasmaNetwork}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔄 Switch Network
          </button>
        </div>
      )}

      {networkStatus === 'no-wallet' && (
        <div style={{
          backgroundColor: '#fefce8',
          border: '2px solid #fbbf24',
          borderRadius: '15px',
          padding: '25px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#d97706', margin: '0 0 15px 0' }}>🦊 MetaMask Required</h3>
          <p style={{ color: '#d97706', margin: '0 0 20px 0' }}>
            Please install MetaMask browser extension to post tasks on the blockchain
          </p>
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#fbbf24',
              color: 'white',
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'inline-block'
            }}
          >
            📥 Install MetaMask
          </a>
        </div>
      )}

      {/* Task Creation Form */}
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        opacity: networkStatus === 'connected' ? 1 : 0.7,
        pointerEvents: networkStatus === 'connected' ? 'auto' : 'none'
      }}>
        {/* Progress Indicator */}
        {isSubmitting && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #0ea5e9',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#0369a1', margin: '0 0 10px 0' }}>
              {getStepDisplay()}
            </h3>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: currentStep === 'approve' ? '33%' : currentStep === 'create' ? '66%' : '100%',
                height: '100%',
                backgroundColor: '#0ea5e9',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            color: '#374151',
            fontSize: '1rem'
          }}>
            📝 Task Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a clear, descriptive title for your task"
            required
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              transition: 'border-color 0.3s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            color: '#374151',
            fontSize: '1rem'
          }}>
            📄 Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide detailed information about the task, requirements, and expectations"
            required
            rows="6"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              resize: 'vertical',
              transition: 'border-color 0.3s ease',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          marginBottom: '25px' 
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#374151',
              fontSize: '1rem'
            }}>
              💰 Reward (USDT) *
            </label>
            <input
              type="number"
              name="reward"
              value={formData.reward}
              onChange={handleChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              max={usdtBalance}
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            {userAddress && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#6b7280', 
                margin: '5px 0 0 0' 
              }}>
                Balance: {parseFloat(usdtBalance).toFixed(2)} USDT
              </p>
            )}
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#374151',
              fontSize: '1rem'
            }}>
              ⏰ Deadline *
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)} // At least 1 hour from now
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <p style={{ 
              fontSize: '0.8rem', 
              color: '#6b7280', 
              margin: '5px 0 0 0' 
            }}>
              Minimum: 1 hour from now • Maximum: 30 days
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            color: '#374151',
            fontSize: '1rem'
          }}>
            🛠️ Required Skills
          </label>
          <input
            type="text"
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="e.g., React, Node.js, Solidity (comma separated)"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              transition: 'border-color 0.3s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <p style={{ 
            fontSize: '0.9rem', 
            color: '#6b7280', 
            margin: '5px 0 0 0' 
          }}>
            Separate multiple skills with commas (optional)
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || networkStatus !== 'connected'}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: isSubmitting ? '#9ca3af' : (networkStatus === 'connected' ? '#667eea' : '#d1d5db'),
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: isSubmitting || networkStatus !== 'connected' ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => {
            if (!e.target.disabled) {
              e.target.style.backgroundColor = '#5a67d8';
              e.target.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.target.disabled) {
              e.target.style.backgroundColor = '#667eea';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          {isSubmitting ? '⏳ Creating Task...' : 
           networkStatus === 'connected' ? '⛓️ Create Task on Blockchain' : 
           '🔗 Connect Wallet to Post Task'}
        </button>

        {/* Info Box */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.9rem', 
            color: '#0369a1',
            textAlign: 'center'
          }}>
            💡 <strong>Blockchain Task Creation:</strong> Your task will be stored on the Plasma blockchain with escrow protection. 
            The reward amount will be held in the smart contract until task completion.
          </p>
        </div>
      </form>
    </div>
  );
};

export default PostTaskForm;