"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal, AlertCircle, Package, Settings, Zap, Copy, Check, ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface LineType {
  type: "comment" | "cmd" | "output" | "success" | "code" | "break";
  text?: string;
}

interface Step {
  id: string;
  label: string;
  icon: ReactNode;
  title: string;
  description: string;
  lines: LineType[];
}

const STEPS: Step[] = [
  {
    id: "prerequisites",
    label: "Prerequisites",
    icon: <AlertCircle size={15} />,
    title: "System Requirements",
    description: "Node.js v18+, MetaMask, and some testnet HSK from the faucet.",
    lines: [
      { type: "comment", text: "# Check Node.js version (v18+ required)" },
      { type: "cmd",     text: "node --version" },
      { type: "output",  text: "v20.10.0" },
      { type: "comment", text: "# Set up environment variables" },
      { type: "cmd",     text: "export HASHKEY_RPC_URL=https://testnet.hsk.xyz" },
      { type: "cmd",     text: "export GROQ_API_KEY=your_groq_key" },
      { type: "cmd",     text: "export PRIVATE_KEY=0xYOUR_PRIVATE_KEY" },
      { type: "success", text: "✔ Environment configured" },
    ],
  },
  {
    id: "install",
    label: "Installation",
    icon: <Package size={15} />,
    title: "Install Dependencies",
    description: "Install the project and agent dependencies.",
    lines: [
      { type: "comment", text: "# Clone and install" },
      { type: "cmd",     text: "git clone https://github.com/anbusan19/hashclaw" },
      { type: "cmd",     text: "cd hashclaw && pnpm install" },
      { type: "output",  text: "..." },
      { type: "output",  text: "added 312 packages in 8s" },
      { type: "success", text: "✔ Dependencies installed" },
    ],
  },
  {
    id: "deploy",
    label: "Deploy Contracts",
    icon: <Settings size={15} />,
    title: "Deploy to HashKey Testnet",
    description: "Deploy TreasuryVault, RebalanceExecutor, and YieldOracle to HashKey Chain testnet.",
    lines: [
      { type: "comment", text: "# Compile and deploy all contracts" },
      { type: "cmd",     text: "pnpm run deploy" },
      { type: "output",  text: "> TreasuryVault deployed: 0xA744..." },
      { type: "output",  text: "> RebalanceExecutor: 0x305c..." },
      { type: "output",  text: "> YieldOracle deployed: 0x5a1B..." },
      { type: "success", text: "✔ Contracts live on testnet" },
    ],
  },
  {
    id: "run",
    label: "Run Agent",
    icon: <Zap size={15} />,
    title: "Start the AI Agent",
    description: "Launch the background agent loop — it polls yields, checks drift, and rebalances automatically.",
    lines: [
      { type: "comment", text: "# Start the autonomous agent" },
      { type: "cmd",     text: "pnpm run agent" },
      { type: "output",  text: "HashClaw agent starting." },
      { type: "output",  text: "  Poll interval:      300s" },
      { type: "output",  text: "  Rebalance cooldown: 1 min" },
      { type: "output",  text: "  Drift threshold:    5%" },
      { type: "output",  text: "[agent] tick — 2025-04-15T10:00:00Z" },
      { type: "success", text: "✔ Agent running" },
    ],
  },
];

