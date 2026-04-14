import http from "http";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

import { fetchAllYieldSignals } from "../agent/signals/yieldFetcher";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

// BigInt → string so JSON.stringify never throws
function toJSON(data: unknown): string {
  return JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v));
}

// ── ABIs ──────────────────────────────────────────────────────────────────────
const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
  "function assetCount() view returns (uint256)",
];

const RISK_LABELS = ["Conservative", "Balanced", "Aggressive"];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz");
}

function getVault() {
  const addr = process.env.TREASURY_VAULT_ADDRESS;
  if (!addr) throw new Error("TREASURY_VAULT_ADDRESS not set — run pnpm run deploy first");
  return new ethers.Contract(addr, VAULT_ABI, getProvider());
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// Returns on-chain config the browser needs (no secrets)
function handleConfig(): object {
  return {
    chainId: 133,
    rpcUrl: "https://testnet.hsk.xyz",
    explorerUrl: "https://testnet-explorer.hsk.xyz",
    contracts: {
      treasuryVault:     process.env.TREASURY_VAULT_ADDRESS     ?? "",
      rebalanceExecutor: process.env.REBALANCE_EXECUTOR_ADDRESS ?? "",
      hspSettlement:     process.env.HSP_SETTLEMENT_ADDRESS     ?? "",
    },
    tokens: {
      xXAG:        { address: process.env.RWA_SILVER_ADDRESS ?? "", symbol: "xXAG",         assetId: 0 },
      xMMF:        { address: process.env.RWA_MMF_ADDRESS    ?? "", symbol: "xMMF",         assetId: 1 },
      veHSK:       { address: process.env.VEHSK_ADDRESS      ?? "", symbol: "veHSK",        assetId: 2 },
      stableLP:    { address: process.env.STABLE_LP_ADDRESS  ?? "", symbol: "USDC-USDT-LP", assetId: 3 },
    },
  };
}

// Portfolio for any address (address passed as ?address= query param)
async function handlePortfolio(address: string): Promise<object> {
  if (!ethers.isAddress(address)) throw new Error("Invalid address");
  const vault = getVault();
  const [[assetIds, balances, symbols], rawRisk] = await Promise.all([
    vault.getPortfolio(address),
    vault.userRiskProfile(address),
  ]);
  const riskProfile = Number(rawRisk);
  return {
    user: address,
    riskProfile,
    riskLabel: RISK_LABELS[riskProfile] ?? "Unknown",
    assets: (assetIds as bigint[]).map((id, i) => ({
      assetId: Number(id),
      symbol:  (symbols as string[])[i],
      balance: ethers.formatEther((balances as bigint[])[i]),
    })),
  };
}

async function handleYields(): Promise<object> {
  return { signals: await fetchAllYieldSignals() };
}

// AI chat — context built from the queried user's portfolio
async function handleChat(body: string): Promise<object> {
  const { message, history, address } = JSON.parse(body) as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    address?: string;
  };

  let contextBlock = "";
  try {
    const [portfolio, yieldsData] = await Promise.all([
      address && ethers.isAddress(address)
        ? handlePortfolio(address)
        : Promise.resolve(null),
      handleYields(),
    ]);
    contextBlock = [
      portfolio ? `Portfolio for ${address}: ${toJSON(portfolio)}` : "No wallet connected.",
      `Live yield signals: ${toJSON(yieldsData)}`,
    ].join("\n");
  } catch {
    contextBlock = "Portfolio/yield data temporarily unavailable.";
  }

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const systemPrompt = `You are HashClaw, an AI wealth manager on HashKey Chain testnet.
You help users manage on-chain portfolios of RWA tokens (xXAG, xMMF), veHSK staking, and stable LPs.
Be concise and data-driven. Reference live portfolio and yield data when relevant.
Never invent contract addresses or transaction hashes.
When a user asks to rebalance or deposit, explain the steps they need to take in the UI.

Live context:
${contextBlock}`;

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...(history ?? []).slice(-10),
      { role: "user", content: message },
    ],
    temperature: 0.4,
    max_tokens: 600,
  });

  return { reply: completion.choices[0]?.message?.content ?? "No response." };
}

// ── Router ────────────────────────────────────────────────────────────────────
function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(idx + 1)));
}

const server = http.createServer(async (req, res) => {
  const rawUrl = req.url ?? "/";
  const pathname = rawUrl.split("?")[0];
  const query = parseQuery(rawUrl);
  const method = req.method ?? "GET";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const send = (status: number, data: unknown, type = "application/json") => {
    if (res.headersSent) return;
    const body = typeof data === "string" ? data : toJSON(data);
    res.writeHead(status, { "Content-Type": type });
    res.end(body);
  };

  try {
    if (method === "GET" && pathname === "/") {
      const html = fs.readFileSync(path.join(__dirname, "src/index.html"), "utf8");
      send(200, html, "text/html"); return;
    }

    if (method === "GET" && pathname === "/api/config") {
      send(200, handleConfig()); return;
    }

    if (method === "GET" && pathname === "/api/portfolio") {
      const address = query.address ?? (process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY).address : "");
      send(200, await handlePortfolio(address)); return;
    }

    if (method === "GET" && pathname === "/api/yields") {
      send(200, await handleYields()); return;
    }

    if (method === "POST" && pathname === "/api/chat") {
      const body = await new Promise<string>((resolve) => {
        let d = ""; req.on("data", c => d += c); req.on("end", () => resolve(d));
      });
      send(200, await handleChat(body)); return;
    }

    send(404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    send(500, { error: (err as Error).message });
  }
});

server.listen(PORT, () => console.log(`HashClaw UI →  http://localhost:${PORT}`));
