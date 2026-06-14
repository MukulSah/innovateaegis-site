"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FounderSessionTimelinePanel } from "@/components/sai/founder-session-timeline-panel";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";
import type { SessionTruth } from "@/lib/sai/session-truth-engine";
import type { SessionRecoveryAnalysis } from "@/lib/sai/session-recovery";
import type { SessionHandoff, WorkflowApproval } from "@/lib/sai/types";
import { useDebouncedRouterRefresh } from "@/lib/sai/use-debounced-router-refresh";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

type SessionArtifactSummary = {
  id: string;
  stepKey: string;
  artifactName: string | null;
  artifactType: string | null;
  createdAt: string;
};

type RecommendedAction = {
  id: string;
  label: string;
  action: string;
  priority: "critical" | "high" | "medium";
  reason: string;
};

type CommandCenterPayload = {
  truth: SessionTruth;
  progress: number;
  handoffs: SessionHandoff[];
  pendingApprovals: WorkflowApproval[];
  approvalHistory: WorkflowApproval[];
  artifacts: SessionArtifactSummary[];
  recovery: SessionRecoveryAnalysis | null;
  needsFinalization: boolean;
  recommendedActions: RecommendedAction[];
  generatedAt: string;
};

type Props = {
  sessionId: string | null;
  onApprovalDecision?: (id: string, decision: string) => Promise<void>;
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusPillClass(status: string): string {
  if (status === "completed") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "blocked" || status === "stalled" || status === "failed") {
    return "border-red-400/30 bg-red-500/10 text-red-200";
  }
  if (status === "waiting_approval" || status === "recovery") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }
  if (status === "waiting_for_ai_capacity") {
    return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
  }
  return "border-white/10 bg-white/5 text-white/55";
}

function priorityClass(priority: RecommendedAction["priority"]) {
  if (priority === "critical") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (priority === "high") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-white/15 bg-white/5 text-white/70";
}

