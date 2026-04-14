"use client";

import { useState, useEffect, useRef } from "react";
import AppHeader from "@/components/AppHeader";

export default function LandingHeader() {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<unknown>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-reconnect on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum?.selectedAddress) {
      connectWallet(true);
    }
  }, []);

  async function connectWallet(silent = false) {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      if (!silent) await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 133) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x85" }] });
        } catch (e: unknown) {
          if ((e as { code: number }).code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x85",
                chainName: "HashKey Chain Testnet",
                nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
                rpcUrls: ["https://testnet.hsk.xyz"],
                blockExplorerUrls: ["https://testnet-explorer.hsk.xyz"],
              }],
            });
          }
        }
      }

      const updated = new ethers.BrowserProvider(window.ethereum);
      const s = await updated.getSigner();
      const addr = await s.getAddress();
      setSigner(s);
      setAddress(addr);
      window.ethereum.on("accountsChanged", () => location.reload());
      window.ethereum.on("chainChanged", () => location.reload());
    } catch { /* silent */ }
  }

  function disconnect() { setAddress(null); setSigner(null); }

  return (
    <AppHeader
      address={address}
      onConnect={() => connectWallet(false)}
      onDisconnect={disconnect}
    />
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: () => void) => void;
      selectedAddress?: string;
    };
  }
}
