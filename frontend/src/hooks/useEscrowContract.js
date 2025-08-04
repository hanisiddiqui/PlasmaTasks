import { useWriteContract, useReadContract } from 'wagmi';
import { escrowAbi } from '../contracts/escrowAbi';

const contractAddress = '0xYOUR_DEPLOYED_ESCROW_ADDRESS'; // 👈 Replace

export function usePostTask() {
  return useWriteContract({
    address: contractAddress,
    abi: escrowAbi,
    functionName: 'postTask',
  });
}

export function useGetAllTasks() {
  return useReadContract({
    address: contractAddress,
    abi: escrowAbi,
    functionName: 'getAllTasks',
  });
}
