"use client";

import { FormEvent, useState } from "react";
import { formatClientApiError } from "@/lib/sai/client-api";
import { askSessionCosAction } from "@/lib/sai/session-workspace-actions";

const TAB_EXAMPLES: Record<string, string[]> = {
  mission: ["What is the mission outcome?", "What did CEO decide?"],
  execution: ["What stage are we in?", "Who owns execution now?"],
  team: ["Who is on this session team?", "Which agent is missing?"],
  timeline: ["What happened last in this session?", "Any stalls on timeline?"],
  artifacts: ["What artifacts were produced?", "Is knowledge archive ready?"],
  decisions: ["What decisions are pending?", "What was decided so far?"],
  approvals: ["What approvals block this session?", "What should I approve?"],
  risks: ["What are the top risks?", "Is execution health declining?"],
  knowledge: ["What knowledge was captured?", "What lessons were learned?"],
  "session-file": ["Summarize this session file", "What is the delivery outcome?"],
};

type Props = {
  sessionId: string;
  tab: string;
  tabLabel: string;
};

export function SessionCosAskInline({ sessionId, tab, tabLabel }: Props) {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendQuery(query: string) {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await askSessionCosAction(sessionId, query.trim(), tabLabel);
      setAnswer(data.answer ?? "No answer returned.");
    } catch (err) {
      setError(formatClientApiError(err, "COS AI"));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendQuery(input);
  }

  const examples = TAB_EXAMPLES[tab] ?? ["What should I know about this tab?"];

  return (
    <section className="enterprise-glass rounded-xl border border-purple-400/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-purple-200">Ask COS AI</h4>
          <p className="text-[10px] text-white/40">Context: {tabLabel} tab</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setInput(ex);
                sendQuery(ex);
              }}
              className="rounded border border-white/10 px-2 py-0.5 text-[9px] text-white/55 hover:bg-white/5"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${tabLabel.toLowerCase()}…`}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-purple-600/80 px-3 py-2 text-[10px] font-medium text-white disabled:opacity-50"
        >
          {loading ? "…" : "Ask"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {answer && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/75 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </section>
  );
}
