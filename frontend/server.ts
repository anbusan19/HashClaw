import http from "http";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

import { fetchAllYieldSignals } from "../agent/signals/yieldFetcher";

/**
 * frontend/server.ts
 * Lightweight HTTP server that:
 *   - Serves frontend/src/index.html at GET /
 *   - Exposes JSON API endpoints consumed by the chat UI
 *
 * Run: ts-node frontend/server.ts
 */

const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ── Contract ABIs ─────────────────────────────────────────────────────────────
const VAULT_ABI = [
  "function getPortfolio(address user) view returns (uint256[] assetIds, uint256[] balances, string[] symbols)",
  "function userRiskProfile(address user) view returns (uint8)",
  "function assetCount() view returns (uint256)",
];

const RISK_LABELS = ["Conservative", "Balanced", "Aggressive"];

function getProvider() {
  return new ethers.JsonRpcProvider(
    process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz"
  );
}

function getWalletAddress(): string {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("PRIVATE_KEY not set");
  return new ethers.Wallet(pk).address;
}

function getVault() {
  const addr = process.env.TREASURY_VAULT_ADDRESS;
  if (!addr) throw new Error("TREASURY_VAULT_ADDRESS not set — run pnpm deploy first");
  return new ethers.Contract(addr, VAULT_ABI, getProvider());
}

// ── API handlers ──────────────────────────────────────────────────────────────
async function handlePortfolio(): Promise<object> {
  const vault = getVault();
  const user = getWalletAddress();
  const [[assetIds, balances, symbols], riskProfile]: [[bigint[], bigint[], string[]], number] =
    await Promise.all([vault.getPortfolio(user), vault.userRiskProfile(user)]);

  return {
    user,
    riskProfile,
    riskLabel: RISK_LABELS[riskProfile] ?? "Unknown",
    assets: (assetIds as bigint[]).map((id, i) => ({
      assetId: Number(id),
      symbol: (symbols as string[])[i],
      balance: ethers.formatEther((balances as bigint[])[i]),
    })),
  };
}

async function handleYields(): Promise<object> {
  const signals = await fetchAllYieldSignals();
  return { signals };
}

// Chat endpoint — stateless, single-turn
async function handleChat(body: string): Promise<object> {
  const { message, history } = JSON.parse(body) as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  // Gather context silently
  let contextBlock = "";
  try {
    const [portfolio, yieldsData] = await Promise.all([
      handlePortfolio(),
      handleYields(),
    ]);
    contextBlock = `
Current portfolio: ${JSON.stringify(portfolio)}
Live yield signals: ${JSON.stringify(yieldsData)}
`.trim();
  } catch {
    contextBlock = "Portfolio/yield data unavailable (contracts not deployed yet).";
  }

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const systemPrompt = `You are HashClaw, an AI wealth manager running on HashKey Chain testnet.
You help users manage their on-chain portfolio of RWA tokens (xXAG, xMMF), veHSK staking, and stable LPs.
Be concise, specific, and data-driven. Reference live portfolio and yield data when relevant.
Never invent contract addresses or transaction hashes.

Live context:
${contextBlock}`;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).slice(-10), // keep last 10 turns
    { role: "user", content: message },
  ];

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.4,
    max_tokens: 600,
  });

  return { reply: completion.choices[0]?.message?.content ?? "No response." };
}

// ── Router ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  // CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // Serve HTML
    if (method === "GET" && url === "/") {
      const html = fs.readFileSync(path.join(__dirname, "src/index.html"), "utf8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    // API: portfolio
    if (method === "GET" && url === "/api/portfolio") {
      const data = await handlePortfolio();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
      return;
    }

    // API: yields
    if (method === "GET" && url === "/api/yields") {
      const data = await handleYields();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
      return;
    }

    // API: chat
    if (method === "POST" && url === "/api/chat") {
      const body = await new Promise<string>((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
      });
      const data = await handleChat(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
});

server.listen(PORT, () => {
  console.log(`HashClaw UI →  http://localhost:${PORT}`);
});
