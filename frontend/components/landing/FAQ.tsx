"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const faqs = [
  {
    question: "What is HashClaw?",
    answer: "HashClaw is an autonomous AI-driven RWA portfolio manager on HashKey Chain. It monitors your on-chain balances, detects allocation drift, and executes AI-optimised rebalances — all non-custodially.",
  },
  {
    question: "How does the rebalancing work?",
    answer: "The agent checks portfolio drift every 5 minutes. When any asset deviates more than 5% from its target weight, it calls Groq's Llama-3.3-70b to compute optimal swap legs. You then sign the transaction with MetaMask — nothing executes without your signature.",
  },
  {
    question: "What assets are managed?",
    answer: "Four HashKey Chain RWA assets: xXAG (RWA Silver, 40% target), xMMF (Money Market Fund, 30%), veHSK (Staked HSK, 22%), and USDC-USDT LP (8%). Target weights are enforced by the drift threshold.",
  },
  {
    question: "Is it non-custodial?",
    answer: "Yes. TreasuryVault holds accounting records, not your tokens. The RebalanceExecutor requires either your own wallet signature or the background agent's wallet for the deployer address. No one else can move your funds.",
  },
  {
    question: "What is the background agent?",
    answer: "A TypeScript process that runs server-side, polls yield signals, checks drift, and submits rebalances for the deployer wallet automatically. Other users get an AI-computed plan in the chat and sign it manually with MetaMask.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-black border-t border-[#1e1e1e] font-inter">
      <div className="w-full px-6 md:px-12 lg:px-24 grid md:grid-cols-3 gap-12">

        {/* Left heading */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">FAQ</span>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-light leading-tight mb-6 text-white tracking-tight"
          >
            Frequently<br />asked<br />questions
          </motion.h2>
          <Link
            href="/app"
            className="inline-block font-mono text-[0.6rem] uppercase tracking-[0.12em] px-5 py-2.5 rounded bg-white text-black hover:opacity-85 transition-opacity"
          >
            Launch App
          </Link>
        </motion.div>

        {/* Right accordion */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="md:col-span-2 space-y-0"
        >
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="border-b border-[#1e1e1e]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex justify-between items-center text-left py-5 hover:text-white transition-colors group text-[#888]"
              >
                <span className="text-base font-light text-white pr-4">{faq.question}</span>
                <span className="text-[#444] group-hover:text-white transition-colors shrink-0">
                  {openIndex === idx ? <Minus size={16} /> : <Plus size={16} />}
                </span>
              </button>
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="font-light text-[#666] text-sm leading-relaxed pb-5 pr-8">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default FAQ;
