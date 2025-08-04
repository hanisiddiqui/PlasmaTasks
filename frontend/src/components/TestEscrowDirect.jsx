// Test component to check if escrow contract exists
import React, { useState } from 'react';
import { useReadContract } from 'wagmi';
import escrowAbi from './abi/Escrow.json';

const escrowAddress = "0x46aF9b59d1086F2b0ed52503a0d70e94d5422c5A";

export default function TestEscrowDirect() {
  // Test reading from the escrow contract
  const { data: usdtFromContract, error: readError, isLoading } = useReadContract({
    address: escrowAddress,
    abi: escrowAbi,
    functionName: 'usdt',
  });

  const { data: allTasks, error: tasksError } = useReadContract({
    address: escrowAddress,
    abi: escrowAbi,
    functionName: 'getAllTasks',
  });

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>🔍 Contract Debugging</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Escrow Contract:</strong> {escrowAddress}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>USDT Address from Contract:</strong><br/>
        {isLoading ? (
          <span>Loading...</span>
        ) : readError ? (
          <span style={{ color: 'red' }}>❌ Error: {readError.message}</span>
        ) : (
          <span style={{ color: 'green' }}>✅ {usdtFromContract}</span>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Current Tasks:</strong><br/>
        {tasksError ? (
          <span style={{ color: 'red' }}>❌ Error reading tasks: {tasksError.message}</span>
        ) : allTasks ? (
          <span style={{ color: 'green' }}>✅ Found {allTasks.length} tasks</span>
        ) : (
          <span>Loading tasks...</span>
        )}
      </div>

      <div style={{ padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
        <strong>Next Steps:</strong>
        <ol>
          <li>If USDT address shows ✅, the escrow contract is working</li>
          <li>Add that USDT address to your wallet to check your balance</li>
          <li>If you don't have USDT, we need to get some or deploy a mock</li>
        </ol>
      </div>
    </div>
  );
}