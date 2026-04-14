"use client";

import { motion } from "framer-motion";
import { Server, Zap, Database, Share2, ArrowDown, Code, Wallet } from "lucide-react";
import { ReactNode } from "react";

// ── Sub-components ────────────────────────────────────────────────────────────

interface TerminalBlockProps { filename: string; children: ReactNode }
const TerminalBlock = ({ filename, children }: TerminalBlockProps) => (
  <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg overflow-hidden shadow-2xl w-full">
    <div className="bg-[#111] border-b border-[#1e1e1e] px-3 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Code size={10} className="text-[#555]" />
        <span className="text-[#555] font-mono text-[0.55rem] uppercase tracking-widest">{filename}</span>
      </div>
      <div className="flex gap-1.5 opacity-20">
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      </div>
    </div>
    <div className="p-3 font-mono text-[10px] md:text-xs text-[#888] space-y-1 leading-relaxed">
      {children}
    </div>
  </div>
);

interface LayerCardProps {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  delay: number;
  align?: "left" | "right";
}
const LayerCard = ({ number, title, subtitle, description, icon, children, delay, align = "left" }: LayerCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    className={`relative z-10 group md:w-[60%] ${align === "left" ? "md:mr-auto" : "md:ml-auto"}`}
  >
    <div className={`relative w-full border border-[#1e1e1e] rounded-xl p-5 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 overflow-hidden group-hover:border-[#2a2a2a] transition-colors duration-500 ${align === "right" ? "md:flex-row-reverse" : ""}`}>
      <div className={`flex-1 relative z-10 md:max-w-[45%] ${align === "right" ? "text-left md:text-right" : "text-left"}`}>
        <div className={`flex items-center gap-2 mb-3 ${align === "right" ? "md:justify-end" : ""}`}>
          <span className="text-3xl font-light text-white/10">{number}.</span>
          <div className="p-1.5 bg-white/5 rounded-lg border border-[#2a2a2a] text-white">
            {icon}
          </div>
        </div>
        <h3 className="text-lg font-light font-inter text-white tracking-tight mb-1">{title}</h3>
        <p className="font-mono text-[0.55rem] uppercase tracking-widest text-[#444] mb-3">{subtitle}</p>
        <p className="text-sm text-[#666] leading-relaxed font-light">{description}</p>
      </div>
      <div className={`w-full md:w-auto flex-1 relative z-10 flex ${align === "right" ? "md:justify-start" : "md:justify-end"}`}>
        {children}
      </div>
    </div>
  </motion.div>
);

const LShapedConnector = ({ fromSide, toSide }: { fromSide: "left" | "right"; toSide: "left" | "right" }) => {
  const isLeftToRight = fromSide === "left" && toSide === "right";
  const leftX = "3%";
  const rightX = "97%";
  return (
    <div className="h-12 md:h-24 w-full flex items-center relative py-2">
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
        <line x1={isLeftToRight ? leftX : rightX} y1="0%" x2={isLeftToRight ? leftX : rightX} y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={isLeftToRight ? leftX : rightX} y1="50%" x2={isLeftToRight ? rightX : leftX} y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={isLeftToRight ? rightX : leftX} y1="50%" x2={isLeftToRight ? rightX : leftX} y2="100%" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: isLeftToRight ? leftX : rightX }}>
        <div className="bg-black p-1.5 rounded-full border border-[#1e1e1e] text-[#444]">
          <ArrowDown size={10} />
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Architecture = () => (
  <section id="architecture" className="relative min-h-screen bg-black py-24 overflow-hidden font-inter">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

    <div className="w-full px-6 md:px-12 relative z-10">
      <div className="text-right mb-16 max-w-[1700px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center justify-end gap-2 mb-6">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">Architecture</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-light font-inter leading-tight mb-6 text-white tracking-tight">
          HashClaw <span className="text-[#555]">Architecture</span>
        </motion.h2>
      </div>

      <div className="max-w-[1400px] mx-auto flex flex-col gap-0 relative w-full">

        {/* Layer 1: Vault */}
        <LayerCard number="01" title="Treasury Vault" subtitle="User Portfolio Layer" description="Users deposit RWA assets into TreasuryVault. The contract tracks balances per assetId and exposes getPortfolio() for the agent to read live allocations without moving real tokens." icon={<Wallet size={18} />} delay={0.2} align="left">
          <div className="flex-1 w-full max-w-md">
            <TerminalBlock filename="TreasuryVault.sol">
              <p className="text-white">function getPortfolio(address user)</p>
              <p className="pl-4 text-[#888]">view returns (</p>
              <p className="pl-8 text-[#aaa]">uint256[] assetIds,</p>
              <p className="pl-8 text-[#aaa]">uint256[] balances,</p>
              <p className="pl-8 text-[#aaa]">string[]  symbols</p>
              <p className="pl-4 text-[#888]">)</p>
              <p className="text-white">{"{"}</p>
              <p className="pl-4 text-[#555]">// reads userBalances mapping</p>
              <p className="pl-4 text-[#aaa]">return _buildPortfolio(user);</p>
              <p className="text-white">{"}"}</p>
            </TerminalBlock>
          </div>
        </LayerCard>

        <LShapedConnector fromSide="left" toSide="right" />

        {/* Layer 2: YieldOracle */}
        <LayerCard number="02" title="Yield Oracle" subtitle="Signal Layer" description="YieldOracle stores live APY data for all 4 vault assets (in basis points). The owner seeds it after deployment; the agent and frontend read getAllApys() in every rebalance cycle." icon={<Database size={18} />} delay={0.3} align="right">
          <div className="flex-1 w-full flex flex-col items-center justify-center py-6 relative">
            <div className="relative z-10 flex items-center justify-center gap-8 text-center w-full">
              {[{ label: "xXAG", val: "4.8%" }, { label: "veHSK", val: "12.4%" }, { label: "xMMF", val: "5.2%" }].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-center">
                    <Zap size={16} className="text-[#888]" />
                  </div>
                  <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#444]">{item.label}</span>
                  <span className="font-mono text-xs text-white">{item.val}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#333]">On-Chain APY Registry</div>
          </div>
        </LayerCard>

        <LShapedConnector fromSide="right" toSide="left" />

        {/* Layer 3: Executor */}
        <LayerCard number="03" title="Rebalance Executor" subtitle="Execution Layer" description="RebalanceExecutor accepts signed swap legs from either the background agent or the user's own wallet. It calls debitBalance on the vault for each leg and emits PlanSubmitted for full on-chain auditability." icon={<Server size={18} />} delay={0.4} align="left">
          <div className="flex-1 w-full max-w-xs">
            <TerminalBlock filename="RebalanceExecutor.sol">
              <p className="text-[#555]">// multi-user: agent OR self</p>
              <p className="text-white">require(</p>
              <p className="pl-4 text-[#aaa]">msg.sender == user</p>
              <p className="pl-2 text-[#555]">|| msg.sender == owner(),</p>
              <p className="pl-4 text-[#555]">"Unauthorized"</p>
              <p className="text-white">);</p>
              <p className="mt-2 text-[#555]">// pure accounting swap</p>
              <p className="text-[#aaa]">vault.debitBalance(user, from, amt);</p>
              <p className="text-[#aaa]">vault.creditBalance(user, to, amt);</p>
              <p className="mt-2 text-[#555]">emit PlanSubmitted(planId, user);</p>
            </TerminalBlock>
          </div>
        </LayerCard>

      </div>
    </div>
  </section>
);

export default Architecture;
