"use client";

import { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";

interface Leg {
  fromSymbol: string;
  toSymbol: string;
  amount: string;
  txHash: string;
}

interface Plan {
  planId: number;
  user: string;
  reasoning: string;
  txHash: string;
  blockNumber: number;
  timestamp: number | null;
  legsExecuted: number;
  legs: Leg[];
}

interface LogsResponse {
  logs: Plan[];
  explorerUrl: string;
  error?: string;
}

function formatTs(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function LogsPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [logs, setLogs] = useState<Plan[]>([]);
  const [explorerUrl, setExplorerUrl] = useState("https://testnet-explorer.hsk.xyz");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "" }>({ msg: "", type: "" });

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
      const updated = new ethers.BrowserProvider(window.ethereum);
      const s = await updated.getSigner();
      const addr = await s.getAddress();
      setAddress(addr);
      if (!silent) showToast("Connected: " + shortAddr(addr), "ok");
      window.ethereum.on("accountsChanged", () => location.reload());
      window.ethereum.on("chainChanged", () => location.reload());
    } catch (e: unknown) {
      if (!silent) showToast((e as Error).message?.slice(0, 80) ?? "Connection failed", "err");
    }
  }

  function disconnect() { setAddress(null); }

  // Auto-reconnect
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum?.selectedAddress) {
      connectWallet(true);
    }
  }, []);

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data: LogsResponse) => {
        if (data.error) { setError(data.error); }
        else {
          setLogs(data.logs);
          if (data.explorerUrl) setExplorerUrl(data.explorerUrl);
          // Auto-expand the most recent entry
          if (data.logs.length > 0) setExpanded(new Set([data.logs[0].planId]));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(planId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(planId) ? next.delete(planId) : next.add(planId);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      <AppHeader address={address} onConnect={() => connectWallet(false)} onDisconnect={disconnect} />

      <main className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">

        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-mono text-xs uppercase tracking-[0.18em] text-white font-semibold">
              Agent Rebalance Log
            </h1>
            <p className="font-mono text-2xs uppercase tracking-widest text-muted mt-1">
              On-chain history — HashKey Testnet
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); setError(null); fetch("/api/logs").then(r => r.json()).then((d: LogsResponse) => { setLogs(d.logs); if (d.explorerUrl) setExplorerUrl(d.explorerUrl); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            className="font-mono text-2xs uppercase tracking-[0.12em] px-3 py-1.5 rounded border border-border text-muted hover:border-white hover:text-white transition-all"
          >
            Refresh
          </button>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center gap-2 text-muted font-mono text-2xs uppercase tracking-widest py-12 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60 animate-pulse" />
            Fetching on-chain events…
          </div>
        )}

        {!loading && error && (
          <div className="font-mono text-2xs uppercase tracking-wider text-red-400 border border-red-500/20 rounded-lg px-4 py-3 bg-red-500/5">
            Error: {error}
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-16">
            <p className="font-mono text-2xs uppercase tracking-widest text-muted">No rebalance events found</p>
            <p className="font-mono text-2xs uppercase tracking-widest text-muted/50 mt-1">
              Run the agent to generate on-chain events
            </p>
          </div>
        )}

        {/* Log entries */}
        {!loading && !error && logs.length > 0 && (
          <div className="flex flex-col gap-3">
            {logs.map((plan) => {
              const isOpen = expanded.has(plan.planId);
              return (
                <div
                  key={plan.planId}
                  className="border border-border rounded-lg bg-surface overflow-hidden"
                >
                  {/* Header row */}
                  <button
                    onClick={() => toggleExpand(plan.planId)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {/* Plan ID badge */}
                    <span className="font-mono text-2xs uppercase tracking-widest text-muted border border-border rounded px-2 py-0.5 shrink-0">
                      #{plan.planId}
                    </span>

                    {/* Timestamp */}
                    <span className="font-mono text-2xs uppercase tracking-wider text-muted shrink-0">
                      {formatTs(plan.timestamp)}
                    </span>

                    {/* User */}
                    <span className="font-mono text-2xs uppercase tracking-wider text-muted/60 shrink-0">
                      {shortAddr(plan.user)}
                    </span>

                    {/* Legs pill */}
                    <span className="font-mono text-2xs uppercase tracking-widest text-white/70 shrink-0">
                      {plan.legsExecuted} swap{plan.legsExecuted !== 1 ? "s" : ""}
                    </span>

                    {/* Reasoning preview */}
                    <span className="font-mono text-2xs text-muted truncate flex-1 min-w-0">
                      {plan.reasoning}
                    </span>

                    {/* Chevron */}
                    <svg
                      className={`w-3 h-3 text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                    >
                      <path d="M2 4l4 4 4-4" />
                    </svg>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="border-t border-border px-4 py-4 flex flex-col gap-4">

                      {/* AI Reasoning */}
                      <div>
                        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted mb-2">
                          AI Reasoning
                        </p>
                        <p className="font-mono text-xs text-white/80 leading-relaxed">
                          {plan.reasoning}
                        </p>
                      </div>

                      {/* Swap legs */}
                      {plan.legs.length > 0 && (
                        <div>
                          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted mb-2">
                            Swaps Executed
                          </p>
                          <div className="flex flex-col gap-2">
                            {plan.legs.map((leg, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-3 bg-surface-2 rounded px-3 py-2"
                              >
                                {/* From → To */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="font-mono text-2xs uppercase tracking-widest text-white">
                                    {leg.fromSymbol}
                                  </span>
                                  <svg className="w-3 h-3 text-muted shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M2 6h8M7 3l3 3-3 3" />
                                  </svg>
                                  <span className="font-mono text-2xs uppercase tracking-widest text-white">
                                    {leg.toSymbol}
                                  </span>
                                </div>

                                {/* Amount */}
                                <span className="font-mono text-2xs text-muted shrink-0">
                                  {parseFloat(leg.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </span>

                                {/* Tx link */}
                                <a
                                  href={`${explorerUrl}/tx/${leg.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-2xs uppercase tracking-widest text-muted hover:text-white transition-colors shrink-0 flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Tx
                                  <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M5 2H2v8h8V7M7 2h3v3M10 2L5.5 6.5" />
                                  </svg>
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer links */}
                      <div className="flex items-center gap-4 pt-1">
                        <a
                          href={`${explorerUrl}/tx/${plan.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-2xs uppercase tracking-[0.12em] text-muted hover:text-white transition-colors flex items-center gap-1.5"
                        >
                          View queue tx on explorer
                          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M5 2H2v8h8V7M7 2h3v3M10 2L5.5 6.5" />
                          </svg>
                        </a>
                        <span className="text-border">·</span>
                        <span className="font-mono text-2xs uppercase tracking-widest text-muted/40">
                          Block #{plan.blockNumber}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

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

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: () => void) => void;
      selectedAddress?: string;
    };
  }
}
