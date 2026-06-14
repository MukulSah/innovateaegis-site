"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { decideApprovalAction } from "@/lib/sai/approval-actions";
import type { FounderApprovalCard } from "@/lib/sai/founder-approvals";
import { formatClientApiError } from "@/lib/sai/client-api";
import { useDebouncedRouterRefresh } from "@/lib/sai/use-debounced-router-refresh";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

type Props = { approvals: FounderApprovalCard[] };

export function PendingApprovalsBanner({ approvals: initialApprovals }: Props) {
  const router = useRouter();
  const refreshPage = useDebouncedRouterRefresh(5_000);
  const [items, setItems] = useState(initialApprovals);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(initialApprovals);
  }, [initialApprovals]);

  const reloadApprovals = useCallback(() => {
    router.refresh();
  }, [router]);

  useSaiRealtimeSync(reloadApprovals, ["workflow_approvals"], {
    debounceMs: 2000,
    minIntervalMs: 4000,
  });

  if (items.length === 0) return null;

  async function quickApprove(id: string) {
    setLoadingId(id);
    setError("");
    try {
      await decideApprovalAction(id, "approved");
      setItems((prev) => prev.filter((a) => a.id !== id));
      refreshPage();
      router.refresh();
    } catch (err) {
      setError(formatClientApiError(err, "Approval"));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-200">
            Pending Approvals: {items.length}
          </p>
          <p className="text-xs text-white/50">
            Founder action required — includes document, decision, and release gates.
          </p>
        </div>
        <Link href="/sai/approvals" className="text-xs text-amber-200/80 hover:underline">
          View all →
        </Link>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <ul className="mt-4 space-y-3">
        {items.slice(0, 8).map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-400/20 bg-black/20 p-3"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-300/70">
                {a.sessionNumber != null ? `Session #${a.sessionNumber} · ` : ""}
                {a.approvalType.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{a.title}</p>
              <p className="mt-1 text-xs text-white/45">
                {a.projectName} · {a.requestedBy} ·{" "}
                <span className="font-mono text-cyan-300/80">{a.artifactLabel}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loadingId === a.id}
                onClick={() => quickApprove(a.id)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
              >
                {loadingId === a.id ? "Approving…" : "Approve"}
              </button>
              {a.workflowId && (
                <Link
                  href={`/sai/sessions/${a.workflowId}?tab=approvals`}
                  className="rounded-lg border border-purple-400/30 px-3 py-1.5 text-[10px] text-purple-200"
                >
                  Session
                </Link>
              )}
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
