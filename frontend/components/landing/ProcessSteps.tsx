"use client";

import { motion } from "framer-motion";
import { Globe, Zap, Check, Database } from "lucide-react";

const ProcessSteps = () => (
  <section className="py-24 relative overflow-hidden bg-black font-inter">
    <div className="w-full px-6 md:px-12 lg:px-24 flex flex-col gap-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">Process</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-light leading-tight tracking-tight text-white">
          How it works,<br />
          <span className="text-[#333]">step by step.</span>
        </h2>
        <p className="text-[#555] text-base font-light leading-relaxed max-w-lg">
          From deposit to on-chain settlement — everything runs autonomously with your signature as the only gate.
        </p>
      </motion.div>

      {/* Step 1 */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
          <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#444] mb-4 block">01.</span>
          <h2 className="text-4xl md:text-5xl font-light leading-tight mb-6 tracking-tight">
            Connect wallet,<br />deposit assets
          </h2>
          <p className="text-[#666] text-base font-light leading-relaxed">
            Connect MetaMask on HashKey Chain. Deposit RWA tokens into TreasuryVault. The contract records your per-asset allocations on-chain with no custody risk.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, delay: 0.2 }} className="border border-[#1e1e1e] rounded-xl p-6 bg-[#0a0a0a]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[#444] mb-1">TreasuryVault</div>
              <div className="text-lg font-light flex items-center gap-2 text-white">
                <Globe size={16} className="text-[#888]" />
                Deposit confirmed
              </div>
            </div>
            <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[#444]">HashKey Testnet</div>
          </div>
          <div className="bg-black/60 p-4 rounded-lg font-mono text-xs text-[#888] leading-relaxed border border-[#1e1e1e]">
            <span className="text-[#555]">{"{"}</span><br />
            &nbsp;&nbsp;<span className="text-[#aaa]">"user"</span>: <span className="text-[#777]">"0x1234…abcd"</span>,<br />
            &nbsp;&nbsp;<span className="text-[#aaa]">"assetId"</span>: <span className="text-white">0</span>,<br />
            &nbsp;&nbsp;<span className="text-[#aaa]">"amount"</span>: <span className="text-white">"100.0000"</span><br />
            <span className="text-[#555]">{"}"}</span>
          </div>
          <div className="mt-3 flex gap-2 font-mono text-[0.55rem] uppercase tracking-widest">
            <span className="bg-white/5 border border-[#1e1e1e] text-[#888] px-2 py-1 rounded">Vault credited</span>
            <span className="bg-white/5 border border-[#1e1e1e] text-[#555] px-2 py-1 rounded">Non-custodial</span>
          </div>
        </motion.div>
      </div>

      {/* Step 2 */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, delay: 0.2 }} className="order-2 md:order-1 border border-[#1e1e1e] rounded-xl p-6 bg-[#0a0a0a]">
          <div className="grid gap-3">
            <div className="border border-[#2a2a2a] p-3 rounded-lg bg-black/40">
              <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[#555] mb-1">YieldOracle</div>
              <div className="text-sm font-light text-white mb-1">Live APY signals</div>
              <div className="font-mono text-[0.55rem] text-[#444]">getAllApys() → [480, 520, 1240, 310] bps</div>
            </div>
            <div className="flex justify-center">
              <div className="h-4 w-px bg-[#1e1e1e]" />
            </div>
            <div className="border border-[#2a2a2a] p-3 rounded-lg bg-black/40">
              <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[#555] mb-1">Drift engine</div>
              <div className="text-sm font-light text-white mb-1">Max drift detected</div>
              <div className="mt-2 flex gap-2">
                <div className="bg-white/5 border border-[#1e1e1e] rounded p-1">
                  <Zap size={10} className="text-[#888]" />
                </div>
                <div className="font-mono text-[0.55rem] text-[#444]">8.2% > 5% threshold → trigger</div>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }} className="order-1 md:order-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#444] mb-4 block">02.</span>
          <h2 className="text-4xl md:text-5xl font-light leading-tight mb-6 tracking-tight">
            AI detects<br />portfolio drift
          </h2>
          <p className="text-[#666] text-base font-light leading-relaxed">
            Every 5 minutes the agent reads live APYs from YieldOracle and compares actual vs target weights. When drift exceeds 5%, Groq AI computes optimal swap legs.
          </p>
        </motion.div>
      </div>

      {/* Step 3 */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
          <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#444] mb-4 block">03.</span>
          <h2 className="text-4xl md:text-5xl font-light leading-tight mb-6 tracking-tight">
            Sign once,<br />settled on-chain
          </h2>
          <p className="text-[#666] text-base font-light leading-relaxed">
            The AI plan is presented in chat. You sign with MetaMask — RebalanceExecutor settles each swap leg and emits a PlanSubmitted event for full auditability.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, delay: 0.2 }} className="border border-[#1e1e1e] rounded-xl overflow-hidden bg-[#0a0a0a]">
          <div className="bg-black/80 p-2 flex items-center justify-between border-b border-[#1e1e1e]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </div>
            <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[#444]">RebalanceExecutor</div>
          </div>
          <div className="p-5 font-mono text-xs text-[#888]">
            <div className="text-[#555] mb-2"># Plan confirmed</div>
            <div className="text-[#aaa]">planId: <span className="text-white">42</span></div>
            <div className="text-[#aaa]">legs: <span className="text-white">2</span></div>
            <div className="text-[#aaa] mt-2">xXAG → xMMF: <span className="text-white">12.4%</span></div>
            <div className="text-[#aaa]">veHSK → LP: <span className="text-white">3.1%</span></div>
            <br />
            <div className="flex items-center gap-2 text-white">
              <Check size={12} />
              <span>TX_CONFIRMED · Block #26499823</span>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  </section>
);

export default ProcessSteps;
