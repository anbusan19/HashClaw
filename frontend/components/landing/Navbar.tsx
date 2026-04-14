"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] lg:w-[calc(100%-6rem)] border border-white/10 bg-black/60 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/40">
      <div className="px-6 h-14 flex items-center justify-between relative">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image src="/hashclaw-logo.png" alt="HashClaw" width={22} height={22} />
          <span className="font-mono text-sm uppercase tracking-[0.14em] text-white">HashClaw</span>
        </div>

        {/* Centre nav */}
        <div className="hidden md:flex items-center gap-8 text-sm text-[#666] absolute left-1/2 -translate-x-1/2">
          <a href="#how-it-works" className="font-mono text-[0.6rem] uppercase tracking-widest hover:text-white transition-colors">How it works</a>
          <a href="#architecture"  className="font-mono text-[0.6rem] uppercase tracking-widest hover:text-white transition-colors">Architecture</a>
          <a href="#faq"           className="font-mono text-[0.6rem] uppercase tracking-widest hover:text-white transition-colors">FAQ</a>
        </div>

        {/* Right CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-[#555]">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
            Testnet
          </span>
          <Link
            href="/app"
            className="font-mono text-[0.6rem] uppercase tracking-[0.12em] px-4 py-1.5 rounded border border-white text-white hover:bg-white hover:text-black transition-all"
          >
            Launch App
          </Link>
        </div>

        <div className="md:hidden text-white">
          <Menu className="w-5 h-5" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
