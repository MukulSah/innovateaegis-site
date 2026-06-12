"use client";

import Link from "next/link";
import { AgentAIConfigPanel } from "@/components/sai/agent-ai-config-panel";
import { AgentRuntimeActions } from "@/components/sai/agent-runtime-actions";
import type { Agent, AgentWorkspace, AIProvider, AIModelMode } from "@/lib/sai/types";

type Props = {
  workspace: AgentWorkspace;
  isAdmin?: boolean;
  modelMode?: AIModelMode;
  providers?: AIProvider[];
  agents?: Agent[];
};

const capacityColor: Record<string, string> = {
  AVAILABLE: "bg-emerald-400",
  BUSY: "bg-amber-400",
  OVERLOADED: "bg-red-400",
  BLOCKED: "bg-orange-400",
  OFFLINE: "bg-white/30",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

export function AgentWorkspaceView({
  workspace,
  isAdmin = false,
  modelMode = "single",
  providers = [],
  agents = [],
}: Props) {
  const { agent, workload, workQueue, knowledge, metrics } = workspace;
  const activeWorkflow = workspace.assignedTasks.find((t) => t.workflowRunId)?.workflowRunId ?? null;
  const stepKey = workspace.assignedTasks[0]?.workflowStepKey ?? "requirements";

  const currentSession = workspace.assignedTasks.find((t) => t.workflowRunId);

  return (
    <div className="space-y-6">
      <section className="enterprise-glass rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5">
        <h3 className="text-sm font-semibold text-white">Agent Inbox</h3>
        <p className="mt-1 text-xs text-white/45">
          Assigned context for {agent.name} — tasks, session, reviews, and artifacts.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] uppercase text-white/40">Assigned Tasks</p>
            <p className="text-lg font-bold text-white">{workspace.assignedTasks.length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] uppercase text-white/40">Current Session</p>
            <p className="text-sm font-medium text-white truncate">
              {currentSession?.workflowRunId ? "Active" : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] uppercase text-white/40">Pending Reviews</p>
            <p className="text-lg font-bold text-amber-300">{workQueue.review.length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] uppercase text-white/40">Artifacts / Docs</p>
            <p className="text-lg font-bold text-white">{workspace.documentsCreated.length}</p>
          </div>
        </div>
        {workspace.assignedTasks.length > 0 && (
          <ul className="mt-4 space-y-2">
            {workspace.assignedTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <p className="text-sm text-white">{t.title}</p>
                <p className="text-[10px] text-white/40">
                  {t.projectName} · {t.status} · {t.workflowStepKey ?? "task"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">{agent.name}</h2>
            <p className="text-sm text-purple-300/70">{agent.role} · {agent.department}</p>
            <p className="mt-2 text-xs text-white/45">{agent.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Capacity</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${capacityColor[workload.capacityStatus]}`} />
                <span className="text-sm font-medium text-white">{workload.capacityStatus}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Utilization</p>
              <p className="mt-1 text-sm font-bold text-white">{workload.utilization}%</p>
            </div>
            {metrics && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Score</p>
                <p className="mt-1 text-sm font-bold text-purple-300">{metrics.scores.overallScore}</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/50">
          <span>{workload.tasksCount} tasks</span>
          <span>{workload.reviewsCount} reviews</span>
          <span>{workload.approvalsCount} approvals</span>
          <span>{workload.deliverablesCount} deliverables</span>
        </div>
      </div>

      {isAdmin && (
        <>
          <AgentAIConfigPanel
            agentId={agent.id}
            config={workspace.aiConfig}
            modelMode={modelMode}
            providers={providers}
          />
          <AgentRuntimeActions
            agentId={agent.id}
            workflowId={activeWorkflow}
            stepKey={stepKey}
            sessions={workspace.runtimeSessions ?? []}
            conversations={workspace.conversations ?? []}
            assignedTasks={workspace.assignedTasks}
            agents={agents}
          />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assigned Tasks", value: workspace.assignedTasks.length },
          { label: "Pending Approvals", value: workspace.pendingApprovals.length },
          { label: "Documents", value: workspace.documentsCreated.length },
          { label: "Memories", value: workspace.memoriesCreated.length },
        ].map((stat) => (
          <div key={stat.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/40">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-white">Work Queue</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              ["Backlog", workQueue.backlog],
              ["In Progress", workQueue.inProgress],
              ["Blocked", workQueue.blocked],
              ["Review", workQueue.review],
              ["Due Soon", workQueue.dueSoon],
              ["Overdue", workQueue.overdue],
              ["Completed", workQueue.completed.slice(0, 5)],
            ] as const
          ).map(([label, tasks]) => (
            <div key={label} className="enterprise-glass rounded-xl border border-white/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/70">
                {label} ({tasks.length})
              </p>
              <ul className="mt-2 space-y-2">
                {tasks.length === 0 ? (
                  <li className="text-xs text-white/35">None</li>
                ) : (
                  tasks.map((t) => (
                    <li key={t.id} className="rounded border border-white/5 p-2">
                      <p className="text-xs text-white/80">{t.title}</p>
                      <p className="mt-0.5 text-[10px] text-white/35">
                        {t.progressPercentage}% · {t.status.replace("_", " ")}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Agent Knowledge</h3>
          <div className="mt-3 space-y-3 text-xs text-white/50">
            <p>{knowledge.memories.length} memories · {knowledge.decisions.length} decisions</p>
            <p>{knowledge.documents.length} documents · {knowledge.workflowContributions} workflow steps</p>
            <p>{knowledge.approvalHistory.length} approval requests</p>
          </div>
          {knowledge.decisions.slice(0, 3).map((d) => (
            <div key={d.id} className="mt-2 rounded border border-white/5 p-2">
              <p className="text-xs text-white/80">{d.title}</p>
            </div>
          ))}
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          <ul className="mt-3 space-y-2">
            {workspace.recentActivity.length === 0 ? (
              <li className="text-xs text-white/40">No recent activity.</li>
            ) : (
              workspace.recentActivity.map((a) => (
                <li key={a.id} className="border-b border-white/5 pb-2 last:border-0">
                  <p className="text-xs text-white/80">{a.action}</p>
                  <p className="text-[10px] text-white/35">{formatTime(a.createdAt)}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">COO Inbox</h3>
          <p className="mt-1 text-[10px] text-white/40">Assigned by COO · session work queue</p>
          <ul className="mt-3 space-y-2">
            {(workspace.sessionHandoffs ?? []).length === 0 ? (
              <li className="text-xs text-white/40">Nothing waiting for you.</li>
            ) : (
              (workspace.sessionHandoffs ?? []).slice(0, 6).map((h) => (
                <li key={h.id} className="rounded border border-cyan-400/15 p-3">
                  <p className="text-[10px] text-cyan-300/70">
                    {h.status} · Assigned by COO
                  </p>
                  <p className="mt-1 font-mono text-xs text-purple-300">{h.artifactName ?? h.toStepKey}</p>
                  <p className="mt-1 text-[10px] text-white/50">{h.reason}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Agent Handoffs</h3>
          <ul className="mt-3 space-y-2">
            {(workspace.handoffs ?? []).length === 0 ? (
              <li className="text-xs text-white/40">No handoffs yet.</li>
            ) : (
              (workspace.handoffs ?? []).slice(0, 6).map((h) => (
                <li key={h.id} className="rounded border border-white/5 p-3">
                  <p className="text-[10px] text-purple-300/70">
                    {h.stepKey} · {h.approvalStatus}
                  </p>
                  <p className="mt-1 text-xs font-medium text-white/80">{h.objective}</p>
                  {h.requirements && (
                    <p className="mt-1 line-clamp-2 text-[10px] text-white/45">{h.requirements}</p>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Agent Conversations</h3>
          <ul className="mt-3 space-y-2">
            {(workspace.conversations ?? []).length === 0 ? (
              <li className="text-xs text-white/40">No agent conversations yet.</li>
            ) : (
              (workspace.conversations ?? []).slice(0, 8).map((c) => (
                <li key={c.id} className="rounded border border-white/5 p-3">
                  <p className="text-[10px] text-purple-300/70">
                    {c.senderAgentName ?? "System"} → {c.receiverAgentName ?? "Team"} · {c.messageType}
                  </p>
                  <p className="mt-1 text-xs text-white/80">{c.message}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="flex gap-3">
        <Link
          href="/sai/agents"
          className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60 hover:bg-white/5"
        >
          ← Back to Agent Factory
        </Link>
        <Link
          href="/sai/execution"
          className="rounded-lg border border-purple-400/30 px-4 py-2 text-xs text-purple-300 hover:bg-purple-500/10"
        >
          View Execution Board
        </Link>
        <Link
          href="/sai/settings/ai"
          className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60 hover:bg-white/5"
        >
          AI Settings
        </Link>
      </div>
    </div>
  );
}
