"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const NAV = [
  { label: "Home",         href: "/",               external: false },
  { label: "How it works", href: "#how-it-works",   external: false },
  { label: "Architecture", href: "#architecture",   external: false },
  { label: "FAQ",          href: "#faq",            external: false },
];

const APP = [
  { label: "Dashboard",      href: "/app",  external: false },
  { label: "Agent Logs",     href: "/logs", external: false },
  { label: "Testnet Faucet", href: "https://faucet.hashkeychain.net/faucet", external: true },
];

const RESOURCES = [
  { label: "Explorer",     href: "https://testnet-explorer.hsk.xyz", external: true },
  { label: "HashKey Docs", href: "https://docs.hsk.xyz",             external: true },
  { label: "GitHub",       href: "https://github.com/anbusan19",     external: true },
];

function NavList({ items }: { items: { label: string; href: string; external: boolean }[] }) {
  return (
    <ul className="space-y-3">
      {items.map(({ label, href, external }) =>
        external ? (
          <li key={label}>
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[0.65rem] uppercase tracking-wider text-[#444] hover:text-white transition-colors flex items-center gap-1.5 group">
              {label}
              <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 2H2v8h8V7M7 2h3v3M10 2L5.5 6.5" />
              </svg>
            </a>
          </li>
        ) : (
          <li key={label}>
            <Link href={href} className="font-mono text-[0.65rem] uppercase tracking-wider text-[#444] hover:text-white transition-colors">
              {label}
            </Link>
          </li>
        )
      )}
    </ul>
  );
}

const Footer = () => (
  <footer id="footer" className="relative bg-black text-white overflow-hidden font-inter">

    {/* ── CTA ───────────────────────────────────────────────────────────────── */}
    <div className="relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[260px] bg-white/[0.025] blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative z-10 flex flex-col items-center text-center gap-6 px-6 py-24 md:py-32"
      >
        <h2 className="text-5xl md:text-7xl font-light leading-[1.05] tracking-[-0.02em] text-white">
          Rebalance smarter.<br />
          <span className="text-[#333]">Own your yield.</span>
        </h2>
        <p className="text-[#555] text-base md:text-lg font-light max-w-md">
          RWA assets. Live APY signals. AI-optimised legs. Non-custodial execution.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/app"
            className="font-mono text-[0.65rem] uppercase tracking-[0.14em] px-6 py-3 rounded bg-white text-black hover:opacity-80 transition-opacity"
          >
            Launch App
          </Link>
          <a
            href="https://faucet.hashkeychain.net/faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[0.65rem] uppercase tracking-[0.14em] px-6 py-3 rounded border border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-white transition-all"
          >
            Get Testnet HSK
          </a>
        </div>
      </motion.div>
    </div>

    {/* ── Links grid ────────────────────────────────────────────────────────── */}
    <div className="w-full px-6 md:px-12 lg:px-20 pt-14 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8"
      >
        {/* Brand */}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <Image src="/hashclaw-logo.png" alt="HashClaw" width={18} height={18} className="opacity-60" />
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-white">HashClaw</span>
          </div>
          <p className="text-sm font-light text-[#3a3a3a] leading-relaxed max-w-[200px]">
            Autonomous AI-driven RWA portfolio management on HashKey Chain.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#2a2a2a]">Navigation</span>
          <NavList items={NAV} />
        </div>

        {/* App */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#2a2a2a]">App</span>
          <NavList items={APP} />
        </div>

        {/* Resources */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#2a2a2a]">Resources</span>
          <NavList items={RESOURCES} />
        </div>
      </motion.div>
    </div>

    {/* ── Bottom bar ────────────────────────────────────────────────────────── */}
    <div className="w-full px-6 md:px-12 lg:px-20 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
        <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#2a2a2a]">
          HashKey Chain Testnet
        </span>
      </div>
      <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#2a2a2a]">
        2026 HashClaw
      </span>
    </div>

  </footer>
);

export default Footer;
