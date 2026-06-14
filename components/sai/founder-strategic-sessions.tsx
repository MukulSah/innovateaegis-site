"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { decideApprovalAction } from "@/lib/sai/approval-actions";
import { formatClientApiError } from "@/lib/sai/client-api";
import type { FounderAwaitingApproval, FounderSessionRow } from "@/lib/sai/founder-timeline";

type Props = {
  sessions: FounderSessionRow[];
  pendingApprovals?: FounderAwaitingApproval[];
};

const bucketStyles: Record<string, string> = {
  active: "border-emerald-400/25 bg-emerald-500/5 text-emerald-200",
  awaiting_approval: "border-amber-400/25 bg-amber-500/5 text-amber-200",
  blocked: "border-red-400/25 bg-red-500/5 text-red-200",
  needs_founder_review: "border-purple-400/25 bg-purple-500/5 text-purple-200",
  scheduled: "border-cyan-400/25 bg-cyan-500/5 text-cyan-200",
  completed: "border-cyan-400/20 bg-cyan-500/5 text-cyan-200",
  archived: "border-white/10 bg-white/[0.02] text-white/45",
  cancelled: "border-white/10 bg-white/[0.02] text-white/35",
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

function healthColor(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-amber-200";
  return "text-red-300";
}

export function FounderStrategicSessions({ sessions, pendingApprovals = [] }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const approvalsBySession = useMemo(() => {
    const map = new Map<string, FounderAwaitingApproval[]>();
    for (const item of pendingApprovals) {
      if (!item.workflowId) continue;
      const list = map.get(item.workflowId) ?? [];
      list.push(item);
      map.set(item.workflowId, list);
    }
    return map;
  }, [pendingApprovals]);

  async function handleApprove(approvalId: string) {
    setLoadingId(approvalId);
    setError("");
    try {
      await decideApprovalAction(approvalId, "approved");
      router.refresh();
    } catch (err) {
      setError(formatClientApiError(err, "Approval"));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Strategic Sessions
          </h3>
          <p className="mt-1 text-xs text-white/45">
            Active, waiting, scheduled, blocked — approve and command from here
          </p>
        </div>
        <Link href="/sai/sessions?section=registry-all" className="text-xs text-purple-300 hover:underline">
          Session Command Center →
        </Link>
      </div>

      {error && <p className="mb-3 text-xs text-red-300">{error}</p>}

      {sessions.length === 0 ? (
        <p className="text-sm text-white/35">
          No active strategic sessions. Launch an objective to start execution.
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const sessionApprovals = approvalsBySession.get(session.id) ?? [];
            const needsApproval =
              session.bucket === "awaiting_approval" ||
              session.pendingApprovalCount > 0 ||
              sessionApprovals.length > 0;

            return (
              <article
                key={session.id}
                className={`enterprise-glass rounded-xl border p-4 transition-colors hover:border-purple-400/25 ${
                  needsApproval ? "border-amber-400/25 bg-amber-500/5" : "border-white/10"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/sai/sessions/${session.id}`}
                        className="text-sm font-semibold text-white hover:text-purple-200"
                      >
                        Session #{session.sessionNumber ?? "—"}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${bucketStyles[session.bucket] ?? bucketStyles.archived}`}
                      >
                        {session.bucket.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-purple-300/70">{session.projectName}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-white/70">{session.objective}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className={healthColor(session.executionHealth)}>
                      Exec {session.executionHealth}%
                    </p>
                    <p className="mt-1 text-white/40">Strategic {session.strategicHealth}%</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-white/40">Current Agent</dt>
                    <dd className="text-white/75">{session.currentAgentName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Deliverable</dt>
                    <dd className="truncate font-mono text-purple-300/80">
                      {session.currentDeliverable ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Pending Reviews</dt>
                    <dd className="text-amber-200">
                      {sessionApprovals.length || session.pendingApprovalCount || 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Last Activity</dt>
                    <dd className="text-white/55">{formatWhen(session.lastActivityAt)}</dd>
                  </div>
                </dl>

                {sessionApprovals.length > 0 && (
                  <div className="mt-4 space-y-2 rounded-lg border border-amber-400/20 bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-amber-300/80">
                      Approval required to continue
                    </p>
                    {sessionApprovals.map((approval) => (
                      <div
                        key={approval.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white">{approval.title}</p>
                          <p className="text-[10px] text-white/45">
                            {approval.approvalType.replace(/_/g, " ")} · {approval.impact} impact
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={loadingId === approval.id}
                            onClick={() => handleApprove(approval.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
                          >
                            {loadingId === approval.id ? "Approving…" : "Approve"}
                          </button>
                          <Link
                            href={`/sai/approvals/${approval.id}`}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] text-white/70"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/sai/sessions/${session.id}`}
                    className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-3 py-1.5 text-[10px] font-semibold text-white"
                  >
                    Open Workspace
                  </Link>
                  <Link
                    href={`/sai/sessions/${session.id}?tab=approvals`}
                    className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-[10px] text-amber-200"
                  >
                    Approvals
                  </Link>
                  {needsApproval && sessionApprovals.length === 0 && (
                    <Link
                      href={`/sai/sessions/${session.id}?tab=approvals`}
                      className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-200"
                    >
                      Review pending step →
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
