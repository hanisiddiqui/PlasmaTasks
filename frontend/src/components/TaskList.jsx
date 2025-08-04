import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const ESCROW_ADDRESS = "0xf6a5C743d21277291938e28a618f7E43DEA6262C";
  
  const ESCROW_ABI = [
    "function getTask(uint256 taskId) view returns (tuple(uint256 id, string title, uint256 reward, uint256 deadline, address creator, address worker, string description, uint8 status, uint256 createdAt, uint256 completedAt, uint256 rating))",
    "function taskCounter() view returns (uint256)"
  ];

  useEffect(() => {
    loadTasks();
    
    const interval = setInterval(() => {
      loadTasks();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      console.log('📡 Loading tasks from blockchain...');
      setLoading(true);
      
      // Get user address
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
        if (accounts.length > 0) {
          setUserAddress(accounts[0]);
        }
      }
      
      // Use MetaMask provider if available, otherwise direct RPC
      let provider;
      if (typeof window.ethereum !== 'undefined') {
        try {
          provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          if (Number(network.chainId) !== 9746) {
            throw new Error('Wrong network');
          }
        } catch {
          provider = new ethers.JsonRpcProvider('https://testnet-rpc.plasma.to');
        }
      } else {
        provider = new ethers.JsonRpcProvider('https://testnet-rpc.plasma.to');
      }
      
      const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
      
      const taskCounter = await contract.taskCounter();
      const totalTasks = Number(taskCounter);
      console.log('📊 Total tasks:', totalTasks);
      
      const loadedTasks = [];
      const currentTime = Date.now();
      
      for (let i = 0; i < totalTasks; i++) {
        try {
          const taskData = await contract.getTask(i);
          
          // Parse the combined details string
          const rawDetails = taskData[1];
          const { title, description, skills } = parseDetails(rawDetails);
          
          // Handle deadline - stored as milliseconds
          const deadlineMs = Number(taskData[3]);
          const deadlineDate = new Date(deadlineMs);
          const isExpired = currentTime > deadlineMs;
          
          // Debug log for each task
          console.log(`Task ${i}: "${title}" - Deadline: ${deadlineDate.toLocaleString()} - Expired: ${isExpired}`);
          
          const task = {
            id: Number(taskData[0]),
            title: title,
            description: description,
            reward: ethers.formatUnits(taskData[2], 6),
            deadline: deadlineDate,
            creator: taskData[4],
            worker: taskData[5],
            status: getStatusText(Number(taskData[7])),
            currency: "USDT",
            requiredSkills: skills.length > 0 ? skills : ['General'],
            difficulty: "Intermediate",
            clientAddress: taskData[4].slice(0, 6) + "..." + taskData[4].slice(-4),
            isBlockchainTask: true,
            isOwnTask: userAddress && taskData[4].toLowerCase() === userAddress.toLowerCase(),
            isExpired: isExpired,
            rawDeadline: deadlineMs,
            blockchainIndex: i
          };
          
          loadedTasks.push(task);
          
        } catch (taskError) {
          console.log(`⚠️ Could not load task ${i}`);
        }
      }
      
      // Sort by creation order (newest first)
      loadedTasks.sort((a, b) => b.id - a.id);
      
      setTasks(loadedTasks);
      setError(null);
      setLastUpdate(Date.now());
      
      console.log(`✅ Loaded ${loadedTasks.length} tasks`);
      
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      setError('Connection failed: ' + error.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const parseDetails = (detailsString) => {
    if (!detailsString) {
      return { title: 'Untitled', description: 'No description', skills: [] };
    }
    
    let title = '';
    let description = '';
    let skills = [];
    
    // Parse the "Title: ... Description: ... Skills: ..." format
    if (detailsString.includes('Title:')) {
      const lines = detailsString.split('\n').filter(line => line.trim());
      
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('Title:')) {
          title = line.replace('Title:', '').trim();
        } else if (line.startsWith('Description:')) {
          description = line.replace('Description:', '').trim();
        } else if (line.startsWith('Skills:')) {
          const skillsText = line.replace('Skills:', '').trim();
          if (skillsText && skillsText !== 'Not specified') {
            skills = skillsText.split(',').map(s => s.trim()).filter(s => s);
          }
        }
      }
    } else {
      // Simple format - use as title
      title = detailsString.length > 50 ? detailsString.slice(0, 50) + '...' : detailsString;
      description = detailsString;
    }
    
    // Infer skills if none provided
    if (skills.length === 0) {
      const content = (title + ' ' + description).toLowerCase();
      if (content.includes('react')) skills.push('React');
      if (content.includes('node')) skills.push('Node.js');
      if (content.includes('solana')) skills.push('Solana');
      if (content.includes('frontend')) skills.push('Frontend');
      if (skills.length === 0) skills.push('General');
    }
    
    return { title, description, skills };
  };

  const getStatusText = (statusCode) => {
    switch (statusCode) {
      case 0: return 'open';
      case 1: return 'assigned';
      case 2: return 'submitted';
      case 3: return 'completed';
      case 4: return 'disputed';
      default: return 'unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#10B981';
      case 'assigned': return '#F59E0B';
      case 'submitted': return '#3B82F6';
      case 'completed': return '#6B7280';
      case 'disputed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return '#10B981';
      case 'Intermediate': return '#F59E0B';
      case 'Expert': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatDeadline = (deadline, isExpired) => {
    if (isExpired) return "Expired";
    
    const now = new Date();
    const diffTime = deadline - now;
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return "Due very soon";
    if (diffHours < 24) return `${diffHours} hours left`;
    if (diffDays === 1) return "Due tomorrow";
    return `${diffDays} days left`;
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh');
    loadTasks();
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>
          📡 Loading blockchain tasks...
        </div>
      </div>
    );
  }

  const availableTasks = tasks.filter(t => !t.isExpired && t.status === 'open');
  const totalRewards = tasks.reduce((sum, task) => sum + parseFloat(task.reward), 0);

  return (
    <div style={{ 
      maxWidth: '1200px', 
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
          🚀 Plasma Task Marketplace
        </h1>
        <p style={{ margin: '0 0 15px 0', fontSize: '1.1rem', opacity: 0.9 }}>
          Decentralized task management powered by blockchain technology
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            padding: '10px 20px', 
            borderRadius: '25px'
          }}>
            ⛓️ {tasks.length} Blockchain Tasks
          </div>
          
          <button 
            onClick={handleRefresh}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.5)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          padding: '20px',
          borderRadius: '15px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>📋 Total Tasks</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasks.length}</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          padding: '20px',
          borderRadius: '15px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>⏳ Available</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{availableTasks.length}</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          padding: '20px',
          borderRadius: '15px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>💰 Total Rewards</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalRewards.toFixed(0)} USDT</div>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <h2 style={{ 
          marginBottom: '25px', 
          color: '#1f2937',
          fontSize: '1.8rem',
          borderBottom: '3px solid #667eea',
          paddingBottom: '10px'
        }}>
          🎯 Your Tasks
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px'
        }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '15px',
                padding: '25px',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                border: '2px solid #10B981',
                position: 'relative'
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '15px',
                backgroundColor: task.isExpired ? '#EF4444' : task.isOwnTask ? '#F59E0B' : '#10B981',
                color: 'white',
                padding: '5px 12px',
                borderRadius: '15px',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                {task.isExpired ? '⏰ Expired' : task.isOwnTask ? '👤 Your Task' : '⛓️ Available'}
              </div>

              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  flex: 1
                }}>
                  {task.title}
                </h3>
                <span style={{
                  backgroundColor: getStatusColor(task.status),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  marginLeft: '10px'
                }}>
                  {task.status}
                </span>
              </div>

              {/* Description */}
              <p style={{
                color: '#6b7280',
                lineHeight: '1.6',
                marginBottom: '20px',
                fontSize: '0.95rem'
              }}>
                {task.description}
              </p>

              {/* Reward */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <div style={{
                  backgroundColor: '#10B981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '25px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  💰 {task.reward} USDT
                </div>
                <span style={{
                  backgroundColor: getDifficultyColor(task.difficulty),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {task.difficulty}
                </span>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold', 
                  color: '#374151',
                  marginBottom: '8px' 
                }}>
                  🛠️ Skills:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {task.requiredSkills.map((skill, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Deadline */}
              <div style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '15px',
                marginBottom: '15px'
              }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: task.isExpired ? '#EF4444' : '#374151',
                  fontWeight: 'bold'
                }}>
                  ⏰ {formatDeadline(task.deadline, task.isExpired)}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#6b7280',
                  marginTop: '5px'
                }}>
                  {task.deadline.toLocaleString()}
                </div>
              </div>

              {/* Debug Info */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#64748b',
                fontFamily: 'monospace'
              }}>
                <div>Task #{task.blockchainIndex} • Created: {task.deadline.toLocaleString()}</div>
                <div>Contract: {ESCROW_ADDRESS.slice(0, 20)}...</div>
                {task.isOwnTask && <div style={{ color: '#F59E0B', fontWeight: 'bold' }}>👤 You created this task</div>}
              </div>
            </div>
          ))}
        </div>
        
        {tasks.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
            <p>No tasks found. Try refreshing or create a new task!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;