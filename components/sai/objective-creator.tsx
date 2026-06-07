"use client";

import { useState } from "react";

const PIPELINE = [
  "Creates Requirement Document",
  "Creates Product Plan",
  "Creates Architecture",
  "Creates Tasks",
  "Assigns Engineers",
  "Generates Test Plans",
  "Tracks Progress",
  "Verifies Completion",
  "Deploys Release",
  "Stores Knowledge",
];

export function ObjectiveCreator() {
  const [objective, setObjective] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = objective.trim();
    if (!value) return;
    setGenerated(value);
    setRevealed(0);
    PIPELINE.forEach((_, i) => {
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 220 * (i + 1));
    });
  };

  return (
    <div className="enterprise-glass rounded-2xl border border-purple-400/20 p-6">
      <h2 className="text-lg font-bold text-white">Create a company objective</h2>
      <p className="mt-1 text-sm text-white/55">
        The owner manages outcomes, not tasks. Enter an objective and SAI turns it
        into execution automatically.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder='e.g. "Build Sentra Software Deployment Module"'
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/50 focus:bg-white/[0.06]"
        />
        <button
          type="submit"
          className="glow-btn shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white"
        >
          Generate with SAI
        </button>
      </form>

      {generated && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-sm text-white/60">
            SAI received: <span className="font-semibold text-white">“{generated}”</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-purple-300/70">
            Automatic execution pipeline
          </p>
          <ol className="mt-3 space-y-1.5">
            {PIPELINE.map((step, i) => {
              const done = i < revealed;
              return (
                <li
                  key={step}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all ${
                    done
                      ? "border-emerald-400/20 bg-emerald-500/5 text-white"
                      : "border-white/5 bg-white/[0.01] text-white/35"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      done ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-white/40"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {step}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] text-white/40">
            This is a demonstration of how SAI decomposes an objective. In a live
            deployment each step is executed by the responsible human and AI agents.
          </p>
        </div>
      )}
    </div>
  );
}
