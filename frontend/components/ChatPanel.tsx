"use client";

import { useEffect, useRef, useState } from "react";

interface Message { role: "user" | "assistant"; content: string; ts: string }

interface Props { address: string | null }

const CHIPS = [
  "Should I rebalance?",
  "Best yield right now?",
  "Explain my current allocation",
  "What's my risk profile?",
  "How does veHSK staking work?",
];

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ address }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey — I'm HashClaw, your AI wealth manager on HashKey Chain.\n\nConnect your wallet and I'll analyse your portfolio in real time. Or just ask me anything.",
      ts: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim(), ts: now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setShowChips(false);
    setLoading(true);

    const history = messages
      .filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0)
      .map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history, address }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? data.error ?? "No response.", ts: now() },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error — is the server running?", ts: now() },
      ]);
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
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[68%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                msg.role === "user"
                  ? "bg-white text-black font-medium rounded-br-sm"
                  : "bg-surface-2 border border-border text-white rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
            <span className="font-mono text-2xs text-muted mt-1 uppercase tracking-wider">
              {msg.ts}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="bg-surface-2 border border-border rounded-xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-muted-2 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
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
