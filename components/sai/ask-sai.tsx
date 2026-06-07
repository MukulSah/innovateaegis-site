"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/sai/types";
import { askSAIExamples } from "@/lib/sai/data";

export function AskSAIPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendQuery(query: string) {
    if (!query.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/sai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || "I couldn't process that query. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Connection to SAI Brain interrupted. Please try again.",
          timestamp: new Date(),
        },
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
    <section className="enterprise-glass rounded-2xl border border-purple-400/15 p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 text-sm font-bold text-white">
              S
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Ask SAI</h2>
              <p className="text-xs text-white/50">
                Connected to the entire company — projects, people, agents, memory, and decisions
              </p>
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-300">
            SAI Brain Online
          </span>
        </div>
      </div>

      <div className="mb-4 min-h-[280px] max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-[#06061a]/60 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <p className="text-sm text-white/40">
              Ask anything about your company. SAI has access to all operational data.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {askSAIExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => sendQuery(example)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-purple-400/30 hover:bg-purple-500/10 hover:text-white/90"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-600/30 text-white"
                      : "border border-white/10 bg-white/[0.04] text-white/85"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-300/70">
                      SAI Brain
                    </p>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: "0.2s" }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-pink-400" style={{ animationDelay: "0.4s" }} />
                    <span className="ml-2 text-xs text-white/50">Analyzing company data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask SAI anything about your company..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/40"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="glow-btn shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
