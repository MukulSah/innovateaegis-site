"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiReliabilityPanel } from "@/components/sai/ai-reliability-panel";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";
import type { FounderSessionOverview } from "@/lib/sai/founder-session-overview";
import { useDebouncedRouterRefresh } from "@/lib/sai/use-debounced-router-refresh";

type Props = {
  overview: FounderSessionOverview;
};

function healthColor(score: number): string {
  if (score >= 80) return "text-emerald-300";
  if (score >= 70) return "text-amber-200";
  return "text-red-300";
}

function statusBadgeClass(status: string, isStalled: boolean): string {
  if (isStalled || status === "stalled") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if (status === "recovery") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
  return "border-white/10 text-white/50";
}

export function FounderActiveSessionPanel({ overview }: Props) {
  const refreshPage = useDebouncedRouterRefresh(15_000);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [showForceForm, setShowForceForm] = useState(false);
  const [needsFinalization, setNeedsFinalization] = useState(false);

  useEffect(() => {
    fetch(`/api/sai/sessions/${overview.sessionId}/truth`)
      .then(async (res) => {
        const data = await parseJsonResponse<{ truth?: { knowledgeArchiveExists?: boolean; isComplete?: boolean } }>(
          res,
          `/api/sai/sessions/${overview.sessionId}/truth`,
        );
        if (res.ok && data.truth) {
          setNeedsFinalization(Boolean(data.truth.knowledgeArchiveExists && !data.truth.isComplete));
        }
      })
      .catch(() => {});
  }, [overview.sessionId]);

  const displayStatus = overview.isStalled ? "stalled" : overview.sessionStatus;

  async function runAction(action: string, extra?: Record<string, string>) {
    setLoading(action);
    setError("");
    try {
      const route = `/api/sai/sessions/${overview.sessionId}/recovery`;
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await parseJsonResponse<{ error?: string }>(res, route);
      if (!res.ok) throw new Error(data.error || "Action failed");
      setShowCloseForm(false);
      setShowForceForm(false);
      setCloseReason("");
      refreshPage();
    } catch (err) {
      setError(formatClientApiError(err, "Session Recovery API"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="enterprise-glass mb-6 rounded-xl border border-purple-400/25 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-purple-300/80">Active Session</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Session #{overview.sessionNumber} — {overview.projectName}
          </h2>
          <p className="mt-1 text-sm text-white/60">{overview.objective}</p>
        </div>
        <Link
          href={`/sai/sessions/${overview.sessionId}`}
          className="rounded-lg border border-purple-400/30 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-500/10"
        >
          Open session →
        </Link>
      </header>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Current Agent</dt>
          <dd className="text-sm font-medium text-white">{overview.currentAgent ?? "None"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Execution Status</dt>
          <dd className="text-sm font-medium text-emerald-300">{overview.executionStatus}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Current Deliverable</dt>
          <dd className="font-mono text-sm text-purple-300">{overview.currentDeliverable ?? "—"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Current Artifact</dt>
          <dd className="font-mono text-sm text-cyan-300">{overview.currentArtifact ?? "—"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Execution Health</dt>
          <dd className={`text-sm font-semibold ${healthColor(overview.executionHealth)}`}>
            {overview.executionHealth}%
          </dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Strategic Health</dt>
          <dd className={`text-sm font-semibold ${healthColor(overview.strategicHealth)}`}>
            {overview.strategicHealth}%
          </dd>
        </div>
      </dl>

      {overview.aiReliability && (
        <div className="mt-4">
          <AiReliabilityPanel reliability={overview.aiReliability} compact />
        </div>
      )}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Execution Readiness</dt>
          <dd
            className={`text-sm font-semibold ${
              overview.executionReadiness === "READY" ? "text-emerald-300" : "text-amber-200"
            }`}
          >
            {overview.executionReadiness.replace("_", " ")}
          </dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Project Memory</dt>
          <dd className="text-sm text-white">{overview.projectMemoryConnected ? "Connected" : "Missing"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Drive Workspace</dt>
          <dd className="text-sm text-white">{overview.driveWorkspaceConnected ? "Connected" : "Not provisioned"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Repository</dt>
          <dd className="text-sm text-white">{overview.repositoryConnected ? "Connected" : "Not linked"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Documentation</dt>
          <dd className="text-sm capitalize text-white">{overview.documentationStatus}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Resources</dt>
          <dd className="text-sm capitalize text-white">{overview.resourceStatus}</dd>
        </div>
      </dl>

      {overview.executionReadiness === "NOT_READY" && overview.readinessGaps.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
          Readiness gaps: {overview.readinessGaps.join(", ")}.{" "}
          <Link href="/sai/resources" className="text-purple-300 hover:underline">
            Configure in Resource Center
          </Link>{" "}
          before PM proceeds.
          <button
            type="button"
            disabled={loading !== null}
            onClick={async () => {
              setLoading("readiness");
              setError("");
              try {
                const route = `/api/sai/projects/${overview.projectId}/readiness`;
                const res = await fetch(route, { method: "POST" });
                const data = await parseJsonResponse<{ error?: string }>(res, route);
                if (!res.ok) throw new Error(data.error || "Readiness check failed");
                refreshPage();
              } catch (err) {
                setError(formatClientApiError(err, "Readiness API"));
              } finally {
                setLoading(null);
              }
            }}
            className="ml-2 rounded border border-amber-400/30 px-2 py-0.5 text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
          >
            {loading === "readiness" ? "Checking…" : "Re-check Readiness"}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full border px-2 py-0.5 uppercase ${statusBadgeClass(overview.sessionStatus, overview.isStalled)}`}
        >
          {displayStatus.replace("_", " ")}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/45">
          Last activity: {overview.lastActivityLabel}
        </span>
        {overview.pendingApprovals > 0 && (
          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-amber-200">
            {overview.pendingApprovals} pending approval(s)
          </span>
        )}
        {overview.escalations > 0 && (
          <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-red-200">
            {overview.escalations} escalation(s)
          </span>
        )}
      </div>

      {overview.isStalled && overview.stallReasons.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">Stall Signals</p>
          <ul className="mt-2 space-y-1">
            {overview.stallReasons.map((r) => (
              <li key={r} className="text-xs text-amber-100/80">
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-white/50">{overview.recommendedAction}</p>
        </div>
      )}

      {(overview.ceoAlerts.length > 0 || overview.cooAlerts.length > 0) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {overview.ceoAlerts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-300/70">CEO Alerts</h3>
              <ul className="mt-2 space-y-1">
                {overview.ceoAlerts.map((alert) => (
                  <li key={alert} className="text-xs text-purple-200/80">
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {overview.cooAlerts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300/70">COO Alerts</h3>
              <ul className="mt-2 space-y-1">
                {overview.cooAlerts.map((alert) => (
                  <li key={alert} className="text-xs text-cyan-200/80">
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {overview.pendingCloseRequest && (
        <div className="mt-4 rounded-lg border border-purple-400/20 bg-purple-500/5 p-4">
          <p className="text-xs font-semibold text-purple-200">Closure Review Pending Your Approval</p>
          <p className="mt-1 text-sm text-white/70">{overview.pendingCloseRequest.recommendation}</p>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() =>
              runAction("approve_close", { closeRequestId: overview.pendingCloseRequest!.id })
            }
            className="mt-3 rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs text-purple-100 hover:bg-purple-500/30 disabled:opacity-50"
          >
            {loading === "approve_close" ? "Approving…" : "Approve Session Close"}
          </button>
        </div>
      )}

      {needsFinalization && (
        <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold text-emerald-200">Session Finalization Required</p>
          <p className="mt-1 text-sm text-white/70">
            Knowledge archive exists but the session is not closed. Run the Finalization Engine to
            complete Session #{overview.sessionNumber} and preserve history.
          </p>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => runAction("finalize_session")}
            className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {loading === "finalize_session" ? "Finalizing…" : "Run Finalization Engine"}
          </button>
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Recovery Actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => runAction("reconcile_state")}
            className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            {loading === "reconcile_state" ? "Reconciling…" : "Reconcile State"}
          </button>
          {overview.canResume && (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => runAction("resume")}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {loading === "resume" ? "Resuming…" : "Resume Session"}
            </button>
          )}
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => runAction("request_review")}
            className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {loading === "request_review" ? "Requesting…" : "Request COO Review"}
          </button>
          {overview.canRequestClose && (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => setShowCloseForm((v) => !v)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50"
            >
              Request Close Session
            </button>
          )}
          {overview.canForceClose && (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => setShowForceForm((v) => !v)}
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              Force Close Session
            </button>
          )}
        </div>

        {showCloseForm && (
          <div className="mt-3 space-y-2">
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              rows={2}
              placeholder="Why should this session close?"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={loading !== null || !closeReason.trim()}
              onClick={() => runAction("request_close", { reason: closeReason.trim() })}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              Submit Close Request
            </button>
          </div>
        )}

        {showForceForm && (
          <div className="mt-3 space-y-2">
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              rows={2}
              placeholder="Reason for force close (required)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={loading !== null || !closeReason.trim()}
              onClick={() => runAction("force_close", { reason: closeReason.trim() })}
              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-100 disabled:opacity-50"
            >
              Confirm Force Close
            </button>
          </div>
        )}

        {overview.stallOverrideAllowed && (
          <p className="mt-3 text-xs text-amber-200/80">
            Session stalled 24h+ — you may start a new objective to supersede this session.
          </p>
        )}

        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
    </section>
  );
}
