"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const AllocationChart = dynamic(() => import("./AllocationChart"), { ssr: false });
const YieldChart = dynamic(() => import("./YieldChart"), { ssr: false });

const SHADES = ["#e8e8e8", "#a8a8a8", "#686868", "#343434"];
const RISK_LABELS = ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"];

interface TokenConfig { address: string; symbol: string; assetId: number }
interface Config {
  contracts: { treasuryVault: string };
  tokens: Record<string, TokenConfig>;
}
interface Asset { assetId: number; symbol: string; balance: string }
interface Signal { symbol: string; currentApy: number; assetId: number }
interface Portfolio {
  riskProfile: number; riskLabel: string; totalValue: string; assets: Asset[];
}

interface Props {
  address: string | null;
  config: Config | null;
  signer: unknown;
  onToast: (msg: string, type?: "ok" | "err") => void;
}

const VAULT_ABI = [
  "function deposit(uint256 assetId, uint256 amount)",
  "function setRiskProfile(uint8 profile)",
];
const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export default function Sidebar({ address, config, signer, onToast }: Props) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [depositAmounts, setDepositAmounts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  async function loadData() {
    const [yields] = await Promise.all([
      fetch("/api/yields").then((r) => r.json()),
      address
        ? fetch(`/api/portfolio?address=${address}`)
            .then((r) => r.json())
            .then(setPortfolio)
            .catch(() => setPortfolio(null))
        : Promise.resolve(setPortfolio(null)),
    ]);
    setSignals(yields.signals ?? []);
  }

  useEffect(() => { loadData(); }, [address]);

  const totalValue = portfolio
    ? portfolio.assets.reduce((s, a) => s + parseFloat(a.balance), 0)
    : 0;

  const chartAssets = portfolio?.assets ?? [];

  async function setRisk(profile: number) {
    if (!signer || !config) { onToast("Connect wallet first", "err"); return; }
    setBusy(true);
    try {
      const ethers = (await import("ethers")).ethers;
      const vault = new ethers.Contract(config.contracts.treasuryVault, VAULT_ABI, signer as never);
      const tx = await vault.setRiskProfile(profile);
      onToast("Setting risk profile…", "ok");
      await tx.wait();
      onToast(`Risk profile → ${RISK_LABELS[profile]}`, "ok");
      await loadData();
    } catch (e) { onToast((e as Error).message.slice(0, 80), "err"); }
    setBusy(false);
  }

  async function mintAll() {
    if (!signer || !config || !address) { onToast("Connect wallet first", "err"); return; }
    setBusy(true);
    try {
      const ethers = (await import("ethers")).ethers;
      for (const token of Object.values(config.tokens)) {
        if (!token.address) continue;
        const contract = new ethers.Contract(token.address, ERC20_ABI, signer as never);
        const tx = await contract.mint(address, ethers.parseEther("1000"));
        onToast(`Minting ${token.symbol}…`, "ok");
        await tx.wait();
      }
      onToast("Minted 1,000 of each token!", "ok");
      await loadData();
    } catch (e) { onToast((e as Error).message.slice(0, 80), "err"); }
    setBusy(false);
  }

  async function depositAll() {
    if (!signer || !config || !address) { onToast("Connect wallet first", "err"); return; }
    setBusy(true);
    try {
      const ethers = (await import("ethers")).ethers;
      const vaultAddr = config.contracts.treasuryVault;
      const vault = new ethers.Contract(vaultAddr, VAULT_ABI, signer as never);
      let count = 0;
      for (const token of Object.values(config.tokens)) {
        const val = parseFloat(depositAmounts[token.assetId] ?? "");
        if (!val || val <= 0) continue;
        const amount = ethers.parseEther(String(val));
        const tc = new ethers.Contract(token.address, ERC20_ABI, signer as never);
        const allowance: bigint = await tc.allowance(address, vaultAddr);
        if (allowance < amount) {
          const atx = await tc.approve(vaultAddr, ethers.MaxUint256);
          onToast(`Approving ${token.symbol}…`, "ok");
          await atx.wait();
        }
        const tx = await vault.deposit(token.assetId, amount);
        onToast(`Depositing ${val} ${token.symbol}…`, "ok");
        await tx.wait();
        count++;
      }
      if (count > 0) {
        onToast("Deposit confirmed!", "ok");
        setDepositAmounts({});
        await loadData();
      } else {
        onToast("Enter an amount to deposit", "err");
      }
    } catch (e) { onToast((e as Error).message.slice(0, 80), "err"); }
    setBusy(false);
  }

  const rp = portfolio?.riskProfile ?? 0;

  return (
    <aside className="w-[300px] flex-shrink-0 bg-surface border-r border-border overflow-y-auto flex flex-col">

      {/* Portfolio header */}
      <div className="px-4 pt-5 pb-3 border-b border-border">
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-mono text-2xs uppercase tracking-[0.15em] text-muted">Portfolio</span>
          <button onClick={loadData} className="font-mono text-2xs uppercase tracking-wider text-muted hover:text-white transition-colors">↻ Refresh</button>
        </div>
        {address ? (
          <>
            <div className="font-mono text-2xl font-semibold text-white">{totalValue.toLocaleString("en", { maximumFractionDigits: 0 })}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted">Risk</span>
              <span className="font-mono text-2xs uppercase tracking-widest text-white border border-border-2 px-2 py-0.5 rounded">
                {portfolio?.riskLabel ?? "—"}
              </span>
            </div>
          </>
        ) : (
          <div className="font-mono text-xs text-muted uppercase tracking-wider mt-2">Connect wallet to view</div>
        )}
      </div>

      {/* Allocation chart */}
      <div className="px-4 pt-4">
        <AllocationChart assets={chartAssets} />
      </div>

      {/* Asset breakdown */}
      {chartAssets.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {chartAssets.map((a, i) => {
            const pct = totalValue > 0 ? ((parseFloat(a.balance) / totalValue) * 100).toFixed(1) : "0.0";
            return (
              <div key={a.assetId} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SHADES[i % 4] }} />
                <span className="font-mono text-xs uppercase text-muted-2 w-20 truncate">{a.symbol}</span>
                <div className="flex-1 h-px bg-border-2 relative overflow-hidden rounded">
                  <div className="absolute inset-y-0 left-0 bg-white rounded" style={{ width: `${pct}%`, opacity: 0.6 }} />
                </div>
                <span className="font-mono text-xs text-white w-12 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* APY chart */}
      <div className="px-4 pt-3 pb-2 border-t border-border">
        <span className="font-mono text-2xs uppercase tracking-[0.15em] text-muted block mb-2">Live APY</span>
        <YieldChart signals={signals} />
      </div>

      <div className="flex-1" />

      {/* Actions (wallet only) */}
      {address && config && (
        <div className="px-4 py-4 border-t border-border space-y-4">

          {/* Risk profile */}
          <div>
            <span className="font-mono text-2xs uppercase tracking-[0.15em] text-muted block mb-2">Risk Profile</span>
            <div className="grid grid-cols-3 gap-1.5">
              {["LOW", "MID", "HIGH"].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setRisk(i)}
                  disabled={busy}
                  className={`font-mono text-2xs uppercase tracking-wider py-1.5 rounded border transition-all ${
                    rp === i
                      ? "border-white text-white bg-white/10"
                      : "border-border text-muted hover:border-border-2 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mint */}
          <div>
            <span className="font-mono text-2xs uppercase tracking-[0.15em] text-muted block mb-2">Get Test Tokens</span>
            <button
              onClick={mintAll}
              disabled={busy}
              className="w-full font-mono text-xs uppercase tracking-wider py-2 rounded border border-border text-muted-2 hover:border-white hover:text-white transition-colors disabled:opacity-40"
            >
              Mint 1,000 Each
            </button>
          </div>

          {/* Deposit */}
          <div>
            <span className="font-mono text-2xs uppercase tracking-[0.15em] text-muted block mb-2">Deposit</span>
            <div className="space-y-1.5 mb-2">
              {Object.values(config.tokens).map((token) => (
                <div key={token.assetId} className="flex items-center gap-2">
                  <span className="font-mono text-2xs uppercase text-muted w-16 truncate">{token.symbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    value={depositAmounts[token.assetId] ?? ""}
                    onChange={(e) => setDepositAmounts((d) => ({ ...d, [token.assetId]: e.target.value }))}
                    className="flex-1 bg-surface-3 border border-border rounded px-2 py-1 font-mono text-xs text-white placeholder-muted outline-none focus:border-border-2"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={depositAll}
              disabled={busy}
              className="w-full font-mono text-xs uppercase tracking-wider py-2 rounded bg-white text-black hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              Deposit
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
