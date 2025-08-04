// src/App.jsx
import React from 'react';
import { useAccount } from 'wagmi';
import PostTaskForm from './components/PostTaskForm';
import TaskList from './components/TaskList';

function App() {
  const { address, isConnected } = useAccount();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🚀 PlasmaTasks - Decentralized Freelance Platform</h1>

      {/* Connection Status */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <p><strong>Status:</strong> {isConnected ? `✅ Connected: ${address?.slice(0,6)}...${address?.slice(-4)}` : '❌ Not Connected'}</p>
        <w3m-button />
      </div>

      {/* Show platform only when connected */}
      {isConnected ? (
        <div>
          <PostTaskForm />
          <TaskList />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h2>🌟 Welcome to PlasmaTasks</h2>
          <p>The first gasless freelance platform on Plasma testnet!</p>
          <p><strong>Connect your wallet to start posting or accepting tasks.</strong></p>
          
          <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
            <h3>🎯 How it works:</h3>
            <div style={{ textAlign: 'left', display: 'inline-block' }}>
              <p>📝 <strong>Post Tasks:</strong> Lock USDT in secure escrow</p>
              <p>✋ <strong>Accept Tasks:</strong> Claim available work</p>
              <p>📤 <strong>Submit Work:</strong> Provide proof of completion</p>
              <p>✅ <strong>Get Paid:</strong> Automatic payment on approval</p>
              <p>💰 <strong>Platform Fee:</strong> Only 2.5% on completion</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;