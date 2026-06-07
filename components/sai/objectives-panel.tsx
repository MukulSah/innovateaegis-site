"use client";

import { FormEvent, useState } from "react";

type Objective = {
  id: string;
  title: string;
  businessGoal: string;
  priority: string;
  status: string;
  impactScore: number;
  targetDate: string | null;
  successMetrics: string;
  projects: Array<{ id: string; name: string; status: string; progress: number }>;
};

type Props = {
  objectives: Objective[];
  isOwner: boolean;
};

function parseMetrics(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const priorityColors: Record<string, string> = {
  critical: "text-red-400 border-red-400/20 bg-red-500/10",
  high: "text-amber-400 border-amber-400/20 bg-amber-500/10",
  medium: "text-cyan-400 border-cyan-400/20 bg-cyan-500/10",
  low: "text-white/50 border-white/10 bg-white/5",
};

const statusColors: Record<string, string> = {
  not_started: "text-white/50",
  in_progress: "text-cyan-400",
  at_risk: "text-amber-400",
  completed: "text-emerald-400",
  cancelled: "text-red-400",
};

export function ObjectivesPanel({ objectives: initial, isOwner }: Props) {
  const [objectives, setObjectives] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [businessGoal, setBusinessGoal] = useState("");
  const [priority, setPriority] = useState("medium");

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sai/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, businessGoal, priority }),
      });
      if (res.ok) {
        const listRes = await fetch("/api/sai/objectives");
        const updated = await listRes.json();
        setObjectives(updated);
        setTitle("");
        setBusinessGoal("");
        setShowForm(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Company Objectives</h2>
          <p className="text-xs text-white/50">Owner sets objectives. SAI generates execution plans automatically.</p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg border border-purple-400/25 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-500/20"
          >
            {showForm ? "Cancel" : "+ New Objective"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="enterprise-glass rounded-xl border border-white/10 p-5 space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Objective title"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
            required
          />
          <textarea
            value={businessGoal}
            onChange={(e) => setBusinessGoal(e.target.value)}
            placeholder="Business goal"
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
            required
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Generate Execution Plan"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {objectives.map((obj) => {
          const metrics = parseMetrics(obj.successMetrics);
          return (
            <article key={obj.id} className="enterprise-glass rounded-xl border border-white/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{obj.title}</h3>
                  <p className="mt-1 text-xs text-white/55">{obj.businessGoal}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityColors[obj.priority] ?? priorityColors.medium}`}>
                    {obj.priority}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase ${statusColors[obj.status] ?? ""}`}>
                    {obj.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                <span>Impact: <span className="text-white/70">{obj.impactScore}</span></span>
                {obj.targetDate && (
                  <span>Target: <span className="text-white/70">{obj.targetDate.slice(0, 10)}</span></span>
                )}
                {metrics.length > 0 && (
                  <span>Metrics: <span className="text-white/70">{metrics.join(", ")}</span></span>
                )}
              </div>
              {obj.projects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {obj.projects.map((p) => (
                    <span key={p.id} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/60">
                      {p.name} ({p.progress}%)
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
