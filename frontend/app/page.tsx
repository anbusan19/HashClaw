"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";

interface Config {
  chainId: number;
  contracts: { treasuryVault: string; rebalanceExecutor: string };
  tokens: Record<string, { address: string; symbol: string; assetId: number }>;
}

interface Toast { msg: string; type: "ok" | "err" | "" }

export default function Home() {
  const [config, setConfig] = useState<Config | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<unknown>(null);
  const [toast, setToast] = useState<Toast>({ msg: "", type: "" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetch("/api/config").then((r) => r.json()).then(setConfig); }, []);

  // Auto-reconnect
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    if (window.ethereum.selectedAddress) connectWallet(true);
  }, []);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ msg: "", type: "" }), 4000);
  }

  async function connectWallet(silent = false) {
    if (typeof window === "undefined" || !window.ethereum) {
      if (!silent) showToast("MetaMask not found. Install it to connect.", "err");
      return;
    }
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

      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const s = await updatedProvider.getSigner();
      const addr = await s.getAddress();
      setSigner(s);
      setAddress(addr);
      if (!silent) showToast("Connected: " + addr.slice(0, 6) + "…" + addr.slice(-4), "ok");

      window.ethereum.on("accountsChanged", () => location.reload());
      window.ethereum.on("chainChanged", () => location.reload());
    } catch (e: unknown) {
      if (!silent) showToast((e as Error).message?.slice(0, 80) ?? "Connection failed", "err");
    }
  }

  function disconnect() { setAddress(null); setSigner(null); }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">

      {/* Header */}
      <header className="h-14 flex items-center px-5 gap-4 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Image src="/hashclaw-logo.png" alt="HashClaw" width={28} height={28} />
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-white">HashClaw</span>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <span className="font-mono text-2xs uppercase tracking-widest text-muted flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60 animate-pulse" />
          Testnet
        </span>

        <div className="ml-auto flex items-center gap-3">
          {address && (
            <span className="font-mono text-2xs uppercase tracking-wider text-muted">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          )}
          <button
            onClick={() => (address ? disconnect() : connectWallet(false))}
            className={`font-mono text-2xs uppercase tracking-[0.12em] px-3 py-1.5 rounded border transition-all ${
              address
                ? "border-white text-white hover:bg-white hover:text-black"
                : "border-border text-muted hover:border-white hover:text-white"
            }`}
          >
            {address ? "Disconnect" : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar address={address} config={config} signer={signer} onToast={showToast} />
        <ChatPanel address={address} />
      </div>

      {/* Toast */}
      {toast.msg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 font-mono text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg border shadow-xl transition-all ${
            toast.type === "ok"
              ? "bg-surface border-white/30 text-white"
              : "bg-surface border-red-500/40 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// Extend Window for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: () => void) => void;
      selectedAddress?: string;
    };
  }
}
