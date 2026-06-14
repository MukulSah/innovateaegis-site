"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AgentAIConfigPanel } from "@/components/sai/agent-ai-config-panel";
import { AgentRuntimeActions } from "@/components/sai/agent-runtime-actions";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";
import type { Agent, AgentWorkspace, AIProvider, AIModelMode, WorkflowRun } from "@/lib/sai/types";
import type { SessionStateView } from "@/lib/sai/session-state-view";

type TabId =
  | "overview"
  | "sessions"
  | "knowledge"
  | "decisions"
  | "deliverables"
  | "performance"
  | "learning"
  | "activity";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
  { id: "knowledge", label: "Knowledge" },
  { id: "decisions", label: "Decisions" },
  { id: "deliverables", label: "Deliverables" },
  { id: "performance", label: "Performance" },
  { id: "learning", label: "Learning" },
  { id: "activity", label: "Activity" },
];

type Props = {
  workspace: AgentWorkspace;
  sessionHistory: {
    workflow: WorkflowRun;
    progressPercent: number;
    state: SessionStateView | null;
  }[];
  isAdmin?: boolean;
  modelMode?: AIModelMode;
  providers?: AIProvider[];
  agents?: Agent[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

export function AgentDesignationWorkspaceView({
  workspace,
  sessionHistory,
  isAdmin = false,
  modelMode = "single",
  providers = [],
  agents = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || "overview";

  useSaiRealtimeSync(
    () => router.refresh(),
    ["workflow_runs", "workflow_run_steps", "agent_runtime_sessions", "activity_feed", "workflow_approvals"],
    { debounceMs: 2500, minIntervalMs: 5000 },
  );

  const { agent, workload, workQueue, knowledge, metrics } = workspace;
  const activeTask = workspace.assignedTasks.find((t) => t.workflowRunId);
  const activeWorkflow = activeTask?.workflowRunId ?? null;
  const stepKey = activeTask?.workflowStepKey ?? "requirements";

  const learningMemories = knowledge.memories.filter(
    (m) => m.memoryType === "lesson" || m.memoryType === "knowledge",
  );

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-purple-300/70">{agent.department} · Designation Workspace</p>
            <h2 className="mt-1 text-xl font-bold text-white">{agent.name}</h2>
            <p className="text-sm text-purple-300/70">{agent.role}</p>
          </div>
          <Link href="/sai/organization?section=agent-center" className="text-xs text-white/50 hover:text-white">
            ← Organization
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-white/10 pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-3 py-2 text-xs font-medium transition ${
                tab === t.id
                  ? "bg-purple-500/20 text-white"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <>
          <section className="enterprise-glass rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5">
            <h3 className="text-sm font-semibold text-white">Live Session</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase text-white/40">Current Session</p>
                <p className="text-sm font-medium text-white">
                  {activeWorkflow ? "Active" : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase text-white/40">Project</p>
                <p className="text-sm font-medium text-white truncate">{activeTask?.projectName ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase text-white/40">Workflow Step</p>
                <p className="text-sm font-medium text-white">{activeTask?.workflowStepKey ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase text-white/40">COO Inbox</p>
                <p className="text-sm font-medium text-amber-300">{(workspace.sessionHandoffs ?? []).length}</p>
              </div>
            </div>
          </section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Utilization", value: `${workload.utilization}%` },
              { label: "Capacity", value: workload.capacityStatus },
              { label: "Pending Reviews", value: workQueue.review.length },
              { label: "Score", value: metrics?.scores.overallScore ?? agent.performanceScore },
            ].map((stat) => (
              <div key={stat.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
                <p className="text-[10px] uppercase text-white/40">{stat.label}</p>
                <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "sessions" && (
        <div className="space-y-4">
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">Runtime Sessions</h3>
            <ul className="mt-3 space-y-2">
              {(workspace.runtimeSessions ?? []).length === 0 ? (
                <li className="text-xs text-white/40">No runtime sessions recorded.</li>
              ) : (
                (workspace.runtimeSessions ?? []).map((s) => (
                  <li key={s.id} className="rounded border border-white/5 p-3">
                    <p className="text-xs text-white">{s.status} · {s.modelName}</p>
                    <p className="text-[10px] text-white/40">{formatTime(s.createdAt)}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">Session History</h3>
            <ul className="mt-3 space-y-2">
              {sessionHistory.length === 0 ? (
                <li className="text-xs text-white/40">No workflow sessions linked yet.</li>
              ) : (
                sessionHistory.map(({ workflow, progressPercent, state }) => (
                  <li key={workflow.id} className="rounded border border-white/5 p-3">
                    <Link href={`/sai/sessions/${workflow.id}`} className="text-sm text-cyan-300 hover:underline">
                      Session #{workflow.sessionNumber ?? "—"} · {workflow.projectName}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">{workflow.objective}</p>
                    <p className="mt-1 text-[10px] text-white/35">
                      {state?.currentStage ?? workflow.currentStage ?? workflow.status} · {progressPercent}%
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">COO Session Handoffs</h3>
            <ul className="mt-3 space-y-2">
              {(workspace.sessionHandoffs ?? []).length === 0 ? (
                <li className="text-xs text-white/40">Nothing waiting.</li>
              ) : (
                (workspace.sessionHandoffs ?? []).map((h) => (
                  <li key={h.id} className="rounded border border-cyan-400/15 p-3">
                    <p className="text-[10px] text-cyan-300/70">{h.status}</p>
                    <p className="text-xs text-white/80">{h.artifactName ?? h.toStepKey}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {tab === "knowledge" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Knowledge</h3>
          <p className="mt-1 text-xs text-white/45">
            {knowledge.memories.length} memories · {knowledge.documents.length} documents · {knowledge.workflowContributions} workflow steps
          </p>
          <ul className="mt-4 space-y-2">
            {knowledge.memories.slice(0, 20).map((m) => (
              <li key={m.id} className="rounded border border-white/5 p-3">
                <p className="text-[10px] uppercase text-purple-300/70">{m.memoryType}</p>
                <p className="text-sm text-white">{m.title}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "decisions" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Decisions</h3>
          <ul className="mt-3 space-y-2">
            {knowledge.decisions.length === 0 ? (
              <li className="text-xs text-white/40">No decisions recorded.</li>
            ) : (
              knowledge.decisions.map((d) => (
                <li key={d.id} className="rounded border border-white/5 p-3">
                  <p className="text-sm text-white">{d.title}</p>
                  <p className="mt-1 text-xs text-white/50">{d.decision}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {tab === "deliverables" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Deliverables & Documents</h3>
          <ul className="mt-3 space-y-2">
            {workspace.documentsCreated.length === 0 ? (
              <li className="text-xs text-white/40">No deliverables yet.</li>
            ) : (
              workspace.documentsCreated.map((d) => (
                <li key={d.id} className="rounded border border-white/5 p-3">
                  <p className="text-sm text-white">{d.title}</p>
                  <p className="text-[10px] text-white/40">{d.type}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {tab === "performance" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Performance</h3>
          {metrics ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(metrics.scores).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-white/[0.03] p-3">
                  <dt className="text-[10px] uppercase text-white/40">{key.replace(/([A-Z])/g, " $1")}</dt>
                  <dd className="text-lg font-bold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-white/40">No metrics computed yet.</p>
          )}
        </section>
      )}

      {tab === "learning" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Learning</h3>
          <ul className="mt-3 space-y-2">
            {learningMemories.length === 0 ? (
              <li className="text-xs text-white/40">No learning records yet.</li>
            ) : (
              learningMemories.map((m) => (
                <li key={m.id} className="rounded border border-white/5 p-3">
                  <p className="text-sm text-white">{m.title}</p>
                  <p className="mt-1 text-xs text-white/50">{m.summary}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {tab === "activity" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Activity</h3>
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
      )}

      {isAdmin && tab === "overview" && (
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
    </div>
  );
}
