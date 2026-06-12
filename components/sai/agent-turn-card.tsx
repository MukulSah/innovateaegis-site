"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApprovalDebugTrail } from "@/components/sai/approval-debug-trail";
import type { ApprovalTrailStep } from "@/lib/sai/approval-trail";

export type AgentTurnData = {
  agentName: string;
  agentRole?: string;
  objective?: string;
  projectName?: string;
  body: string;
  artifactName?: string | null;
  priority?: string;
  expectedOutcome?: string;
  successMetric?: string;
  recommendation?: string;
  approvalId?: string | null;
  showActions?: boolean;
};

type Props = {
  turn: AgentTurnData;
  onDecision?: (decision: "approved" | "rejected" | "revision_required") => void;
};

export function AgentTurnCard({ turn, onDecision }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [debugSteps, setDebugSteps] = useState<ApprovalTrailStep[]>([]);

  async function decide(decision: "approved" | "rejected" | "revision_required") {
    if (!turn.approvalId) {
      onDecision?.(decision);
      return;
    }
    setLoading(decision);
    setError("");
    setDebugSteps([]);
    try {
      const res = await fetch(`/api/sai/approvals/${turn.approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.steps)) setDebugSteps(data.steps);
        throw new Error(data.error || "Failed");
      }
      onDecision?.(decision);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <article className="rounded-xl border border-purple-400/25 bg-gradient-to-br from-purple-500/10 to-transparent p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-purple-300/80">{turn.agentName}</p>
          {turn.agentRole && <p className="text-xs text-white/45">{turn.agentRole}</p>}
        </div>
        {turn.projectName && (
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
            {turn.projectName}
          </span>
        )}
      </header>

      {turn.objective && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Objective</p>
          <p className="mt-1 text-sm font-medium text-white">{turn.objective}</p>
        </div>
      )}

      <div className="mt-4 prose prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{turn.body}</div>
      </div>

      {(turn.priority || turn.expectedOutcome || turn.successMetric) && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          {turn.priority && (
            <div className="rounded-lg bg-white/[0.04] p-3">
              <dt className="text-[10px] text-white/40">Priority</dt>
              <dd className="text-sm font-medium capitalize text-amber-200">{turn.priority}</dd>
            </div>
          )}
          {turn.expectedOutcome && (
            <div className="rounded-lg bg-white/[0.04] p-3 sm:col-span-2">
              <dt className="text-[10px] text-white/40">Expected Outcome</dt>
              <dd className="text-sm text-white/80">{turn.expectedOutcome}</dd>
            </div>
          )}
          {turn.successMetric && (
            <div className="rounded-lg bg-white/[0.04] p-3 sm:col-span-3">
              <dt className="text-[10px] text-white/40">Success Metrics</dt>
              <dd className="text-sm text-white/80">{turn.successMetric}</dd>
            </div>
          )}
        </dl>
      )}

      {turn.recommendation && (
        <p className="mt-3 text-sm text-emerald-300/90">
          Recommendation: <span className="text-white/80">{turn.recommendation}</span>
        </p>
      )}

      {turn.artifactName && (
        <p className="mt-4 text-xs text-white/45">
          Artifact: <span className="font-mono text-purple-300">{turn.artifactName}</span>
        </p>
      )}

      {turn.showActions && turn.approvalId && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            disabled={Boolean(loading)}
            onClick={() => decide("approved")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading === "approved" ? "Approving…" : "Approve Strategy"}
          </button>
          <button
            type="button"
            disabled={Boolean(loading)}
            onClick={() => decide("revision_required")}
            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200 disabled:opacity-50"
          >
            Request Changes
          </button>
          <button
            type="button"
            disabled={Boolean(loading)}
            onClick={() => decide("rejected")}
            className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs text-red-200 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {debugSteps.length > 0 && (
        <div className="mt-3">
          <ApprovalDebugTrail steps={debugSteps} errorMessage={error} />
        </div>
      )}
    </article>
  );
}
