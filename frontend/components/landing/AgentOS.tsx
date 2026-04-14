"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const AgentOS = () => (
  <section className="py-32 flex flex-col items-center justify-center text-center bg-black relative overflow-hidden font-inter">
    {/* Subtle radial glow */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-[600px] h-[300px] bg-white/[0.03] blur-[100px] rounded-full" />
    </div>

    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative z-10 flex flex-col items-center gap-6 px-6"
    >
      <h2 className="text-5xl md:text-8xl font-light leading-[1.05] tracking-[-0.02em] text-white">
        Rebalance smarter.<br />
        <span className="text-[#444]">Own your yield.</span>
      </h2>
      <p className="text-[#666] text-lg font-light max-w-xl">
        RWA assets. Live APY signals. AI-optimised legs. Non-custodial execution.
      </p>
      <Link
        href="/app"
        className="font-mono text-[0.65rem] uppercase tracking-[0.14em] px-6 py-3 rounded bg-white text-black hover:opacity-85 transition-opacity mt-2"
      >
        Launch App
      </Link>
    </motion.div>
  </section>
);

export default AgentOS;
