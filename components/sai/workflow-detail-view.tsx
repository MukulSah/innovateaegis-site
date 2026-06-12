"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AgentFeed } from "@/components/sai/agent-feed";
import type { AgentFeedItem } from "@/lib/sai/agent-feed";
import type { WorkflowDetail } from "@/lib/sai/types";

type Props = {
  detail: WorkflowDetail;
  agentFeed?: AgentFeedItem[];
  isAdmin: boolean;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function WorkflowDetailView({ detail, agentFeed = [], isAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { workflow, progress, activeAgent } = detail;
  const currentStep = workflow.steps.find((s) => s.status === "in_progress");

  async function completeStep() {
    if (!currentStep) return;
    setLoading(true);
    const res = await fetch(`/api/sai/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "advance",
        stepId: currentStep.id,
        output: "Step completed by owner",
      }),
    });
    if (res.ok) router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300/70">
            {workflow.sessionNumber ? `Session #${workflow.sessionNumber}` : `Workflow ${formatId(workflow.id)}`}
          </p>
          <h1 className="mt-1 text-xl font-bold text-white">{workflow.objective}</h1>
          <p className="mt-1 text-sm text-white/50">
            {workflow.projectName} · {workflow.currentStage ?? workflow.status.replace("_", " ")}
          </p>
          {(workflow.executiveSponsorName || workflow.sessionOwnerName) && (
            <p className="mt-2 text-xs text-white/45">
              Executive Sponsor: {workflow.executiveSponsorName ?? "CEO"} · Session Owner:{" "}
              {workflow.sessionOwnerName ?? "COO"}
            </p>
          )}
        </div>
        {isAdmin && currentStep && workflow.status === "running" && (
          <button
            type="button"
            disabled={loading}
            onClick={completeStep}
            className="rounded-lg border border-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-60"
          >
            Complete Current Step
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Progress", value: `${progress}%` },
          { label: "Health", value: `${detail.healthScore}` },
          { label: "Current Agent", value: activeAgent ?? workflow.currentAgentName ?? "—" },
          { label: "Next Agent", value: workflow.nextAgentName ?? "—" },
          { label: "Current Deliverable", value: workflow.currentDeliverable ?? "—" },
          { label: "Current Artifact", value: workflow.currentArtifact ?? "—" },
          { label: "Tasks", value: String(detail.tasks.length) },
        ].map((stat) => (
          <article key={stat.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-xs text-white/50">{stat.label}</p>
          </article>
        ))}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-purple-500" style={{ width: `${progress}%` }} />
      </div>

      <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
        <h2 className="text-sm font-semibold text-white">Agent Feed</h2>
        <p className="mt-1 text-xs text-white/45">Every agent turn, artifact, and approval gate</p>
        <div className="mt-4">
          <AgentFeed
            items={agentFeed}
            sessionLabel={
              workflow.sessionNumber ? `Session #${workflow.sessionNumber}` : undefined
            }
          />
        </div>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Execution Stream</h2>
        <ul className="mt-3 space-y-2">
          {detail.events.length === 0 ? (
            <li className="text-xs text-white/40">No events recorded yet.</li>
          ) : (
            detail.events.map((event) => (
              <li key={event.id} className="flex gap-3 border-b border-white/5 pb-2 text-xs last:border-0">
                <span className="shrink-0 text-white/35">{formatTime(event.createdAt)}</span>
                <div>
                  <p className="text-white/80">{event.title}</p>
                  <p className="text-white/45">{event.actor} · {event.description}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Requirements" items={detail.requirements.map((d) => d.title)} empty="No requirements yet" />
        <Section title="Architecture" items={detail.architecture.map((d) => d.title)} empty="No architecture docs yet" />
        <Section title="Milestones" items={detail.milestones.map((d) => d.title)} empty="No milestones yet" />
        <Section title="Decisions" items={detail.decisions.map((d) => d.title)} empty="No decisions recorded" />
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Tasks & Assignments</h2>
        <div className="mt-3 space-y-2">
          {detail.tasks.length === 0 ? (
            <p className="text-xs text-white/40">No tasks linked to this workflow.</p>
          ) : (
            detail.tasks.map((task) => {
              const assignments = detail.assignments.filter((a) => a.taskId === task.id);
              return (
                <div key={task.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <p className="text-sm text-white/85">{task.title}</p>
                  <p className="text-[10px] text-white/40">{task.status.replace("_", " ")}</p>
                  {assignments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {assignments.map((a) => (
                        <span key={a.id} className="rounded border border-purple-400/20 px-1.5 py-0.5 text-[10px] text-purple-200">
                          {a.role}: {a.agentName ?? a.groupName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Documents</h2>
          <ul className="mt-3 space-y-2">
            {detail.documents.length === 0 ? (
              <li className="text-xs text-white/40">No documents generated.</li>
            ) : (
              detail.documents.map((doc) => (
                <li key={doc.id} className="text-xs text-white/70">
                  <span className="text-purple-300/70">{doc.type}</span> — {doc.title}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Agent Memories</h2>
          <ul className="mt-3 space-y-2">
            {detail.agentMemories.length === 0 ? (
              <li className="text-xs text-white/40">No agent memories yet.</li>
            ) : (
              detail.agentMemories.map((mem) => (
                <li key={mem.id} className="text-xs text-white/70">
                  <span className="text-cyan-300/70">{mem.agentName}</span> — {mem.title}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="text-xs text-white/35">
        Created {formatTime(workflow.createdAt)} · Updated {formatTime(workflow.updatedAt)}
      </p>

      <Link href="/sai/control" className="text-xs text-purple-300 hover:text-purple-200">
        ← Back to Control Panel
      </Link>
    </div>
  );
}

function Section({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <ul className="mt-3 space-y-1">
        {items.length === 0 ? (
          <li className="text-xs text-white/40">{empty}</li>
        ) : (
          items.map((item) => (
            <li key={item} className="text-xs text-white/70">{item}</li>
          ))
        )}
      </ul>
    </section>
  );
}
