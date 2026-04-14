import type { Metadata } from "next";
import { Geist_Mono, Manrope, Inter } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "HashClaw — Autonomous RWA Portfolio Rebalancer",
  description: "On-chain RWA portfolio management on HashKey Chain. AI-driven drift detection, yield-optimised swap execution, and non-custodial settlement via smart contracts.",
  keywords: ["RWA", "DeFi", "HashKey Chain", "portfolio rebalancing", "AI agent", "on-chain", "yield optimisation"],
  openGraph: {
    title: "HashClaw — Autonomous RWA Portfolio Rebalancer",
    description: "AI-driven drift detection and yield-optimised rebalancing for RWA portfolios on HashKey Chain.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistMono.variable} ${manrope.variable} ${inter.variable}`}>
      <body className="font-sans bg-black text-white">
        {children}
      </body>
    </html>
  );
}
