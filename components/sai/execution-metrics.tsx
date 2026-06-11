import type { ExecutionMetrics } from "@/lib/sai/types";
import Link from "next/link";

type Props = {
  metrics: ExecutionMetrics;
};

export function ExecutionMetricsPanel({ metrics }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
            Execution Layer
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Work Execution</h2>
        </div>
        <div className="flex gap-2">
          <Link
            href="/sai/inbox"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
          >
            Inbox
            {metrics.unreadNotifications > 0 && (
              <span className="ml-1.5 rounded-full bg-purple-500 px-1.5 text-[10px] text-white">
                {metrics.unreadNotifications}
              </span>
            )}
          </Link>
          <Link
            href="/sai/execution"
            className="rounded-lg border border-purple-400/30 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10"
          >
            Execution Board
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Unread Notifications", value: metrics.unreadNotifications },
          { label: "Pending Reviews", value: metrics.pendingReviews },
          { label: "Deliverables In Progress", value: metrics.deliverablesInProgress },
          { label: "Agent Utilization", value: `${metrics.agentUtilization}%` },
          { label: "Execution Velocity", value: `${metrics.executionVelocity}%` },
        ].map((stat) => (
          <div key={stat.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {metrics.workloadDistribution.length > 0 && (
        <div className="enterprise-glass mt-4 rounded-xl border border-white/10 p-5">
          <p className="text-sm font-semibold text-white">Workload Distribution</p>
          <ul className="mt-3 space-y-2">
            {metrics.workloadDistribution.slice(0, 6).map((w) => (
              <li key={w.agentId} className="flex items-center justify-between text-xs">
                <span className="text-white/70">{w.agentName}</span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                      style={{ width: `${w.utilization}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-white/40">{w.capacityStatus}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
