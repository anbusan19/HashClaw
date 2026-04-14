"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, FileCode, Folder, ChevronRight, Lock, Unlock, Zap, ArrowRight } from "lucide-react";
import { ReactNode } from "react";

const steps = [
  {
    id: 1,
    title: "Connect & Deposit",
    description: "Connect your MetaMask wallet on HashKey Chain. Deposit assets into TreasuryVault to begin automated portfolio management under target allocations.",
    code: `import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const vault = new ethers.Contract(
  VAULT_ADDRESS,
  VAULT_ABI,
  signer
);

// Deposit xXAG into vault
const tx = await vault.deposit(
  0,                              // assetId: xXAG
  ethers.parseEther("100")        // amount
);
await tx.wait();
console.log('Deposited into TreasuryVault');`,
    fileName: "deposit.ts",
    icon: <Lock size={18} className="text-white" />,
    panel: (
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0a0a0a] flex items-center justify-between">
        <div>
          <div className="font-mono text-[0.5rem] uppercase tracking-widest text-[#444] mb-1">TreasuryVault</div>
          <div className="font-mono text-[0.6rem] text-[#aaa]">assetId: <span className="text-white">0</span> · amount: <span className="text-white">100.0000</span></div>
        </div>
        <span className="font-mono text-[0.5rem] uppercase tracking-widest text-[#555] border border-[#1e1e1e] px-2 py-1 rounded">Vault credited</span>
      </div>
    ),
  },
  {
    id: 2,
    title: "AI Monitors Drift",
    description: "The agent polls live APY signals from YieldOracle every 5 minutes. When any asset drifts more than 5% from its target weight, a rebalance is triggered.",
    code: `// Target weights: xXAG 40%, xMMF 30%, veHSK 22%, LP 8%
const TARGET_WEIGHTS = { 0: 0.40, 1: 0.30, 2: 0.22, 3: 0.08 };

function maxDrift(portfolio) {
  const total = portfolio.reduce(
    (s, b) => s + b.amount, 0n
  );
  if (total === 0n) return 0;

  let max = 0;
  for (const b of portfolio) {
    const actual = Number(b.amount) / Number(total);
    const target = TARGET_WEIGHTS[b.assetId] ?? 0;
    const drift = Math.abs(actual - target);
    if (drift > max) max = drift;
  }
  return max; // e.g. 0.08 = 8% drift
}`,
    fileName: "drift.ts",
    icon: <Zap size={18} className="text-white" />,
    panel: (
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0a0a0a] flex items-center justify-between">
        <div>
          <div className="font-mono text-[0.5rem] uppercase tracking-widest text-[#444] mb-1">YieldOracle · Drift Engine</div>
          <div className="font-mono text-[0.6rem] text-[#aaa]">apys: <span className="text-white">[480, 520, 1240, 310] bps</span> · drift: <span className="text-white">8.2%</span></div>
        </div>
        <span className="font-mono text-[0.5rem] uppercase tracking-widest text-[#555] border border-[#1e1e1e] px-2 py-1 rounded">Triggered</span>
      </div>
    ),
  },
  {
    id: 3,
    title: "Groq Decides Optimal Legs",
    description: "Llama-3.3-70b analyses your risk profile and live APYs to compute optimal swap fractions. A safety guard filters any leg that would move assets further from target.",
    code: `const completion = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt   },
  ],
  temperature: 0.2,
  max_tokens: 512,
});

// Safety guard: only sell over-weight, buy under-weight
const safeLegs = parsed.legs.filter((leg) => {
  const fromPct = Number(from.amount) / Number(total);
  const toPct   = Number(to.amount)   / Number(total);
  return fromPct > TARGET_WEIGHTS[leg.fromAssetId]
      && toPct   < TARGET_WEIGHTS[leg.toAssetId];
});`,
    fileName: "groqAdvisor.ts",
    icon: <ArrowRight size={18} className="text-white" />,
    panel: (
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0a0a0a] flex items-center justify-between">
        <div>
          <div className="font-mono text-[0.5rem] uppercase tracking-widest text-[#444] mb-1">Groq · llama-3.3-70b</div>
          <div className="font-mono text-[0.6rem] text-[#aaa]">xXAG → xMMF: <span className="text-white">12.4%</span> · veHSK → LP: <span className="text-white">3.1%</span></div>
        </div>
        <span className="font-mono text-[0.5rem] uppercase tracking-widest text-[#555] border border-[#1e1e1e] px-2 py-1 rounded">2 legs</span>
      </div>
    ),
  },
  {
    id: 4,
    title: "Sign & Execute On-Chain",
    description: "You sign the rebalance plan with MetaMask. RebalanceExecutor settles the swaps on HashKey Chain and records every plan on-chain for full auditability.",
    code: `const executor = new ethers.Contract(
  EXECUTOR_ADDRESS,
  EXECUTOR_ABI,
  signer
);

const tx = await executor.submitAndExecute(
  userAddress,
  fromAssetIds,   // [0, 2]
  toAssetIds,     // [1, 3]
  amounts,        // raw token amounts
  minAmountsOut,  // 0.5% slippage
  aiReasoning     // stored on-chain
);

const receipt = await tx.wait();
// Tx confirmed — PlanSubmitted event emitted`,
    fileName: "execute.ts",
    icon: <Unlock size={18} className="text-white" />,
    panel: (
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0a0a0a] flex items-center justify-between">
        <div>
          <div className="font-mono text-[0.5rem] uppercase tracking-widest text-[#444] mb-1">RebalanceExecutor · planId 42</div>
          <div className="font-mono text-[0.6rem] text-[#aaa] flex items-center gap-1.5"><Check size={10} className="text-white" /><span className="text-white">TX_CONFIRMED</span> · Block #26499823</div>
        </div>
        <span className="font-mono text-[0.5rem] uppercase tracking-widest text-[#555] border border-[#1e1e1e] px-2 py-1 rounded">On-chain</span>
      </div>
    ),
  },
];

