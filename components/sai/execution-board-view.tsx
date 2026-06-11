"use client";

import Link from "next/link";
import type { ExecutionBoardData } from "@/lib/sai/types";

type Props = {
  board: ExecutionBoardData;
};

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="enterprise-glass rounded-xl border border-white/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );
}

export function ExecutionBoardView({ board }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Workflows" value={board.activeWorkflows} accent="text-cyan-300" />
        <StatCard label="Active Tasks" value={board.activeTasks} />
        <StatCard label="Blocked Tasks" value={board.blockedTasks} accent="text-red-300" />
        <StatCard label="Reviews Pending" value={board.reviewsPending} accent="text-amber-300" />
        <StatCard label="Approvals Pending" value={board.approvalsPending} accent="text-purple-300" />
        <StatCard label="Deliverables Pending" value={board.deliverablesPending} />
        <StatCard label="Escalations" value={board.escalations} accent="text-red-400" />
        <StatCard label="Releases Ready" value={board.releasesReady} accent="text-emerald-300" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Active Workflows</h2>
          <ul className="mt-3 space-y-2">
            {board.workflows.length === 0 ? (
              <li className="text-sm text-white/40">No active workflows.</li>
            ) : (
              board.workflows.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/sai/workflows/${w.id}`}
                    className="block rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-purple-400/30"
                  >
                    <p className="text-sm text-white">{w.objective}</p>
                    <p className="mt-1 text-[10px] text-white/40">
                      {w.projectName} · {w.name}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Blocked Tasks</h2>
          <ul className="mt-3 space-y-2">
            {board.blockedTaskList.length === 0 ? (
              <li className="text-sm text-white/40">No blocked tasks.</li>
            ) : (
              board.blockedTaskList.map((t) => (
                <li key={t.id} className="rounded-lg border border-red-400/20 bg-red-500/5 p-3">
                  <p className="text-sm text-white">{t.title}</p>
                  <p className="mt-1 text-[10px] text-white/40">
                    {t.projectName} · {t.status} · {t.progressPercentage}%
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Pending Reviews</h2>
          <ul className="mt-3 space-y-2">
            {board.pendingReviews.length === 0 ? (
              <li className="text-sm text-white/40">Review queue clear.</li>
            ) : (
              board.pendingReviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3">
                  <p className="text-sm text-white">{r.entityType} review</p>
                  <p className="mt-1 text-[10px] text-white/40">Reviewer: {r.reviewer}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Pending Approvals</h2>
          <ul className="mt-3 space-y-2">
            {board.pendingApprovals.length === 0 ? (
              <li className="text-sm text-white/40">No pending approvals.</li>
            ) : (
              board.pendingApprovals.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/sai/approvals/${a.id}`}
                    className="block rounded-lg border border-purple-400/20 bg-purple-500/5 p-3 hover:border-purple-400/40"
                  >
                    <p className="text-sm text-white">{a.title}</p>
                    <p className="mt-1 text-[10px] text-white/40">
                      {a.projectName} · {a.approvalType}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Deliverables Pending</h2>
          <ul className="mt-3 space-y-2">
            {board.pendingDeliverables.length === 0 ? (
              <li className="text-sm text-white/40">No deliverables in progress.</li>
            ) : (
              board.pendingDeliverables.map((d) => (
                <li key={d.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-sm text-white">{d.title}</p>
                  <p className="mt-1 text-[10px] text-white/40">
                    {d.type} · {d.status} · v{d.version}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Releases Ready</h2>
          <ul className="mt-3 space-y-2">
            {board.readyReleases.length === 0 ? (
              <li className="text-sm text-white/40">No releases ready to ship.</li>
            ) : (
              board.readyReleases.map((r) => (
                <li key={r.id} className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3">
                  <p className="text-sm text-white">{r.title}</p>
                  <p className="mt-1 text-[10px] text-white/40">
                    v{r.version} · {r.projectName}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
