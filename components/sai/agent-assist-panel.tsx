"use client";

import { FormEvent, useState } from "react";

const agentTypes = [
  { value: "architect", label: "Architect Agent", desc: "Architecture drafts" },
  { value: "qa", label: "QA Agent", desc: "Test plans" },
  { value: "pm", label: "PM Agent", desc: "Task breakdowns" },
  { value: "docs", label: "Documentation Agent", desc: "Release notes" },
];

export function AgentAssistPanel() {
  const [agentType, setAgentType] = useState("architect");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch("/api/sai/agents/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, context }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraft({ title: data.title, content: data.content });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-6">
      <h2 className="text-sm font-semibold text-white">Agent Assistance</h2>
      <p className="mt-1 text-xs text-white/50">
        Agents generate drafts for human review. They do not execute work autonomously.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {agentTypes.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setAgentType(a.value)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                agentType === a.value
                  ? "border-purple-400/30 bg-purple-500/10 text-white"
                  : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              <span className="font-medium">{a.label}</span>
              <span className="mt-0.5 block text-[10px] opacity-60">{a.desc}</span>
            </button>
          ))}
        </div>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Describe what you need (project, feature, release, etc.)"
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Draft"}
        </button>
      </form>

      {draft && (
        <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-300">
            Pending Review — {draft.title}
          </p>
          <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-white/75">
            {draft.content}
          </pre>
        </div>
      )}
    </section>
  );
}
