"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkflowApproval, WorkflowApprovalStatus } from "@/lib/sai/types";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";

const statusStyles: Record<string, string> = {
  pending: "border-amber-400/20 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  auto_approved: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  rejected: "border-red-400/20 bg-red-500/10 text-red-300",
  revision_required: "border-orange-400/20 bg-orange-500/10 text-orange-300",
  escalated: "border-purple-400/20 bg-purple-500/10 text-purple-300",
};

type Props = {
  initialApprovals: WorkflowApproval[];
  isAdmin: boolean;
};

export function ApprovalsView({ initialApprovals, isAdmin }: Props) {
  const router = useRouter();
  const [approvals, setApprovals] = useState(initialApprovals);
  const [filter, setFilter] = useState<WorkflowApprovalStatus | "all">("all");
  const [loading, setLoading] = useState(false);

  const filtered =
    filter === "all" ? approvals : approvals.filter((a) => a.status === filter);

  async function decide(id: string, decision: "approved" | "rejected" | "revision_required" | "escalated") {
    setLoading(true);
    try {
      const route = `/api/sai/approvals/${id}`;
      const res = await fetch(route, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await parseJsonResponse<{ approval?: WorkflowApproval }>(res, route);
      if (res.ok && data.approval) {
        setApprovals((prev) => prev.map((a) => (a.id === id ? data.approval! : a)));
        router.refresh();
      }
    } catch (err) {
      console.error(formatClientApiError(err, "Approvals API"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "escalated", "approved", "auto_approved", "revision_required", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${
              filter === s ? "border-purple-400/30 bg-purple-500/15 text-purple-200" : "border-white/10 text-white/45"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-white/10 px-4 py-8 text-center text-sm text-white/40">
            No approvals in this queue.
          </p>
        ) : (
          filtered.map((approval) => (
            <article key={approval.id} className="enterprise-glass rounded-xl border border-white/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[approval.status]}`}>
                      {approval.status.replace("_", " ")}
                    </span>
                    <span className="text-[10px] uppercase text-white/35">{approval.approvalType}</span>
                    <span className="text-[10px] uppercase text-white/35">{approval.approvalMode}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-white">{approval.title}</h3>
                  <p className="mt-1 text-xs text-white/50">
                    {approval.projectName} · {approval.workflowObjective}
                  </p>
                  <p className="mt-1 text-[10px] text-white/35">
                    Requested by {approval.requestedBy} · {new Date(approval.requestedAt).toLocaleString()}
                  </p>
                </div>
                <Link href={`/sai/approvals/${approval.id}`} className="text-[10px] text-purple-300 hover:text-purple-200">
                  View Details →
                </Link>
              </div>

              {isAdmin && ["pending", "escalated"].includes(approval.status) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={loading} onClick={() => decide(approval.id, "approved")} className="rounded border border-emerald-400/20 px-3 py-1 text-[10px] text-emerald-300">Approve</button>
                  <button type="button" disabled={loading} onClick={() => decide(approval.id, "rejected")} className="rounded border border-red-400/20 px-3 py-1 text-[10px] text-red-300">Reject</button>
                  <button type="button" disabled={loading} onClick={() => decide(approval.id, "revision_required")} className="rounded border border-orange-400/20 px-3 py-1 text-[10px] text-orange-300">Request Revision</button>
                  <button type="button" disabled={loading} onClick={() => decide(approval.id, "escalated")} className="rounded border border-purple-400/20 px-3 py-1 text-[10px] text-purple-300">Escalate</button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
