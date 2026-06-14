"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FounderOperationsChat } from "@/components/sai/founder-operations-chat";
import { findAgentForRole } from "@/lib/sai/agent-hierarchy";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";
import type { FounderSessionTimelineData } from "@/lib/sai/founder-timeline";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";
import type { Agent } from "@/lib/sai/types";

type Props = {
  agents: Agent[];
  sessionTimeline?: FounderSessionTimelineData | null;
};

const QUICK_LINKS = [
  { label: "Session Center", href: "/sai/sessions" },
  { label: "All Sessions", href: "/sai/sessions?section=registry-all" },
  { label: "Organization", href: "/sai/organization" },
  { label: "Records", href: "/sai/records" },
];

export function FounderCommandConsole({ agents, sessionTimeline }: Props) {
  const router = useRouter();
  const [objectiveOpen, setObjectiveOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [objective, setObjective] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { connected } = useSaiRealtimeSync(
    () => router.refresh(),
    ["workflow_runs", "workflow_approvals", "activity_feed", "founder_operations_messages"],
    { debounceMs: 2000, minIntervalMs: 4000 },
  );

  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  const activeCount = agents.filter((a) => a.status === "busy" || a.status === "active").length;
  const activeSessions = sessionTimeline?.activeSessions.length ?? 0;
  const awaitingCount =
    (sessionTimeline?.awaitingApprovalSessions.length ?? 0) +
    (sessionTimeline?.awaitingFounderApproval.length ?? 0);

  async function openObjectiveForm() {
    setObjectiveOpen(true);
    setError("");
    if (projects.length > 0) return;
    try {
      const res = await fetch("/api/sai/founder/objectives");
      const data = await parseJsonResponse<{ projects: { id: string; name: string }[] }>(
        res,
        "/api/sai/founder/objectives",
      );
      if (res.ok) {
        const list = data.projects ?? [];
        setProjects(list);
        if (list[0]) setProjectId(list[0].id);
      }
    } catch {
      setProjects([]);
    }
  }

  async function submitObjective(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !objective.trim()) return;
    setLoading(true);
    setError("");
    try {
      const route = "/api/sai/sessions/spawn";
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          objective: objective.trim(),
          creationMode: "instant",
        }),
      });
      const data = await parseJsonResponse<{ error?: string; sessionId?: string }>(res, route);
      if (!res.ok) throw new Error(data.error || "Failed to start session");
      setObjective("");
      setObjectiveOpen(false);
      if (data.sessionId) {
        router.push(`/sai/sessions/${data.sessionId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(formatClientApiError(err, "Session spawn"));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40";

  return (
    <section className="enterprise-glass rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/10 to-cyan-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-300/80">
              Founder Command Console
            </p>
            <span className="flex items-center gap-1.5 text-[10px] text-white/40">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
              {connected ? "Live sync" : "Polling every 12s"}
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-white">Executive Command Bridge</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            Launch sessions instantly, monitor execution, and command the organization in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={openObjectiveForm}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
        >
          Launch Session
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
          <p className="text-[10px] uppercase text-emerald-300/70">Active Sessions</p>
          <p className="mt-1 text-2xl font-bold text-white">{activeSessions}</p>
          <Link href="/sai/sessions?section=registry-active" className="mt-2 inline-block text-[10px] text-emerald-300 hover:underline">
            View active →
          </Link>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
          <p className="text-[10px] uppercase text-amber-300/70">Awaiting Action</p>
          <p className="mt-1 text-2xl font-bold text-white">{awaitingCount}</p>
          <Link href="/sai/sessions?section=registry-approval" className="mt-2 inline-block text-[10px] text-amber-300 hover:underline">
            Review →
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] uppercase text-white/40">CEO Agent</p>
          <p className="mt-1 text-sm font-medium text-white">{ceo?.name ?? "Not configured"}</p>
          {ceo && (
            <Link href={`/sai/organization/agents/${ceo.id}/workspace`} className="mt-2 inline-block text-[10px] text-purple-300 hover:underline">
              Workspace →
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] uppercase text-white/40">COO Agent</p>
          <p className="mt-1 text-sm font-medium text-white">{coo?.name ?? "Not configured"}</p>
          {coo && (
            <Link href="/sai/executive/coo" className="mt-2 inline-block text-[10px] text-cyan-300 hover:underline">
              COO dashboard →
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] uppercase text-white/40">Workforce</p>
          <p className="mt-1 text-2xl font-bold text-white">{agents.length}</p>
          <p className="text-[10px] text-white/40">{activeCount} active agents</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:border-purple-400/30 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {objectiveOpen && (
        <form onSubmit={submitObjective} className="mt-5 rounded-xl border border-purple-400/20 bg-black/30 p-4">
          <h3 className="text-sm font-semibold text-white">Launch Instant Session</h3>
          <p className="mt-1 text-xs text-white/45">
            Creates a session immediately and starts orchestration — no approval gate.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Project</span>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`${inputClass} bg-[#0d0d14]`}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Objective</span>
              <textarea
                required
                rows={3}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className={inputClass}
                placeholder="What should the company execute in this session?"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
              {loading ? "Starting…" : "Start Session Now"}
            </button>
            <button type="button" onClick={() => setObjectiveOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 border-t border-white/10 pt-5">
        <FounderOperationsChat />
      </div>
    </section>
  );
}
