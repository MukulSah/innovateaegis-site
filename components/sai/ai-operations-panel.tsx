import Link from "next/link";
import { getProviderLabel } from "@/lib/sai/ai-provider-catalog";
import type { AIOperationsMetrics, AIProviderName } from "@/lib/sai/types";

type Props = {
  metrics: AIOperationsMetrics;
};

export function AIOperationsPanel({ metrics }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
            AI Operations
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Agent Runtime</h2>
        </div>
        <Link
          href="/sai/settings/ai"
          className="rounded-lg border border-purple-400/30 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10"
        >
          AI Settings
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Connected Providers", value: metrics.connectedProviders },
          { label: "Running Agents", value: metrics.runningAgents },
          { label: "Active AI Sessions", value: metrics.activeSessions },
          { label: "Failed Executions", value: metrics.failedExecutions, accent: metrics.failedExecutions > 0 ? "text-red-300" : undefined },
          { label: "Daily Cost", value: `$${metrics.dailyCost.toFixed(4)}` },
          { label: "Monthly Cost", value: `$${metrics.monthlyCost.toFixed(4)}` },
          { label: "Conversations", value: metrics.conversationCount },
          { label: "Most Active Agent", value: metrics.mostActiveAgent ?? "—" },
        ].map((stat) => (
          <div key={stat.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{stat.label}</p>
            <p className={`mt-1 text-lg font-bold ${stat.accent ?? "text-white"}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {metrics.providers.length > 0 && (
        <div className="enterprise-glass mt-4 rounded-xl border border-white/10 p-5">
          <p className="text-sm font-semibold text-white">Connected Providers</p>
          <ul className="mt-2 space-y-1">
            {metrics.providers.map((p) => (
              <li key={p.id} className="flex justify-between text-xs text-white/60">
                <span>{getProviderLabel(p.providerName as AIProviderName)} · {p.model}</span>
                {p.defaultProvider && <span className="text-purple-300">default</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {metrics.recentSessions.length > 0 && (
        <div className="enterprise-glass mt-4 rounded-xl border border-white/10 p-5">
          <p className="text-sm font-semibold text-white">Active Sessions</p>
          <ul className="mt-2 space-y-2">
            {metrics.recentSessions.map((s) => (
              <li key={s.id} className="text-xs text-white/60">
                {s.agentName} · {s.status} · {s.modelProvider}/{s.modelName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
