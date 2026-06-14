"use client";

import { FormEvent, useRef, useState } from "react";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";

type Message = { role: "user" | "assistant"; content: string };

const EXAMPLES = [
  "What is everyone working on?",
  "Why are we stuck?",
  "What failed?",
  "What approvals are waiting?",
  "Which agent owns the next step?",
];

type Props = {
  projectId?: string | null;
};

export function FounderIntelligenceChat({ projectId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: question.trim() }]);
    setInput("");
    setLoading(true);
    try {
      const route = "/api/sai/founder/intelligence";
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), projectId }),
      });
      const data = await parseJsonResponse<{ answer?: string; error?: string }>(res, route);
      if (!res.ok) throw new Error(data.error ?? "Query failed");
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? "No answer returned." }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: formatClientApiError(err, "Founder Intelligence") },
      ]);
    } finally {
      setLoading(false);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
      <header>
        <p className="text-[10px] uppercase tracking-wider text-purple-300/70">Founder Intelligence</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Live Session Chat</h2>
        <p className="mt-1 text-xs text-white/45">
          Answers use live session state, artifacts, approvals, and execution events — not LLM memory.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => ask(ex)}
            disabled={loading}
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60 hover:border-purple-400/30 hover:text-white disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-white/40">Ask about current execution, blockers, or failures.</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-8 bg-purple-500/15 text-purple-100"
                  : "mr-8 bg-white/5 text-white/75"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
        {loading && <p className="text-xs text-white/40">Analyzing live system state…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about session state, blockers, architecture…"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
