import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

function WalletConnect() {
  const [account, setAccount] = useState("");

  async function connectWallet() {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
    } else {
      alert("Install MetaMask to connect your wallet");
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => setAccount(accounts[0]));
    }
  }, []);

  return (
    <div>
      {account ? (
        <p>✅ Connected: {account}</p>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
    </div>
  );
}

export default WalletConnect;
