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
  title: "HashClaw — AI Wealth Manager",
  description: "Autonomous on-chain portfolio management on HashKey Chain",
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
