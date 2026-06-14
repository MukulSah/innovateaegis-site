"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { formatClientApiError } from "@/lib/sai/client-api";
import type { FounderSessionRow } from "@/lib/sai/founder-timeline";
import { askSessionCosAction } from "@/lib/sai/session-workspace-actions";

type ChatLine = { id: string; role: "user" | "assistant"; content: string };

const SESSION_ASK_EXAMPLES = [
  "What approvals are pending for this session?",
  "What should I do next?",
  "What is the session outcome?",
  "What did COO report on execution?",
];

type Props = {
  session: FounderSessionRow;
  onClose: () => void;
};

export function SessionCosAskPanel({ session, onClose }: Props) {
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendQuery(query: string) {
    if (!query.trim() || loading) return;

    const userLine: ChatLine = { id: `u-${Date.now()}`, role: "user", content: query.trim() };
    setMessages((prev) => [...prev, userLine]);
    setInput("");
    setLoading(true);

    try {
      const data = await askSessionCosAction(session.id, query.trim());
      if (!data.brief) throw new Error("Session not found");
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: data.answer ?? "No answer returned." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", content: formatClientApiError(err, "COS AI") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendQuery(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md rounded-2xl border border-purple-400/25 bg-[#080818] shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/80">Ask COS AI</p>
          <p className="mt-1 truncate text-sm font-medium text-white">
            Session #{session.sessionNumber ?? "—"} — {session.objective}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/50 hover:bg-white/5"
        >
          Close
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center">
            <p className="text-xs text-white/45">
              Ask about status, output, or what CEO / COO / PM reported for this session.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SESSION_ASK_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => sendQuery(example)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60 hover:border-purple-400/30 hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-600/30 text-white"
                      : "border border-white/10 bg-white/[0.04] text-white/85"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-white/40">COS AI analyzing session…</p>}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/10 p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this session…"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-purple-400/40"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
