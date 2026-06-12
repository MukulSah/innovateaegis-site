"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SDLC_WORKFLOW } from "@/lib/sai/sdlc";
import type { Agent, ControlPanelStats, Project, Task, WorkflowEvent, WorkflowRun } from "@/lib/sai/types";

function workflowProgress(steps: WorkflowRun["steps"]) {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((s) => s.status === "completed").length / steps.length) * 100);
}

function activeAgent(wf: WorkflowRun) {
  return wf.currentAgentName ?? "—";
}

function formatId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

type Props = {
  stats: ControlPanelStats;
  agents: Agent[];
  tasks: Task[];
  workflows: WorkflowRun[];
  projects: Project[];
  workflowEvents: WorkflowEvent[];
  isAdmin: boolean;
};

const stepStatusColor: Record<string, string> = {
  pending: "text-white/40",
  in_progress: "text-amber-300",
  completed: "text-emerald-400",
  blocked: "text-red-300",
  skipped: "text-white/30",
};

export function ControlPanel({ stats, agents, tasks, workflows, projects, workflowEvents, isAdmin }: Props) {
  const router = useRouter();
  const [objective, setObjective] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workflowList, setWorkflowList] = useState(workflows);

  const blockedTasks = tasks.filter((t) => t.approvalStatus === "rejected" || t.status === "backlog");
  const busyAgents = agents.filter((a) => (a.activeTaskCount ?? 0) > 0);

  async function launchWorkflow(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !objective.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sai/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, objective: objective.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to launch workflow");
        return;
      }
      setWorkflowList((prev) => [data.workflow, ...prev]);
      setObjective("");
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function workflowAction(
    id: string,
    action: "pause" | "resume" | "advance" | "delete",
    stepId?: string,
  ) {
    if (action === "delete") {
      const confirmed = window.confirm(
        "Delete this workflow permanently? All workflow steps and orchestration data will be removed from the database. Tasks will be unlinked but not deleted.",
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError("");

    try {
      if (action === "delete") {
        const res = await fetch(`/api/sai/workflows/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to delete workflow");
          return;
        }
        setWorkflowList((prev) => prev.filter((w) => w.id !== id));
        router.refresh();
        return;
      }

      const body =
        action === "advance" && stepId
          ? { action, stepId, output: "Approved by owner" }
          : { action };

      const res = await fetch(`/api/sai/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Workflow action failed");
        return;
      }
      setWorkflowList((prev) => prev.map((w) => (w.id === id ? data.workflow : w)));
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return <p className="text-sm text-white/50">Owner access required for the control panel.</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-white">Headquarters Overview</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pending Approvals", value: stats.pendingApprovals, sub: `${stats.waitingForFounder} escalated` },
            { label: "Auto Approved Today", value: stats.autoApprovedToday, sub: `${stats.escalationsToday} escalations` },
            { label: "Governance Health", value: stats.governanceHealth, sub: `${stats.waitingForRevision} awaiting revision` },
            { label: "Active Workflows", value: stats.activeWorkflows, sub: `${stats.blockedWorkflows} blocked` },
          ].map((card) => (
            <article key={card.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-white/50">{card.label}</p>
              <p className="text-[10px] text-white/35">{card.sub}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="enterprise-glass rounded-xl border border-amber-400/20 p-5">
        <h2 className="text-sm font-semibold text-white">Governance Queue</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pending Approvals", value: stats.pendingApprovals },
            { label: "Escalations", value: stats.escalationsToday },
            { label: "Blocked Workflows", value: stats.blockedWorkflows },
            { label: "Governance Health", value: stats.governanceHealth },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="text-[10px] text-white/45">{item.label}</p>
            </div>
          ))}
        </div>
        <Link href="/sai/approvals" className="mt-3 inline-block text-xs text-purple-300 hover:text-purple-200">
          Open Approval Center →
        </Link>
      </section>

      <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
        <h2 className="text-sm font-semibold text-white">Launch SDLC Workflow</h2>
        <p className="mt-1 text-xs text-white/45">
          Enter an objective — SAI creates requirements, architecture, tasks, assignments, and tracks delivery.
        </p>
        <form onSubmit={launchWorkflow} className="mt-4 space-y-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            required
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder='e.g. "Build Software Deployment Module for Sentra"'
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={loading || !projects.length}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Launching…" : "Launch Workflow"}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-1 text-[10px] text-white/40">
          {SDLC_WORKFLOW.map((step, i) => (
            <span key={step.key} className="flex items-center gap-1">
              <span className="rounded border border-white/10 px-2 py-1">{step.label.split("—")[0].trim()}</span>
              {i < SDLC_WORKFLOW.length - 1 && <span>↓</span>}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Agent Workload</h2>
          <ul className="mt-3 space-y-2">
            {busyAgents.length === 0 ? (
              <li className="text-xs text-white/40">No active workload</li>
            ) : (
              busyAgents.map((a) => (
                <li key={a.id} className="flex justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                  <span className="text-white/80">{a.name}</span>
                  <span className="text-purple-300">{a.activeTaskCount} tasks · {a.performanceScore} score</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Blocked / Needs Attention</h2>
          <ul className="mt-3 space-y-2">
            {blockedTasks.length === 0 ? (
              <li className="text-xs text-white/40">No blocked tasks</li>
            ) : (
              blockedTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="rounded-lg bg-white/[0.02] px-3 py-2 text-xs text-white/70">
                  {t.title}
                  <span className="ml-2 text-red-300/70">{t.approvalStatus === "rejected" ? "rejected" : t.status}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Workflow Execution Stream</h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {workflowEvents.length === 0 ? (
            <li className="text-xs text-white/40">Launch a workflow to see the execution stream.</li>
          ) : (
            workflowEvents.map((event) => (
              <li key={event.id} className="flex gap-3 border-b border-white/5 pb-2 text-xs last:border-0">
                <span className="shrink-0 text-white/35">{formatTime(event.createdAt)}</span>
                <div>
                  <p className="text-white/80">{event.title}</p>
                  <p className="text-white/45">{event.actor}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white">Mission Control — Active Workflows</h2>
        <div className="mt-3 space-y-4">
          {workflowList.length === 0 ? (
            <p className="text-sm text-white/40">No workflows yet. Launch one above.</p>
          ) : (
            workflowList.map((wf) => (
              <article key={wf.id} className="enterprise-glass rounded-xl border border-white/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-purple-300/70">WF-{formatId(wf.id)}</p>
                    <p className="text-sm font-medium text-white">{wf.objective}</p>
                    <p className="text-xs text-white/45">
                      {wf.projectName} · {wf.status} · {wf.governanceStatus?.replace(/_/g, " ") ?? "normal"} · {wf.workflowMode?.replace(/_/g, " ") ?? "semi autonomous"} · {workflowProgress(wf.steps)}% · Agent: {activeAgent(wf)}
                    </p>
                    <p className="mt-1 text-[10px] text-white/35">
                      Created {formatTime(wf.createdAt)} · Updated {formatTime(wf.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link href={`/sai/workflows/${wf.id}`} className="text-[10px] text-purple-300 hover:text-purple-200">
                      View Detail →
                    </Link>
                    <div className="flex flex-wrap justify-end gap-2">
                      {wf.status === "running" && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => workflowAction(wf.id, "pause")}
                          className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          Pause
                        </button>
                      )}
                      {wf.status === "paused" && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => workflowAction(wf.id, "resume")}
                          className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => workflowAction(wf.id, "delete")}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${workflowProgress(wf.steps)}%` }} />
                </div>
                <ol className="mt-4 space-y-2">
                  {wf.steps.map((step) => (
                    <li key={step.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${stepStatusColor[step.status]}`}>{step.stepLabel}</p>
                        <p className="truncate text-[10px] text-white/35">{step.assignedAgentName ?? "Unassigned"}</p>
                      </div>
                      {step.status === "in_progress" && wf.status === "running" && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => workflowAction(wf.id, "advance", step.id)}
                          className="shrink-0 rounded border border-emerald-400/20 px-2 py-1 text-[10px] text-emerald-300"
                        >
                          Complete Step
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
