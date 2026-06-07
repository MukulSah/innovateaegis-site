"use client";

import { useState } from "react";
import { askSai, SUGGESTED_QUESTIONS, type AskResult } from "@/lib/sai/ask";

type Exchange = { question: string; result: AskResult };

function seedHistory(initialQuery: string): Exchange[] {
  const question = initialQuery.trim();
  if (!question) return [];
  return [{ question, result: askSai(question) }];
}

export function AskSai({
  variant = "full",
  initialQuery = "",
}: {
  variant?: "full" | "card";
  initialQuery?: string;
}) {
  const [input, setInput] = useState("");
  // The initial query (e.g. forwarded from the Digital Twin) is answered during
  // render, which keeps server and client output in sync without an effect.
  const [history, setHistory] = useState<Exchange[]>(() => seedHistory(initialQuery));

  const run = (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    const result = askSai(question);
    setHistory((h) => [{ question, result }, ...h]);
    setInput("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(input);
  };

  const compact = variant === "card";

  return (
    <div
      className={`enterprise-glass relative overflow-hidden rounded-3xl border border-purple-400/20 ${
        compact ? "p-6" : "p-6 md:p-8"
      }`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-sm font-bold text-white">
            ✦
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">Ask SAI</h2>
            <p className="text-xs text-white/50">
              Like ChatGPT, but connected to the entire company.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What should I work on today?"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/50 focus:bg-white/[0.06]"
          />
          <button
            type="submit"
            className="glow-btn shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white"
          >
            Ask
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {(compact ? SUGGESTED_QUESTIONS.slice(0, 4) : SUGGESTED_QUESTIONS).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => run(q)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-purple-400/30 hover:bg-purple-500/10 hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>

        <div
          className={`mt-5 space-y-3 ${
            compact ? "max-h-72 overflow-y-auto pr-1" : ""
          }`}
        >
          {history.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
              Ask SAI about projects, risks, bugs, revenue, the team, or roadmaps.
              Every answer is grounded in live company data.
            </p>
          )}
          {history.map((ex, i) => (
            <AnswerBlock key={history.length - i} exchange={ex} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswerBlock({ exchange }: { exchange: Exchange }) {
  const { question, result } = exchange;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-semibold text-purple-200">“{question}”</p>
      <p className="mt-2 text-sm font-medium text-white">{result.headline}</p>
      {result.body.map((line, i) => (
        <p key={i} className="mt-1 text-sm leading-6 text-white/60">
          {line}
        </p>
      ))}
      {result.bullets && result.bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {result.bullets.map((b, i) => (
            <li
              key={i}
              className="flex flex-col gap-0.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-white/80">{b.label}</span>
              {b.value && <span className="text-xs text-white/45">{b.value}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/30">
        {result.source}
      </p>
    </div>
  );
}
