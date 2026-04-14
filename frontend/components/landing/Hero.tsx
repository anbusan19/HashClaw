"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import PixelPlanet from "./PixelPlanet";


const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-black font-inter">

      {/* Globe — centered, fills background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="w-[680px] h-[680px] opacity-30">
          <PixelPlanet color="#ffffff" />
        </div>
      </div>

      {/* Radial black vignette so edges stay dark */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_30%,black_80%)] pointer-events-none" />

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 md:px-12 pt-28 pb-20">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6 max-w-4xl"
        >
          {/* Badge */}
          <span className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-widest text-[#555] border border-[#1e1e1e] rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
            HashKey Chain · RWA Portfolio Manager
          </span>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-light leading-[1.06] tracking-[-0.025em] text-white">
            Autonomous wealth<br />
            management,{" "}
            <span className="text-[#3a3a3a]">on-chain.</span>
          </h1>

          {/* Subline */}
          <p className="text-[#555] text-base md:text-lg leading-relaxed font-light max-w-xl">
            HashClaw monitors your RWA portfolio around the clock and rebalances when drift exceeds threshold — using live yield signals and AI-optimised swap legs.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/app"
              className="font-mono text-[0.65rem] uppercase tracking-[0.14em] px-6 py-3 rounded bg-white text-black hover:opacity-80 transition-opacity"
            >
              Launch App
            </Link>
            <Link
              href="/logs"
              className="font-mono text-[0.65rem] uppercase tracking-[0.14em] px-6 py-3 rounded border border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-white transition-all"
            >
              View Agent Logs
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
