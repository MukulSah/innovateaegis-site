"use client";

import Link from "next/link";
import { AgentFeed } from "@/components/sai/agent-feed";
import type { ExecutionCenterData } from "@/lib/sai/types";

type Props = { data: ExecutionCenterData };

function EngineCard({ label, status }: { label: string; status: string }) {
  return (
    <div className="enterprise-glass rounded-xl border border-white/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 text-sm font-medium text-cyan-300">{status}</p>
    </div>
  );
}

export function ExecutionCenterView({ data }: Props) {
  const primary = data.activeSessions[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EngineCard label="Orchestrator Engine" status={data.engineStatus.orchestrator} />
        <EngineCard label="Workflow Engine" status={data.engineStatus.workflowEngine} />
        <EngineCard label="Session Manager" status={data.engineStatus.sessionManager} />
        <EngineCard label="Context Engine" status={data.engineStatus.contextEngine} />
      </div>

      {primary ? (
        <section className="enterprise-glass rounded-xl border border-purple-400/20 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-purple-300/70">
                Active Session #{primary.workflow.sessionNumber ?? "—"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">{primary.workflow.objective}</h2>
              <p className="mt-1 text-sm text-white/50">
                Project: {primary.workflow.projectName ?? "—"} · {primary.workflow.currentStage ?? "In progress"}
              </p>
            </div>
            <Link
              href={`/sai/workflows/${primary.workflow.id}`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-purple-400/40"
            >
              Open Session
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] text-white/40">Executive Sponsor</p>
              <p className="text-sm text-white">{primary.workflow.executiveSponsorName ?? "CEO Agent"}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40">Session Owner</p>
              <p className="text-sm text-white">{primary.workflow.sessionOwnerName ?? "COO Agent"}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40">Current Agent</p>
              <p className="text-sm text-white">{primary.currentAgentName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40">Next Agent</p>
              <p className="text-sm text-white">{primary.nextAgentName ?? "—"}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Progress</p>
              <p className="text-lg font-bold text-white">{primary.progressPercent}%</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Tasks</p>
              <p className="text-lg font-bold text-white">
                {primary.tasksComplete}/{primary.tasksTotal}
              </p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Pending Approvals</p>
              <p className="text-lg font-bold text-amber-300">{primary.pendingApprovals}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Open Risks</p>
              <p className="text-lg font-bold text-red-300">{primary.openRisks}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-white">Agent Feed</h3>
            <p className="mt-1 text-xs text-white/45">
              Session #{primary.workflow.sessionNumber ?? "—"} — digital employees at work
            </p>
            <div className="mt-4">
              <AgentFeed
                items={primary.agentFeed}
                showApprovalActions
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="enterprise-glass rounded-xl border border-white/10 p-8 text-center">
          <p className="text-white/50">No active sessions. Launch an objective from Founder Workspace.</p>
          <Link href="/sai/founder" className="mt-3 inline-block text-sm text-purple-300 hover:underline">
            Go to Founder Workspace
          </Link>
        </section>
      )}

      {data.activeSessions.length > 1 && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Other Active Sessions</h3>
          <ul className="mt-3 space-y-2">
            {data.activeSessions.slice(1).map((s) => (
              <li key={s.workflow.id}>
                <Link
                  href={`/sai/workflows/${s.workflow.id}`}
                  className="block rounded-lg border border-white/5 p-3 hover:border-purple-400/30"
                >
                  <p className="text-sm text-white">
                    Session #{s.workflow.sessionNumber} — {s.workflow.objective}
                  </p>
                  <p className="text-xs text-white/40">{s.workflow.projectName}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] text-white/40">Active Workflows</p>
          <p className="text-2xl font-bold text-white">{data.stats.activeWorkflows}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] text-white/40">Blocked Tasks</p>
          <p className="text-2xl font-bold text-red-300">{data.stats.blockedTasks}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] text-white/40">Approvals Pending</p>
          <p className="text-2xl font-bold text-amber-300">{data.stats.approvalsPending}</p>
        </div>
      </div>
    </div>
  );
}