export function FounderSessionDetailPanel({ sessionId, onApprovalDecision }: Props) {
  const refreshPage = useDebouncedRouterRefresh(15_000);
  const [data, setData] = useState<CommandCenterPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const route = `/api/sai/sessions/${sessionId}/command-center`;
      const res = await fetch(route);
      const payload = await parseJsonResponse<CommandCenterPayload>(res, route);
      if (!res.ok) throw new Error((payload as { error?: string }).error ?? "Failed to load session");
      setData(payload);
    } catch (err) {
      setError(formatClientApiError(err, "Mission Control"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useSaiRealtimeSync(() => {
    load().catch(() => {});
  }, [
    "workflow_runs",
    "workflow_approvals",
    "workflow_run_steps",
    "session_artifacts",
    "session_handoffs",
    "ai_retry_queue",
    "ai_execution_events",
  ], { debounceMs: 2000, minIntervalMs: 6000 });

  useEffect(() => {
    load();
  }, [load]);

  async function runRecoveryAction(action: string, extra?: Record<string, string>) {
    if (!sessionId) return;
    setActionLoading(action);
    setError("");
    try {
      const route = `/api/sai/sessions/${sessionId}/recovery`;
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await parseJsonResponse<{ error?: string }>(res, route);
      if (!res.ok) throw new Error(body.error ?? "Action failed");
      await load();
      refreshPage();
    } catch (err) {
      setError(formatClientApiError(err, "Recovery API"));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApproval(id: string, decision: string) {
    setApprovalLoadingId(id);
    try {
      if (onApprovalDecision) {
        await onApprovalDecision(id, decision);
      } else {
        const route = `/api/sai/approvals/${id}`;
        const res = await fetch(route, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, comments: "" }),
        });
        await parseJsonResponse(res, route);
      }
      await load();
      refreshPage();
    } catch (err) {
      setError(formatClientApiError(err, "Approval API"));
    } finally {
      setApprovalLoadingId(null);
    }
  }

  if (!sessionId) {
    return (
      <section className="enterprise-glass rounded-xl border border-dashed border-white/15 p-10 text-center">
        <p className="text-sm text-white/45">Select a session from the sidebar to inspect live state.</p>
      </section>
    );
  }

  if (loading && !data) {
    return (
      <section className="enterprise-glass animate-pulse rounded-xl border border-purple-400/20 p-8">
        <div className="h-6 w-48 rounded bg-white/10" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-white/5" />
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-white/5" />
          ))}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-red-400/20 bg-red-500/5 p-6 text-sm text-red-200">
        {error || "Could not load session."}
      </section>
    );
  }

  const { truth, progress, handoffs, pendingApprovals, approvalHistory, artifacts, recovery, recommendedActions } =
    data;

  return (
    <div className="space-y-5">
      {/* Command center header */}
      <section className="enterprise-glass rounded-xl border border-cyan-400/25 p-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-cyan-300/80">Mission Control</p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Session #{truth.sessionNumber ?? "—"} — {truth.projectName}
            </h2>
            <p className="mt-1 text-sm text-white/60">{truth.objective}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusPillClass(truth.sessionStatus)}`}>
                {truth.sessionStatus.replace(/_/g, " ")}
              </span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/45">
                workflow: {truth.workflowStatus}
              </span>
              {truth.isComplete && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                  Finalized
                </span>
              )}
              {data.needsFinalization && (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                  Finalization pending
                </span>
              )}
              {truth.queueActive && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                  AI queue active
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/sai/sessions/${sessionId}`}
              className="rounded-lg border border-purple-400/30 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-500/10"
            >
              Workflow detail →
            </Link>
            <button
              type="button"
              onClick={() => load()}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              Refresh
            </button>
          </div>
        </header>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Current Stage" value={truth.currentStage ?? truth.workflowStage ?? "—"} />
          <Metric label="Current Agent" value={truth.currentAgentName ?? "none"} />
          <Metric label="Next Agent" value={truth.nextAgentName ?? "—"} />
          <Metric label="Progress" value={`${progress}%`} accent="text-emerald-300" />
          <Metric label="Current Deliverable" value={truth.currentDeliverable ?? "—"} mono accent="text-purple-300" />
          <Metric label="Current Artifact" value={truth.currentArtifact ?? "—"} mono accent="text-cyan-300" />
          <Metric
            label="Execution Health"
            value={`${truth.executionHealth}%`}
            accent={truth.executionHealth >= 70 ? "text-emerald-300" : "text-amber-200"}
          />
          <Metric
            label="Strategic Health"
            value={`${truth.strategicHealth}%`}
            accent={truth.strategicHealth >= 70 ? "text-purple-300" : "text-amber-200"}
          />
        </dl>

        {truth.lastError && (
          <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-100/90">
            <span className="font-semibold uppercase tracking-wider text-red-300/80">Last error · </span>
            {truth.lastError}
          </div>
        )}

        {recommendedActions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Recommended actions</p>
            {recommendedActions.map((rec) => (
              <div
                key={rec.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${priorityClass(rec.priority)}`}
              >
                <div>
                  <p className="text-sm font-medium">{rec.label}</p>
                  <p className="mt-0.5 text-xs opacity-80">{rec.reason}</p>
                </div>
                {rec.action !== "view_approvals" && rec.action !== "retry_queue" && (
                  <button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={() => runRecoveryAction(rec.action)}
                    className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs hover:bg-black/30 disabled:opacity-50"
                  >
                    {actionLoading === rec.action ? "Running…" : "Run"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {data.needsFinalization && (
            <ActionButton
              label={actionLoading === "finalize_session" ? "Finalizing…" : "Run Finalization Engine"}
              onClick={() => runRecoveryAction("finalize_session")}
              disabled={actionLoading !== null}
              variant="success"
            />
          )}
          {recovery?.canResume && !truth.isComplete && (
            <ActionButton
              label={actionLoading === "resume" ? "Resuming…" : "Resume Session"}
              onClick={() => runRecoveryAction("resume")}
              disabled={actionLoading !== null}
              variant="success"
            />
          )}
          <ActionButton
            label={actionLoading === "reconcile_state" ? "Reconciling…" : "Reconcile State"}
            onClick={() => runRecoveryAction("reconcile_state")}
            disabled={actionLoading !== null}
          />
          {recovery?.canRequestClose && (
            <ActionButton
              label="Request Close"
              onClick={() => {
                const reason = window.prompt("Reason for close request:");
                if (reason?.trim()) runRecoveryAction("request_close", { reason: reason.trim() });
              }}
              disabled={actionLoading !== null}
            />
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <FounderSessionTimelinePanel
          sessionId={truth.sessionId}
          sessionNumber={truth.sessionNumber}
          objective={truth.objective}
          timeline={truth.timeline}
          isComplete={truth.isComplete}
        />

        <div className="space-y-5">
          {/* Handoffs */}
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Handoffs ({handoffs.length})
            </h3>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {handoffs.length === 0 ? (
                <li className="text-sm text-white/40">No handoffs recorded yet.</li>
              ) : (
                handoffs.slice(0, 12).map((h) => (
                  <li key={h.id} className="rounded-lg border border-white/5 p-3 text-xs text-white/75">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-purple-300">{h.artifactName ?? h.toStepKey ?? "handoff"}</span>
                      <span className="capitalize text-white/40">{h.status}</span>
                    </div>
                    <p className="mt-1 text-white/50">
                      {h.fromStepKey ?? "?"} → {h.toStepKey ?? "?"}
                    </p>
                    {h.reason && <p className="mt-1 line-clamp-2 text-white/45">{h.reason}</p>}
                    <p className="mt-1 text-[10px] text-white/30">{formatWhen(h.createdAt)}</p>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* Pending approvals */}
          <section className="enterprise-glass rounded-xl border border-amber-400/20 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
              Pending Approvals ({pendingApprovals.length})
            </h3>
            <ul className="mt-3 space-y-3">
              {pendingApprovals.length === 0 ? (
                <li className="text-sm text-white/40">None blocking this session.</li>
              ) : (
                pendingApprovals.map((a) => (
                  <li key={a.id} className="rounded-lg border border-amber-400/15 bg-amber-500/5 p-3">
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <p className="mt-1 text-[10px] uppercase text-amber-200/70">
                      {a.approvalType.replace(/_/g, " ")} · {a.requestedBy}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["approved", "rejected", "revision_required"] as const).map((decision) => (
                        <button
                          key={decision}
                          type="button"
                          disabled={approvalLoadingId === a.id}
                          onClick={() => handleApproval(a.id, decision)}
                          className="rounded border border-white/15 px-2 py-0.5 text-[10px] capitalize text-white hover:bg-white/10 disabled:opacity-50"
                        >
                          {decision.replace("_", " ")}
                        </button>
                      ))}
                      <Link href={`/sai/approvals/${a.id}`} className="text-[10px] text-purple-300 hover:underline">
                        Details →
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

      {/* Artifacts */}
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Session Artifacts ({artifacts.length})
        </h3>
        {artifacts.length === 0 ? (
          <p className="mt-3 text-sm text-white/40">No artifacts generated yet.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {artifacts.map((a) => (
              <span
                key={a.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/70"
                title={formatWhen(a.createdAt)}
              >
                <span className="font-mono text-cyan-300/90">{a.artifactName ?? a.stepKey}</span>
                <span className="ml-1.5 text-white/35">{a.stepKey}</span>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/40">
          {truth.knowledgeArchiveExists && (
            <span className="text-emerald-300/80">✓ knowledge_archive_v1</span>
          )}
          {truth.finalReportExists && (
            <span className="text-emerald-300/80">✓ session_final_report_v1</span>
          )}
          {truth.executiveReviewExists && (
            <span className="text-emerald-300/80">✓ executive_review_v1</span>
          )}
        </div>
      </section>

      {/* Approval history for this session */}
      {approvalHistory.length > 0 && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Approval History</h3>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {approvalHistory.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-2 border-b border-white/5 pb-2 text-xs">
                <span className="text-white/35">{formatWhen(h.approvedAt ?? h.requestedAt)}</span>
                <span className="text-white/85">{h.title}</span>
                <span className="capitalize text-purple-300">{h.status.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[10px] text-white/25">
        Truth synced {formatWhen(data.generatedAt)} · source: workflow_runs + session-truth-engine
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <dt className="text-[10px] text-white/40">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium text-white ${mono ? "font-mono" : ""} ${accent ?? ""}`}>
        {value}
      </dd>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "success";
}) {
  const cls =
    variant === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50 ${cls}`}
    >
      {label}
    </button>
  );
}
