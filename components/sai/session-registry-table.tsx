"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SessionCosAskPanel } from "@/components/sai/session-cos-ask-panel";
import type { FounderAwaitingApproval, FounderSessionRow } from "@/lib/sai/founder-timeline";
import {
  formatSessionTypeLabel,
  inferLifecycleStage,
  inferSessionPriority,
  isSessionOverdue,
} from "@/lib/sai/session-center";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const priorityStyles = {
  critical: "text-red-300",
  high: "text-amber-300",
  medium: "text-white/70",
  low: "text-white/40",
};

const bucketLabels: Record<string, string> = {
  active: "Active",
  awaiting_approval: "Waiting Approval",
  scheduled: "Scheduled",
  blocked: "Blocked",
  needs_founder_review: "Founder Review",
  completed: "Completed",
  archived: "Archived",
  cancelled: "Cancelled",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "awaiting_approval", label: "Waiting Approval" },
  { value: "needs_founder_review", label: "Founder Review" },
  { value: "blocked", label: "Blocked" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
];

type Props = {
  rows: FounderSessionRow[];
  pendingApprovals?: FounderAwaitingApproval[];
  onApprovalDecision?: (id: string, decision: string) => void;
  loadingApprovalId?: string | null;
  showStatusFilter?: boolean;
};

export function SessionRegistryTable({
  rows,
  pendingApprovals = [],
  onApprovalDecision,
  loadingApprovalId = null,
  showStatusFilter = false,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [askSession, setAskSession] = useState<FounderSessionRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const approvalsByWorkflow = useMemo(() => {
    const map = new Map<string, FounderAwaitingApproval[]>();
    for (const item of pendingApprovals) {
      if (!item.workflowId) continue;
      const list = map.get(item.workflowId) ?? [];
      list.push(item);
      map.set(item.workflowId, list);
    }
    return map;
  }, [pendingApprovals]);

  const filteredRows = useMemo(() => {
    if (!showStatusFilter || statusFilter === "all") return rows;
    return rows.filter((s) => s.bucket === statusFilter || s.sessionStatus === statusFilter);
  }, [rows, showStatusFilter, statusFilter]);

  if (!rows.length) {
    return <p className="text-sm text-white/40">No sessions in this registry view.</p>;
  }

  return (
    <>
      {showStatusFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-white/35">
            {filteredRows.length} of {rows.length} sessions
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
              <th className="py-2 pr-3">Session ID</th>
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3">Owner</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Stage</th>
              <th className="py-2 pr-3">Output</th>
              <th className="py-2 pr-3">Last AI Review</th>
              <th className="py-2 pr-3">Health</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2 pr-3">Last Activity</th>
              <th className="py-2 pr-3">Due</th>
              <th className="py-2 pr-3">Ask COS AI</th>
              <th className="py-2">View</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((s) => {
              const priority = inferSessionPriority(s);
              const stage = inferLifecycleStage(s);
              const overdue = isSessionOverdue(s);
              const isSelected = selectedId === s.id;
              const sessionApprovals = approvalsByWorkflow.get(s.id) ?? [];
              const output =
                s.deliveryOutcome?.trim() ||
                s.currentDeliverable?.trim() ||
                s.currentArtifact?.trim() ||
                "—";

              return (
                <tr
                  key={s.id}
                  className={`border-b border-white/5 transition-colors ${
                    isSelected ? "bg-purple-500/10" : "hover:bg-white/[0.03]"
                  }`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/sai/sessions/${s.id}`}
                      className="font-mono text-cyan-300 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{s.sessionNumber ?? "—"}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate py-2.5 pr-3 text-white/85">{s.objective}</td>
                  <td className="py-2.5 pr-3 capitalize text-white/55">
                    {formatSessionTypeLabel(s.sessionType)}
                  </td>
                  <td className={`py-2.5 pr-3 capitalize ${priorityStyles[priority]}`}>{priority}</td>
                  <td className="py-2.5 pr-3 text-white/60">{s.currentAgentName ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-white/55">
                    {bucketLabels[s.bucket] ?? s.sessionStatus.replace(/_/g, " ")}
                  </td>
                  <td className="py-2.5 pr-3 capitalize text-white/55">
                    {s.currentDeliverable ?? stage.replace(/_/g, " ")}
                  </td>
                  <td className="max-w-[160px] truncate py-2.5 pr-3 text-white/50" title={output}>
                    {output}
                  </td>
                  <td className="max-w-[140px] py-2.5 pr-3 text-white/45">
                    {s.lastAiReviewAt ? (
                      <span title={s.lastAiReviewLabel ?? ""}>
                        {formatWhen(s.lastAiReviewAt)}
                        {s.lastAiReviewLabel && (
                          <span className="mt-0.5 block truncate text-[9px] text-white/30">
                            {s.lastAiReviewLabel}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={
                        s.executionHealth >= 70
                          ? "text-emerald-300"
                          : s.executionHealth >= 40
                            ? "text-amber-300"
                            : "text-red-300"
                      }
                    >
                      {s.executionHealth}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-white/45">{formatWhen(s.createdAt)}</td>
                  <td className="py-2.5 pr-3 text-white/45">{formatWhen(s.lastActivityAt)}</td>
                  <td className={`py-2.5 pr-3 ${overdue ? "text-orange-300" : "text-white/30"}`}>
                    {overdue ? "Overdue" : "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(s.id);
                        setAskSession(s);
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        isSelected || askSession?.id === s.id
                          ? "border-purple-400/50 bg-purple-500/20 text-purple-100"
                          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      Ask COS AI
                    </button>
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href={`/sai/sessions/${s.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-center text-[10px] font-medium text-cyan-200 hover:bg-cyan-500/20"
                      >
                        Open Workspace
                      </Link>
                      {sessionApprovals.length > 0 && onApprovalDecision && (
                        <div className="flex flex-wrap gap-1">
                          {sessionApprovals.map((approval) => (
                            <button
                              key={approval.id}
                              type="button"
                              disabled={loadingApprovalId === approval.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onApprovalDecision(approval.id, "approved");
                              }}
                              className="rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          ))}
                        </div>
                      )}
                      {s.pendingApprovalCount > 0 && sessionApprovals.length === 0 && (
                        <Link
                          href={`/sai/sessions/${s.id}?tab=approvals`}
                          className="text-[9px] text-amber-300 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Review approvals →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {askSession && <SessionCosAskPanel session={askSession} onClose={() => setAskSession(null)} />}
    </>
  );
}
