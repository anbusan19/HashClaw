"use client";

import { useEffect, useRef, useState } from "react";

interface RebalancePlan {
  fromIds: string[];
  toIds: string[];
  amounts: string[];
  minOuts: string[];
}

interface RebalanceLegSummary { from: string; to: string; fraction: string; reason: string }

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: string;
  // set when the assistant has a ready-to-sign rebalance plan
  rebalancePlan?: {
    reasoning: string;
    executorAddress: string;
    plan: RebalancePlan;
    legs: RebalanceLegSummary[];
  };
  // set when a rebalance has been confirmed on-chain
  explorerUrl?: string;
}

interface Props { address: string | null; signer: unknown }

const CHIPS = [
  "Should I rebalance?",
  "Best yield right now?",
  "Explain my current allocation",
  "What's my risk profile?",
  "How does veHSK staking work?",
];

const EXECUTOR_ABI = [
  "function submitAndExecute(address user, uint256[] fromAssetIds, uint256[] toAssetIds, uint256[] amounts, uint256[] minAmountsOut, string reasoning) returns (uint256 planId)",
];

const REBALANCE_TRIGGERS = [
  /\brebalance\s*(now|it|portfolio|please)?\b/i,
  /\b(proceed|execute|go ahead|do it|confirm|yes,?\s*proceed|yes,?\s*do it)\b/i,
  /\btrigger\s*(a\s*)?rebalance\b/i,
];

function isRebalanceIntent(msg: string) {
  return REBALANCE_TRIGGERS.some((re) => re.test(msg));
}

const STORAGE_KEY = "hashclaw_chat_history";

const WELCOME: Message = {
  role: "assistant",
  content: "Hey — I'm HashClaw, your AI wealth manager on HashKey Chain.\n\nConnect your wallet and I'll analyse your portfolio in real time. Or just ask me anything.",
  ts: "—",
};

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderContent(content: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all">{part}</a>
      : part
  );
}

export default function ChatPanel({ address, signer }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [executingPlanIdx, setExecutingPlanIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const persistRunCount = useRef(0);

  // Load persisted history on mount (client-only — avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (parsed.length > 0) setMessages(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Persist messages across navigation.
  // Skip the very first run — it always fires with [WELCOME] (initial state)
  // before the load effect's setMessages has been applied, which would
  // overwrite the saved history in sessionStorage.
  useEffect(() => {
    if (persistRunCount.current === 0) { persistRunCount.current = 1; return; }
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  // ── Fetch AI rebalance plan for connected wallet ───────────────────────────
  async function fetchRebalancePlan(force: boolean): Promise<Message> {
    if (!address) {
      return { role: "assistant", content: "Connect your wallet first to rebalance your portfolio.", ts: now() };
    }

    const res = await fetch("/api/rebalance-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, force }),
    });
    const data = await res.json() as {
      status: string;
      reason?: string;
      reasoning?: string;
      executorAddress?: string;
      plan?: RebalancePlan;
      legs?: RebalanceLegSummary[];
    };

    if (data.status === "hold" || data.status === "no_balance") {
      return { role: "assistant", content: data.reason ?? "No rebalance needed.", ts: now() };
    }

    if (data.status === "ready" && data.plan && data.executorAddress) {
      const legText = data.legs?.map((l) => `  ${l.from} → ${l.to} (${l.fraction}%)`).join("\n") ?? "";
      return {
        role: "assistant",
        content: `${data.reasoning}\n\nProposed swaps:\n${legText}\n\nSign with your wallet to execute on-chain.`,
        ts: now(),
        rebalancePlan: {
          reasoning: data.reasoning ?? "",
          executorAddress: data.executorAddress,
          plan: data.plan,
          legs: data.legs ?? [],
        },
      };
    }

    return { role: "assistant", content: "Could not compute a rebalance plan.", ts: now() };
  }

  // ── Execute signed rebalance via MetaMask ─────────────────────────────────
  async function executeRebalance(msgIdx: number, plan: Message["rebalancePlan"]) {
    if (!plan || !signer || !address) return;
    setExecutingPlanIdx(msgIdx);
    try {
      const { ethers } = await import("ethers");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executor = new ethers.Contract(plan.executorAddress, EXECUTOR_ABI, signer as any);
      const tx = await executor.submitAndExecute(
        address,
        plan.plan.fromIds,
        plan.plan.toIds,
        plan.plan.amounts,
        plan.plan.minOuts,
        plan.reasoning
      );
      const receipt = await tx.wait();
      const explorerUrl = `https://testnet-explorer.hsk.xyz/tx/${receipt.hash}`;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Rebalance confirmed on-chain. ${plan.legs.length} swap${plan.legs.length !== 1 ? "s" : ""} executed.`,
          ts: now(),
          explorerUrl,
        },
      ]);
    } catch (e: unknown) {
      const msg = (e as Error).message?.slice(0, 120) ?? "Transaction failed";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Transaction failed: ${msg}`, ts: now() },
      ]);
    }
    setExecutingPlanIdx(null);
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim(), ts: now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setShowChips(false);
    setLoading(true);

    try {
      let reply: Message;

      if (isRebalanceIntent(text)) {
        reply = await fetchRebalancePlan(true);
      } else {
        const history = messages
          .filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0)
          .map(({ role, content }) => ({ role, content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim(), history, address }),
        });
        const data = await res.json() as { reply?: string; error?: string };
        reply = { role: "assistant", content: data.reply ?? data.error ?? "No response.", ts: now() };
      }

      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error — is the server running?", ts: now() }]);
    }
    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-black">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[68%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                msg.role === "user"
                  ? "bg-white text-black font-medium rounded-br-sm"
                  : "bg-surface-2 border border-border text-white rounded-bl-sm"
              }`}
            >
              {renderContent(msg.content)}

              {/* Sign & Execute button — only on ready plan messages */}
              {msg.rebalancePlan && (
                <button
                  onClick={() => executeRebalance(i, msg.rebalancePlan)}
                  disabled={executingPlanIdx !== null || !signer}
                  className="mt-3 w-full font-mono text-2xs uppercase tracking-[0.12em] px-3 py-2 rounded border border-white text-white hover:bg-white hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {executingPlanIdx === i
                    ? "Waiting for confirmation…"
                    : !signer
                    ? "Connect wallet to sign"
                    : "Sign & Execute Rebalance"}
                </button>
              )}

              {/* View on Explorer button — only on confirmed tx messages */}
              {msg.explorerUrl && (
                <a
                  href={msg.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full font-mono text-2xs uppercase tracking-[0.12em] px-3 py-2 rounded border border-white text-white hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View on Explorer
                </a>
              )}
            </div>
            <span className="font-mono text-2xs text-muted mt-1 uppercase tracking-wider">{msg.ts}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="bg-surface-2 border border-border rounded-xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-muted-2 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {showChips && (
        <div className="px-6 pb-2 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => send(chip)}
              className="text-2xs font-mono uppercase tracking-wider border border-border text-muted hover:border-white hover:text-white rounded-full px-3 py-1.5 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border bg-surface px-4 py-3 flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(); }}
          onKeyDown={handleKey}
          placeholder="Ask HashClaw anything…"
          rows={1}
          className="flex-1 resize-none bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm font-sans text-white placeholder-muted outline-none focus:border-white transition-colors max-h-28 min-h-[42px]"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-white text-black disabled:opacity-30 hover:opacity-80 transition-opacity"
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
