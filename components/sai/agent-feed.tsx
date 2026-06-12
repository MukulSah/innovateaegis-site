"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentFeedItem } from "@/lib/sai/agent-feed";

type Props = {
  items: AgentFeedItem[];
  sessionLabel?: string;
  showApprovalActions?: boolean;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AgentFeed({ items, sessionLabel, showApprovalActions = true }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function approve(approvalId: string, decision: "approved" | "rejected" | "revision_required") {
    setLoadingId(approvalId);
    try {
      await fetch(`/api/sai/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-white/40">No agent activity yet. Agents will appear here as they work.</p>
    );
  }

  return (
    <div className="space-y-4">
      {sessionLabel && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/70">
          {sessionLabel}
        </p>
      )}
      {items.map((item) => (
        <article
          key={item.id}
          className={`rounded-xl border p-4 ${
            item.type === "approval" && item.approvalStatus === "pending"
              ? "border-amber-400/30 bg-amber-500/5"
              : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">{item.agentName}</p>
              {item.agentRole && <p className="text-[10px] text-white/40">{item.agentRole}</p>}
            </div>
            <time className="text-[10px] text-white/35">{formatTime(item.createdAt)}</time>
          </div>

          <div className="my-3 border-t border-white/10" />

          <p className="text-xs font-medium uppercase tracking-wider text-purple-300/80">
            {item.headline}
          </p>

          {item.projectName && (
            <p className="mt-1 text-[10px] text-white/40">Project: {item.projectName}</p>
          )}

          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75 line-clamp-6">
            {item.body}
          </p>

          {item.artifactName && (
            <p className="mt-3 text-xs text-white/45">
              Artifact:{" "}
              <span className="font-mono text-cyan-300/90">{item.artifactName}</span>
            </p>
          )}

          {item.type === "approval" &&
            item.approvalStatus === "pending" &&
            showApprovalActions &&
            item.approvalId && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loadingId === item.approvalId}
                  onClick={() => approve(item.approvalId!, "approved")}
                  className="rounded-lg bg-emerald-600/90 px-3 py-1.5 text-[10px] font-medium text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={loadingId === item.approvalId}
                  onClick={() => approve(item.approvalId!, "revision_required")}
                  className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-[10px] text-amber-200"
                >
                  Request Changes
                </button>
                <Link
                  href={`/sai/approvals/${item.approvalId}`}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] text-white/60"
                >
                  Review Full
                </Link>
              </div>
            )}
        </article>
      ))}
    </div>
  );
}