// ── Terminal window shell ─────────────────────────────────────────────────────
interface TerminalWindowProps { title: string; children: ReactNode; className?: string }
const TerminalWindow = ({ title, children, className = "" }: TerminalWindowProps) => (
  <div className={`bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#1e1e1e] font-mono text-sm shadow-2xl ${className}`}>
    <div className="bg-[#111] px-4 py-2 flex items-center justify-between border-b border-[#1e1e1e]">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
      </div>
      <div className="text-[#444] text-[0.6rem] font-mono uppercase tracking-widest flex items-center gap-1.5">
        <Terminal size={10} />
        {title}
      </div>
      <div className="w-12" />
    </div>
    <div className="p-6 h-full overflow-y-auto">
      {children}
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const SetupGuide = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<LineType[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDisplayedLines([]);
    setIsTyping(true);
    let lineIndex = 0;
    const step = STEPS[activeStep];

    const interval = setInterval(() => {
      if (lineIndex < step.lines.length) {
        const next = step.lines[lineIndex];
        if (next) setDisplayedLines((prev) => [...prev, next]);
        lineIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 180);

    return () => clearInterval(interval);
  }, [activeStep]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen bg-[#0a0a0a] py-24 overflow-hidden font-inter">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="w-full px-6 md:px-12 lg:px-24 relative z-10">
        <div className="mb-16">
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">Setup Guide</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-light leading-tight mb-4 text-white tracking-tight">
            Get started with <span className="text-[#555]">HashClaw</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-[#555] text-base leading-relaxed max-w-xl font-light">
            Deploy the contracts, seed the oracle, and have the agent running in minutes.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Step nav */}
          <div className="lg:col-span-4 flex flex-col gap-2 h-[440px]">
            {STEPS.map((step, idx) => (
              <motion.button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className={`flex-1 text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                  activeStep === idx ? "bg-white/[0.03] border-[#2a2a2a]" : "bg-transparent border-[#1e1e1e] hover:bg-white/[0.02]"
                }`}
              >
                {activeStep === idx && (
                  <motion.div layoutId="activeStep" className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
                )}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-[0.6rem] px-2 py-0.5 rounded border ${activeStep === idx ? "bg-white/10 text-white border-[#2a2a2a]" : "bg-transparent text-[#444] border-[#1e1e1e]"}`}>
                      0{idx + 1}
                    </span>
                    <span className={`font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${activeStep === idx ? "text-white" : "text-[#555]"}`}>
                      {step.label}
                    </span>
                  </div>
                  {activeStep === idx && <ChevronRight size={14} className="text-[#555]" />}
                </div>
                <p className="font-mono text-[0.55rem] text-[#333] pl-9 line-clamp-1">{step.description}</p>
              </motion.button>
            ))}
          </div>

          {/* Terminal */}
          <div className="lg:col-span-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="relative h-[440px]">
              <TerminalWindow title={`bash — ${STEPS[activeStep]?.id ?? "terminal"}`} className="h-full">
                <div className="space-y-2">
                  {displayedLines.map((line, i) =>
                    line ? (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="leading-relaxed">
                        {line.type === "comment" && <span className="text-[#444] italic text-xs">{line.text}</span>}
                        {line.type === "cmd" && (
                          <div className="flex gap-2 text-white group items-center">
                            <span className="text-[#555] select-none">$</span>
                            <span className="flex-1 text-[#aaa] text-xs">{line.text}</span>
                            <button onClick={() => handleCopy(line.text ?? "")} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded">
                              {copied ? <Check size={12} className="text-white" /> : <Copy size={12} className="text-[#555]" />}
                            </button>
                          </div>
                        )}
                        {line.type === "output"  && <span className="text-[#444] text-xs block pl-3 border-l border-[#1e1e1e]">{line.text}</span>}
                        {line.type === "success" && <span className="text-white text-xs block font-mono">{line.text}</span>}
                        {line.type === "code"    && <span className="text-[#aaa] text-xs block pl-2">{line.text}</span>}
                        {line.type === "break"   && <br />}
                      </motion.div>
                    ) : null
                  )}
                  {isTyping && <div className="inline-block w-1.5 h-4 bg-white animate-pulse align-middle ml-1" />}
                  {!isTyping && displayedLines.length > 0 && (
                    <div className="flex gap-2 mt-4 items-center">
                      <span className="text-[#555]">$</span>
                      <span className="w-1.5 h-4 bg-white/30 animate-pulse" />
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SetupGuide;