// ── Code Editor ───────────────────────────────────────────────────────────────
interface CodeEditorProps { code: string; fileName: string; stepTitle: string }

const CodeEditor = ({ code, fileName, stepTitle }: CodeEditorProps) => {
  const [copied, setCopied] = useState(false);

  const fileTree = [
    { name: "agent",  type: "folder" as const, expanded: true, children: [{ name: fileName, active: true }] },
    { name: "contracts", type: "folder" as const, expanded: false, children: [] },
    { name: "package.json", type: "file" as const },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl w-full"
    >
      {/* Window header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-[#1e1e1e]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={stepTitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]"
          >
            {stepTitle}
          </motion.div>
        </AnimatePresence>
        <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded transition-colors">
          {copied ? <Check size={12} className="text-white" /> : <Copy size={12} className="text-[#555]" />}
        </button>
      </div>

      <div className="flex h-[520px]">
        {/* File tree sidebar */}
        <div className="w-44 bg-[#0d0d0d] border-r border-[#1e1e1e] p-3 hidden sm:block">
          <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[#444] mb-3 px-2">Explorer</div>
          <div className="space-y-1 text-[0.65rem]">
            {fileTree.map((item, idx) => (
              <div key={idx}>
                {item.type === "folder" ? (
                  <>
                    <div className="flex items-center gap-1 px-2 py-1 text-[#555]">
                      <ChevronRight size={10} className={item.expanded ? "rotate-90" : ""} />
                      <Folder size={10} />
                      <span className="font-mono">{item.name}</span>
                    </div>
                    {item.expanded && item.children.map((child, ci) => (
                      <div
                        key={ci}
                        className={`flex items-center gap-1 px-2 py-1 ml-3 rounded font-mono ${
                          child.active ? "bg-white/5 text-white" : "text-[#444]"
                        }`}
                      >
                        <FileCode size={10} />
                        <span>{child.name}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 text-[#444] font-mono">
                    <FileCode size={10} />
                    <span>{item.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Code area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center bg-[#111] border-b border-[#1e1e1e] px-2">
            <div className="px-3 py-2 bg-[#0a0a0a] border-t border-white/10 font-mono text-[0.6rem] text-white flex items-center gap-1.5">
              <FileCode size={10} className="text-[#888]" />
              {fileName}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-[#0a0a0a]">
            <AnimatePresence mode="wait">
              <motion.div
                key={fileName}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {code.split("\n").map((line, idx) => (
                  <div key={idx} className="flex hover:bg-white/[0.02] transition-colors">
                    <span className="text-[#333] select-none mr-4 w-7 text-right font-mono text-[11px] pt-0.5 shrink-0">{idx + 1}</span>
                    <span className="flex-1 font-mono text-[12px] text-[#aaa] whitespace-pre leading-relaxed">{line || " "}</span>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(1);
  const isScrollingRef = useRef(false);
  const totalSteps = steps.length;

  useEffect(() => { stepRef.current = activeStep; }, [activeStep]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      if (Math.abs(rect.top) > 50) return;
      if (isScrollingRef.current) { e.preventDefault(); return; }

      const direction = e.deltaY > 0 ? 1 : -1;
      const current = stepRef.current;

      if (direction === 1 && current < totalSteps) {
        e.preventDefault();
        isScrollingRef.current = true;
        stepRef.current = current + 1;
        setActiveStep(current + 1);
        setTimeout(() => { isScrollingRef.current = false; }, 800);
      } else if (direction === -1 && current > 1) {
        e.preventDefault();
        isScrollingRef.current = true;
        stepRef.current = current - 1;
        setActiveStep(current - 1);
        setTimeout(() => { isScrollingRef.current = false; }, 800);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [totalSteps]);

  const activeData = steps.find((s) => s.id === activeStep) ?? steps[0];

  return (
    <div ref={containerRef} id="how-it-works" className="relative min-h-screen bg-black py-20">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="h-full overflow-hidden flex items-center">
        <div className="w-full px-6 md:px-12 lg:px-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-stretch">

            {/* Left panel */}
            <div className="flex flex-col justify-between py-8">
              <div className="flex flex-col gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">How it works</span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-6xl font-light font-inter leading-tight text-white tracking-tight"
                >
                  AI rebalancing <span className="text-[#555]">for RWA portfolios</span>
                </motion.h2>

                <div className="min-h-[72px]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={activeStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="text-[#666] text-base leading-relaxed font-light"
                    >
                      {activeData.description}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Context panel — per step mock data */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeData.panel as ReactNode}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Step nav */}
              <div className="flex flex-col pt-10">
                <div className="flex gap-1.5 mb-6">
                  {steps.map((s) => (
                    <motion.div
                      key={s.id}
                      animate={{ backgroundColor: activeStep === s.id ? "#ffffff" : "#2a2a2a", scale: activeStep === s.id ? 1.2 : 1 }}
                      transition={{ duration: 0.3 }}
                      className="w-2 h-2 rounded-full"
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  {steps.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => { stepRef.current = s.id; setActiveStep(s.id); }}
                      className={`flex items-center gap-2 cursor-pointer transition-colors ${activeStep === s.id ? "text-white" : "text-[#444]"}`}
                    >
                      <span className="font-mono text-[0.6rem] w-5">{String(s.id).padStart(2, "0")}</span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-wider">{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right panel — code editor */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative flex items-center"
            >
              <CodeEditor code={activeData.code} fileName={activeData.fileName} stepTitle={activeData.title} />
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
