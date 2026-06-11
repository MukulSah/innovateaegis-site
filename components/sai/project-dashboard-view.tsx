"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectDashboard } from "@/lib/sai/types";

type Props = {
  dashboard: ProjectDashboard;
  isAdmin: boolean;
};

export function ProjectDashboardView({ dashboard, isAdmin }: Props) {
  const router = useRouter();
  const { project, objectives, tasks, workflows, timeline, memory, deliverables, approvals, metrics } =
    dashboard;
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeWorkflow = workflows.find((w) => w.status === "running");

  async function launchObjective(e: FormEvent) {
    e.preventDefault();
    if (!objective.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sai/projects/${project.id}/objectives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: objective.trim(), description: objective.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to launch objective");
        return;
      }
      setObjective("");
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function completeStep(workflowId: string, stepId: string) {
    setLoading(true);
    await fetch(`/api/sai/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance", stepId, output: "Approved by owner" }),
    });
    router.refresh();
    setLoading(false);
  }

  async function decideApproval(approvalId: string, status: "approved" | "rejected") {
    setLoading(true);
    await fetch(`/api/sai/projects/${project.id}/approvals/${approvalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-white/50">
        <Link href="/sai/projects" className="hover:text-white">← Projects</Link>
      </div>

      <div className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{project.name}</h2>
            <p className="mt-1 text-sm text-white/55">{project.objective}</p>
          </div>
          <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-200">
            Health {project.healthScore}/100
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-[10px] uppercase text-white/35">Business Owner</p>
            <p className="text-white/80">{project.businessOwner}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/35">Project Lead</p>
            <p className="text-white/80">{project.projectLeadName ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/35">Progress</p>
            <p className="text-white/80">{project.progress}% · {project.tasksCompleted}/{project.tasksTotal} tasks</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/35">Status</p>
            <p className="text-white/80">{project.status.replace("_", " ")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Tasks", value: metrics.activeTasks },
          { label: "Blocked", value: metrics.blockedTasks },
          { label: "Pending Approvals", value: metrics.pendingApprovals },
          { label: "Active Workflows", value: metrics.activeWorkflows },
        ].map((m) => (
          <article key={m.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-2xl font-bold text-white">{m.value}</p>
            <p className="text-xs text-white/50">{m.label}</p>
          </article>
        ))}
      </div>

      {isAdmin && (
        <form onSubmit={launchObjective} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h3 className="text-sm font-semibold text-white">Add Objective — Auto SDLC</h3>
          <p className="mt-1 text-xs text-white/45">SAI creates workflow, tasks, assignments, deliverables, and project memory.</p>
          <div className="mt-3 flex gap-2">
            <input
              required
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder='e.g. "Build Software Deployment Module"'
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Launch
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </form>
      )}

      {activeWorkflow && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Current Workflow — {activeWorkflow.name}</h3>
          <p className="text-xs text-white/45">{activeWorkflow.objective}</p>
          <ol className="mt-4 space-y-2">
            {activeWorkflow.steps.map((step) => (
              <li key={step.id} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-xs">
                <span className="text-white/75">{step.stepLabel} · {step.assignedAgentName ?? "Unassigned"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/35">{step.status}</span>
                  {step.status === "in_progress" && isAdmin && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => completeStep(activeWorkflow.id, step.id)}
                      className="text-emerald-300"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Objectives</h3>
          <ul className="mt-3 space-y-2">
            {objectives.length === 0 ? (
              <li className="text-xs text-white/40">No objectives yet</li>
            ) : (
              objectives.map((o) => (
                <li key={o.id} className="rounded-lg bg-white/[0.02] px-3 py-2 text-xs text-white/70">
                  {o.title}
                  <span className="ml-2 text-white/35">{o.status}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Pending Approvals</h3>
          <ul className="mt-3 space-y-2">
            {approvals.filter((a) => a.status === "pending").length === 0 ? (
              <li className="text-xs text-white/40">None pending</li>
            ) : (
              approvals.filter((a) => a.status === "pending").map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                  <span className="text-white/70">{a.approvalType} approval</span>
                  {isAdmin && (
                    <span className="flex gap-2">
                      <button type="button" onClick={() => decideApproval(a.id, "approved")} className="text-emerald-300">Approve</button>
                      <button type="button" onClick={() => decideApproval(a.id, "rejected")} className="text-red-300">Reject</button>
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Active Tasks</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-white/35">
                <th className="pb-2">Task</th>
                <th className="pb-2">Stage</th>
                <th className="pb-2">Assignee</th>
                <th className="pb-2">Approval</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 12).map((t) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-2 text-white/80">{t.title}</td>
                  <td className="py-2 text-white/50">{t.status.replace("_", " ")}</td>
                  <td className="py-2 text-white/50">{t.assignedAgentName ?? t.assignedEmployeeName ?? "—"}</td>
                  <td className="py-2 text-white/50">{t.approvalStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Project Timeline</h3>
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {timeline.length === 0 ? (
              <li className="text-xs text-white/40">No activity yet</li>
            ) : (
              timeline.map((e) => (
                <li key={e.id} className="rounded-lg border border-white/5 px-3 py-2">
                  <p className="text-xs font-medium text-white/80">{e.title}</p>
                  <p className="text-[10px] text-white/40">{e.actorName} · {new Date(e.createdAt).toLocaleString()}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Project Memory</h3>
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {memory.length === 0 ? (
              <li className="text-xs text-white/40">No memory records yet</li>
            ) : (
              memory.map((m) => (
                <li key={m.id} className="rounded-lg border border-white/5 px-3 py-2">
                  <p className="text-[10px] uppercase text-purple-300/60">{m.memoryType}</p>
                  <p className="text-xs text-white/80">{m.title}</p>
                  <p className="text-[10px] text-white/40">{m.summary}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Deliverables</h3>
        <ul className="mt-3 space-y-2">
          {deliverables.length === 0 ? (
            <li className="text-xs text-white/40">No deliverables yet</li>
          ) : (
            deliverables.map((d) => (
              <li key={d.id} className="rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                <p className="font-medium text-white/80">{d.title}</p>
                <p className="text-white/45">{d.content}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
