"use client";

import { motion } from "framer-motion";

const TrustedBy = () => (
  <section className="py-20 border-b border-[#1e1e1e] bg-black relative z-20 font-inter">
    <div className="w-full px-6 md:px-12 lg:px-24 relative z-10">

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-center gap-2 mb-6"
      >
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">About</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-4xl md:text-6xl font-light leading-tight mb-8 text-white tracking-tight"
      >
        AI-managed RWA portfolios <span className="text-[#555]">on HashKey Chain</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="text-lg md:text-xl text-[#555] leading-relaxed mb-16 max-w-3xl font-light"
      >
        HashClaw is a non-custodial autonomous wealth manager built for HashKey Chain's RWA ecosystem.
        It combines real-time yield oracle data with Groq AI to keep your portfolio at optimal allocations —
        without you lifting a finger.
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1e1e1e]"
      >
        {[
          { value: "4",     label: "Managed Assets" },
          { value: "5%",    label: "Drift Threshold" },
          { value: "12.4%", label: "Peak APY (veHSK)" },
          { value: "60s",   label: "Min Cooldown" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-black px-6 py-8 flex flex-col gap-2">
            <span className="font-mono text-2xl text-white">{value}</span>
            <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#444]">{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default TrustedBy;
