// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { defineChain } from 'viem';

import App from './App';
import './index.css';

// Define Plasma Testnet chain
export const plasmaTestnet = defineChain({
  id: 9746,
  name: 'Plasma Testnet',
  nativeCurrency: {
    name: 'Plasma',
    symbol: 'XPL',
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.plasma.to'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PlasmaScan',
      url: 'https://testnet.plasmascan.to/',
    },
  },
  testnet: true,
});

// Web3Modal configuration
const projectId = "9d0d0f43db3a3457f67c9c1f811cb791";

const metadata = {
  name: 'PlasmaTasks',
  description: 'Decentralized microtask platform on Plasma',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const chains = [plasmaTestnet];

// Create wagmi config
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

// Create the modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
});

// Create query client for React Query
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);