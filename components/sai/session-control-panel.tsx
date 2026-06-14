"use client";

import { useCallback, useEffect, useState } from "react";
import { formatClientApiError } from "@/lib/sai/client-api";
import { SessionAlertsPanel } from "@/components/sai/session-alerts-panel";
import { SessionCosAskInline } from "@/components/sai/session-cos-ask-inline";
import {
  loadSessionRecoveryAction,
  runSessionControlAction,
} from "@/lib/sai/session-workspace-actions";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";
import type { SessionTruth } from "@/lib/sai/session-truth-engine";

type RecoveryAnalysis = {
  sessionStatus: string;
  recommendedAction: string;
  isStalled: boolean;
  stallReasons: string[];
  progress: number;
  progressLabel: string;
  canResume: boolean;
  canForceClose: boolean;
  needsFinalization?: boolean;
  needsFounderReview?: boolean;
  canFounderAcknowledge?: boolean;
  canAcknowledgeClose?: boolean;
  validationSummary?: string | null;
  validationChecks?: { label: string; passed: boolean; detail: string }[];
  hasKnowledgeArchive?: boolean;
  sessionBlockers?: string[];
  lastExecutionError?: string | null;
  missingKnowledgeArchive?: boolean;
};

type Props = {
  sessionId: string;
  truth: SessionTruth;
};

