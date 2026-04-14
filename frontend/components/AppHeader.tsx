"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function AppHeader({ address, onConnect, onDisconnect }: Props) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/app",   label: "Dashboard" },
    { href: "/logs",  label: "Agent Logs" },
  ];

  return (
    <header className="h-14 flex items-center px-5 gap-4 border-b border-border bg-surface flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-2">
        <Image src="/hashclaw-logo.png" alt="HashClaw" width={26} height={26} />
        <span className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-white">
          HashClaw
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-1">
        {navLinks.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`font-mono text-2xs uppercase tracking-[0.12em] px-3 py-1.5 rounded transition-all ${
                active
                  ? "text-white bg-white/10 border border-border-2"
                  : "text-muted hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Testnet badge */}
      <span className="font-mono text-2xs uppercase tracking-widest text-muted flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60 animate-pulse" />
        Testnet
      </span>

      {/* Faucet */}
      <a
        href="https://faucet.hashkeychain.net/faucet"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-2xs uppercase tracking-[0.12em] px-3 py-1.5 rounded border border-border text-muted hover:border-white hover:text-white transition-all flex items-center gap-1.5"
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 1v4M4 3l2-2 2 2M3 6c0 2 1 4 3 4s3-2 3-4H3z" />
        </svg>
        Faucet
      </a>

      {/* Wallet */}
      <div className="ml-auto flex items-center gap-3">
        {address && (
          <span className="font-mono text-2xs uppercase tracking-wider text-muted">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
        )}
        <button
          onClick={() => (address ? onDisconnect() : onConnect())}
          className={`font-mono text-2xs uppercase tracking-[0.12em] px-3 py-1.5 rounded border transition-all ${
            address
              ? "border-white text-white hover:bg-white hover:text-black"
              : "border-border text-muted hover:border-white hover:text-white"
          }`}
        >
          {address ? "Disconnect" : "Connect Wallet"}
        </button>
      </div>
    </header>
  );
}
