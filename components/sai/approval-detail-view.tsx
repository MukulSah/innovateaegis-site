"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApprovalDebugTrail } from "@/components/sai/approval-debug-trail";
import type { ApprovalTrail, ApprovalTrailStep } from "@/lib/sai/approval-trail";
import type { ApprovalComment, WorkflowApproval } from "@/lib/sai/types";

type Props = {
  approval: WorkflowApproval;
  comments: ApprovalComment[];
  isAdmin: boolean;
  trail?: ApprovalTrail | null;
};

export function ApprovalDetailView({ approval, comments, isAdmin, trail }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugSteps, setDebugSteps] = useState<ApprovalTrailStep[]>(trail?.steps ?? []);

  async function decide(decision: "approved" | "rejected" | "revision_required" | "escalated", force = false) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/sai/approvals/${approval.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comments: note, force }),
    });
    const data = await res.json();
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error ?? "Approval failed");
      if (Array.isArray(data.steps)) setDebugSteps(data.steps);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase text-purple-300/70">{approval.approvalType} · {approval.approvalMode}</p>
        <h1 className="mt-1 text-xl font-bold text-white">{approval.title}</h1>
        <p className="mt-1 text-sm text-white/50">{approval.projectName} · {approval.workflowObjective}</p>
        <p className="mt-2 text-xs text-white/40">Status: {approval.status.replace("_", " ")} · Priority: {approval.priority}</p>
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Generated Artifact</h2>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-white/65">{approval.artifactContent || approval.description}</pre>
      </section>

      {(debugSteps.length > 0 || trail) && (
        <ApprovalDebugTrail
          steps={debugSteps}
          errorMessage={trail?.errorMessage ?? error}
        />
      )}

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Discussion History</h2>
        <ul className="mt-3 space-y-2">
          {comments.length === 0 ? (
            <li className="text-xs text-white/40">No comments yet.</li>
          ) : (
            comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
                <span className="text-white/70">{c.author}</span>
                <span className="text-white/35"> · {new Date(c.createdAt).toLocaleString()}</span>
                <p className="mt-1 text-white/55">{c.content}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      {isAdmin && (
        <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">Founder Decision Panel</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Comments for the approval record…"
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={loading} onClick={() => decide("approved")} className="rounded-lg bg-emerald-600/80 px-4 py-2 text-xs font-semibold text-white">Approve</button>
            <button type="button" disabled={loading} onClick={() => decide("rejected")} className="rounded-lg border border-red-400/30 px-4 py-2 text-xs text-red-300">Reject</button>
            <button type="button" disabled={loading} onClick={() => decide("revision_required")} className="rounded-lg border border-orange-400/30 px-4 py-2 text-xs text-orange-300">Request Revision</button>
            <button type="button" disabled={loading} onClick={() => decide("escalated")} className="rounded-lg border border-purple-400/30 px-4 py-2 text-xs text-purple-300">Escalate</button>
            <button type="button" disabled={loading} onClick={() => decide("approved", true)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60">Force Approve</button>
          </div>
        </section>
      )}

      <div className="flex gap-4 text-xs">
        <Link href="/sai/approvals" className="text-purple-300 hover:text-purple-200">← Approval Center</Link>
        {approval.workflowId && (
          <Link href={`/sai/workflows/${approval.workflowId}`} className="text-purple-300 hover:text-purple-200">Workflow Detail →</Link>
        )}
      </div>
    </div>
  );
}
