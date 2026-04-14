"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const TABS = [
  { label: "Install", num: "1" },
  { label: "Deploy",  num: "2" },
  { label: "Rebalance", num: "3" },
];

const CODE = [
  // Install
  <>
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">git clone https://github.com/anbusan19/hashclaw</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">cd hashclaw</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">pnpm install</span><br /><br />
    <span className="text-[#555]"># Set env vars</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">cp .env.example .env</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">export HASHKEY_RPC_URL=https://testnet.hsk.xyz</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">export GROQ_API_KEY=your_groq_key</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">export PRIVATE_KEY=0xYOUR_KEY</span><br /><br />
    <span className="text-white">✔ Dependencies installed</span>
  </>,
  // Deploy
  <>
    <span className="text-[#555]"># Compile and deploy all contracts</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">pnpm run deploy</span><br /><br />
    <span className="text-[#444] pl-3 border-l border-[#1e1e1e] block">{"> TreasuryVault deployed:    0xA744..."}</span>
    <span className="text-[#444] pl-3 border-l border-[#1e1e1e] block">{"> RebalanceExecutor:         0x305c..."}</span>
    <span className="text-[#444] pl-3 border-l border-[#1e1e1e] block">{"> YieldOracle deployed:      0x5a1B..."}</span>
    <br />
    <span className="text-[#555]"># Update contract addresses in .env</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">VAULT_ADDRESS=0xA744...</span><br />
    <span className="text-[#555]">$</span> <span className="text-[#aaa]">EXECUTOR_ADDRESS=0x305c...</span><br /><br />
    <span className="text-white">✔ Contracts live on HashKey testnet</span>
  </>,
  // Rebalance
  <>
    <span className="text-[#555]">import</span> <span className="text-[#aaa]">{"{ ethers }"}</span> <span className="text-[#555]">from</span> <span className="text-[#777]">'ethers'</span>;<br /><br />
    <span className="text-[#555]">// Connect to HashKey Chain</span><br />
    <span className="text-[#555]">const</span> <span className="text-[#aaa]">provider</span> = <span className="text-[#555]">new</span> <span className="text-white">ethers.JsonRpcProvider</span>(<br />
    &nbsp;&nbsp;<span className="text-[#777]">'https://testnet.hsk.xyz'</span><br />
    );<br /><br />
    <span className="text-[#555]">// Fetch portfolio from vault</span><br />
    <span className="text-[#555]">const</span> [assetIds, balances] =<br />
    &nbsp;&nbsp;<span className="text-[#555]">await</span> <span className="text-[#aaa]">vault</span>.<span className="text-white">getPortfolio</span>(<span className="text-[#aaa]">userAddress</span>);<br /><br />
    <span className="text-[#555]">// AI rebalance</span><br />
    <span className="text-[#555]">const</span> <span className="text-[#aaa]">tx</span> = <span className="text-[#555]">await</span> <span className="text-[#aaa]">executor</span>.<span className="text-white">submitAndExecute</span>(<br />
    &nbsp;&nbsp;<span className="text-[#aaa]">userAddress</span>, fromIds, toIds, amounts, minOuts, reasoning<br />
    );<br />
    <span className="text-[#555]">await</span> <span className="text-[#aaa]">tx</span>.<span className="text-white">wait</span>();
  </>,
];

const GettingStarted = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="py-20 bg-[#0a0a0a] font-inter">
      <div className="w-full px-6 md:px-12 lg:px-24">

        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">Quick start</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-light tracking-tight mb-8 text-white">
            Running in<br />minutes
          </h2>

          {/* Tabs */}
          <div className="flex gap-8 font-mono text-[0.6rem] uppercase tracking-widest border-b border-[#1e1e1e] pb-0">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 pb-3 border-b-2 transition-all -mb-px ${
                  activeTab === i
                    ? "border-white text-white"
                    : "border-transparent text-[#555] hover:text-[#888]"
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[0.5rem] font-mono transition-colors ${
                  activeTab === i ? "bg-white text-black" : "border border-[#2a2a2a]"
                }`}>
                  {tab.num}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Code editor */}
          <motion.div
            className="md:col-span-2 rounded-xl overflow-hidden min-h-[360px] border border-[#1e1e1e] bg-[#0d0d0d]"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="bg-[#111] p-3 border-b border-[#1e1e1e] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="mx-auto font-mono text-[0.55rem] uppercase tracking-widest text-[#444]">
                {activeTab === 0 ? "terminal" : activeTab === 1 ? "deploy.sh" : "rebalance.ts"}
              </div>
            </div>
            <div className="p-8 font-mono text-xs leading-relaxed text-[#888] overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {CODE[activeTab]}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Side panel */}
          <motion.div
            className="rounded-xl p-6 border border-[#1e1e1e] bg-[#0d0d0d] flex flex-col justify-between"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <div>
              <h3 className="text-base font-light text-white mb-3">Installation</h3>
              <div className="bg-black/60 p-3 rounded-lg font-mono text-xs border border-[#1e1e1e] mb-6 text-[#888]">
                <span className="text-[#555] select-none">$</span> pnpm install
              </div>

              <h3 className="text-base font-light text-white mb-3">Networks</h3>
              <div className="space-y-2">
                {[
                  { name: "HashKey Testnet", active: true },
                  { name: "HashKey Mainnet", active: false },
                ].map((n) => (
                  <div key={n.name} className="bg-white/[0.03] p-2.5 rounded border border-[#1e1e1e] flex justify-between items-center">
                    <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#666]">{n.name}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${n.active ? "bg-white animate-pulse" : "bg-[#333]"}`} />
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/app"
              className="w-full font-mono text-[0.6rem] uppercase tracking-[0.12em] py-3 rounded bg-white text-black hover:opacity-85 transition-opacity text-center mt-6 block"
            >
              Launch App
            </Link>
          </motion.div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="p-8 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
            <h3 className="text-lg font-light text-white mb-2">AI-Optimised Rebalancing</h3>
            <p className="text-[#555] text-sm font-light mb-4">Groq&apos;s Llama-3.3-70b weighs live APYs against target allocations. A safety guard ensures every leg reduces drift — never increases it.</p>
            <div className="flex gap-2">
              <span className="font-mono text-[0.55rem] uppercase tracking-widest bg-white/5 border border-[#1e1e1e] text-[#666] px-2 py-1 rounded">Groq</span>
              <span className="font-mono text-[0.55rem] uppercase tracking-widest bg-white/5 border border-[#1e1e1e] text-[#666] px-2 py-1 rounded">Llama-3.3-70b</span>
            </div>
          </div>
          <div className="p-8 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]">
            <h3 className="text-lg font-light text-white mb-2">On-Chain Audit Trail</h3>
            <p className="text-[#555] text-sm font-light mb-4">Every rebalance plan is recorded on-chain via PlanSubmitted events. The Agent Logs page lets anyone verify the full history with explorer links.</p>
            <div className="font-mono text-[0.6rem] bg-black/60 p-3 rounded border border-[#1e1e1e]">
              <div className="text-white mb-1">✓ PlanSubmitted emitted</div>
              <div className="text-white mb-1">✓ Reasoning stored on-chain</div>
              <div className="text-[#555]">Verifiable on HashKey Explorer</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default GettingStarted;
