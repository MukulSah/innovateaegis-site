"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FounderApprovalCard } from "@/lib/sai/founder-approvals";

type Props = { approvals: FounderApprovalCard[] };

export function PendingApprovalsBanner({ approvals }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (approvals.length === 0) return null;

  async function quickApprove(id: string) {
    setLoadingId(id);
    try {
      await fetch(`/api/sai/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approved" }),
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-200">
            Pending Approvals: {approvals.length}
          </p>
          <p className="text-xs text-white/50">Founder action required before agents can continue.</p>
        </div>
        <Link href="/sai/approvals" className="text-xs text-amber-200/80 hover:underline">
          View all →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {approvals.slice(0, 5).map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-400/20 bg-black/20 p-3"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-300/70">
                Approval Required · {a.approvalType.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{a.title}</p>
              <p className="mt-1 text-xs text-white/45">
                Project: {a.projectName} · Agent: {a.requestedBy} · Artifact:{" "}
                <span className="font-mono text-cyan-300/80">{a.artifactLabel}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loadingId === a.id}
                onClick={() => quickApprove(a.id)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] text-white disabled:opacity-50"
              >
                Approve
              </button>
              <Link
                href={`/sai/approvals/${a.id}`}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] text-white/70"
              >
                Review
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