export function SessionControlPanel({ sessionId, truth }: Props) {
  const [recovery, setRecovery] = useState<RecoveryAnalysis | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ackNote, setAckNote] = useState("");

  const loadRecovery = useCallback(async () => {
    try {
      const data = await loadSessionRecoveryAction(sessionId);
      if (data) setRecovery(data as RecoveryAnalysis);
    } catch {
      // best-effort
    }
  }, [sessionId]);

  useEffect(() => {
    loadRecovery();
  }, [loadRecovery]);

  useSaiRealtimeSync(loadRecovery, ["workflow_runs", "workflow_approvals", "session_artifacts", "session_finalization_events", "activity_feed", "workflow_events"], {
    debounceMs: 3000,
    minIntervalMs: 8000,
  });

  async function runAction(action: string, options?: { reason?: string; note?: string }) {
    setLoading(action);
    setError("");
    setMessage("");
    try {
      const result = await runSessionControlAction(sessionId, action, options);
      const reason = (result as { reason?: string })?.reason;
      if (reason) setMessage(reason);
      else setMessage(`${action.replace(/_/g, " ")} completed`);
      await loadRecovery();
    } catch (err) {
      setError(formatClientApiError(err, "Session control"));
    } finally {
      setLoading(null);
    }
  }

  const blockers = [
    ...(recovery?.sessionBlockers ?? []),
    ...(truth.finalizationBlockedReason && !recovery?.sessionBlockers?.includes(truth.finalizationBlockedReason)
      ? [truth.finalizationBlockedReason]
      : []),
    ...(truth.lastError && !recovery?.sessionBlockers?.includes(truth.lastError) ? [truth.lastError] : []),
  ].filter((b, i, arr) => arr.indexOf(b) === i);

  const showAcknowledge =
    recovery?.canAcknowledgeClose || recovery?.canFounderAcknowledge || recovery?.needsFounderReview;

  const isTerminal = ["completed", "cancelled", "failed"].includes(truth.sessionStatus);
  const hasToolError = Boolean(
    recovery?.lastExecutionError?.includes("Tool access denied") ||
      recovery?.lastExecutionError?.includes("lacks permission"),
  );

  return (
    <div className="space-y-4">
      <SessionAlertsPanel sessionId={sessionId} />

      <section className="enterprise-glass rounded-xl border border-purple-400/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Session Control</h3>
            <p className="mt-1 text-xs text-white/45">
              Founder execution controls — resume, finalize, acknowledge, and close this session.
            </p>
          </div>
          {recovery && (
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/55">
              {recovery.progressLabel ?? `${recovery.progress}%`} · {recovery.recommendedAction}
            </span>
          )}
        </div>

        {blockers.length > 0 && !isTerminal && (
          <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-amber-300/80">Session Blockers</p>
            <ul className="mt-2 space-y-1 text-xs text-white/70">
              {blockers.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </div>
        )}

        {showAcknowledge && !isTerminal && (
          <div className="mt-4 rounded-lg border border-cyan-400/25 bg-cyan-500/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
              Founder Acknowledge & Close
            </p>
            <p className="mt-2 text-xs text-white/70">
              {recovery?.needsFounderReview
                ? "Validation did not pass. Review checks and acknowledge to close for CEO records."
                : recovery?.missingKnowledgeArchive
                  ? "Knowledge archive is missing. Acknowledge the current outcome to close this session."
                  : "Session has blockers. Acknowledge the outcome to close and update status everywhere in COS."}
            </p>
            {recovery?.validationChecks && recovery.validationChecks.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-xs">
                {recovery.validationChecks.map((c) => (
                  <li key={c.label} className={c.passed ? "text-emerald-300/80" : "text-amber-200"}>
                    {c.passed ? "✓" : "✗"} {c.label} — {c.detail}
                  </li>
                ))}
              </ul>
            )}
            <textarea
              value={ackNote}
              onChange={(e) => setAckNote(e.target.value)}
              placeholder="CEO acknowledgment note (optional)"
              rows={2}
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              disabled={!!loading}
              onClick={() =>
                runAction("founder_acknowledge", {
                  note: ackNote.trim() || "Founder acknowledged session outcome",
                })
              }
              className="mt-3 rounded-lg bg-cyan-600/80 px-4 py-2 text-[10px] font-semibold text-white disabled:opacity-50"
            >
              {loading === "founder_acknowledge" ? "Acknowledging…" : "Acknowledge & Close Session"}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        {message && <p className="mt-3 text-xs text-emerald-300">{message}</p>}

        {!isTerminal && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(recovery?.canResume || hasToolError || recovery?.isStalled) && (
              <button
                type="button"
                disabled={!!loading}
                onClick={() => runAction(hasToolError ? "resolve_blockers" : "resume")}
                className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-[10px] font-medium text-white disabled:opacity-50"
              >
                {loading === "resume" || loading === "resolve_blockers"
                  ? "Resolving…"
                  : hasToolError
                    ? "COS Resolve & Resume"
                    : "Resume Session"}
              </button>
            )}
            <button
              type="button"
              disabled={!!loading}
              onClick={() => runAction("reconcile_state")}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] text-white disabled:opacity-50"
            >
              {loading === "reconcile_state" ? "Reconciling…" : "Reconcile State"}
            </button>
            {recovery?.hasKnowledgeArchive && !recovery?.needsFounderReview && (
              <button
                type="button"
                disabled={!!loading}
                onClick={() => runAction("finalize_session")}
                className="rounded-lg border border-purple-400/30 bg-purple-500/15 px-3 py-1.5 text-[10px] text-purple-100 disabled:opacity-50"
              >
                {loading === "finalize_session" ? "Finalizing…" : "Run Finalization"}
              </button>
            )}
            {recovery?.canForceClose && (
              <button
                type="button"
                disabled={!!loading}
                onClick={() => {
                  const reason = window.prompt(
                    "Reason for force close (session will stop everywhere in COS):",
                    "Founder stopped session",
                  );
                  if (reason) runAction("force_close", { reason });
                }}
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[10px] text-red-200 disabled:opacity-50"
              >
                {loading === "force_close" ? "Closing…" : "Force Close Session"}
              </button>
            )}
          </div>
        )}

        {isTerminal && (
          <p className="mt-4 text-sm text-white/45">
            Session is {truth.sessionStatus.replace(/_/g, " ")} — no execution controls available.
          </p>
        )}
      </section>

      <SessionCosAskInline sessionId={sessionId} tab="session-control" tabLabel="Session Control" />
    </div>
  );
}
