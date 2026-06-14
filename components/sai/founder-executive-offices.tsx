"use client";

import Link from "next/link";
import type {
  AgentIntelligenceSection,
  ExecutiveAlert,
  FounderDashboard,
} from "@/lib/sai/founder-workspace.types";

type ExecutiveOfficesProps = {
  dashboard: FounderDashboard;
  agentIntelligence: AgentIntelligenceSection[];
  sessionCount: number;
};

type AttentionProps = {
  alerts: ExecutiveAlert[];
  pendingDecisionCount: number;
  approvalCount: number;
  items: { label: string; detail: string; severity: string }[];
};

const severityStyles: Record<string, string> = {
  critical: "border-red-400/30 bg-red-500/10 text-red-200",
  high: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  medium: "border-purple-400/25 bg-purple-500/10 text-purple-200",
  low: "border-white/10 bg-white/[0.02] text-white/60",
};

function trendLabel(trend: string) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

export function FounderExecutiveOffices({
  dashboard,
  agentIntelligence,
  sessionCount,
}: ExecutiveOfficesProps) {
  const { briefing, companyHealth } = dashboard;
  const topAgents = agentIntelligence.slice(0, 3);

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Executive Offices
      </h3>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="enterprise-glass rounded-xl border border-purple-400/20 p-5 lg:col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-purple-300/70">Executive Briefing</p>
          <h4 className="mt-1 text-lg font-semibold text-white">{briefing.greeting}</h4>
          {briefing.companyStatusSummary && (
            <p className="mt-2 text-sm leading-relaxed text-white/55">{briefing.companyStatusSummary}</p>
          )}
          {briefing.todaysFocus.length > 0 && (
            <ul className="mt-4 space-y-1">
              {briefing.todaysFocus.map((focus) => (
                <li key={focus} className="text-xs text-white/60">· {focus}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/45">
            <span>{sessionCount} strategic sessions</span>
            {briefing.generatedBy && <span>Brief by {briefing.generatedBy}</span>}
          </div>
        </article>

        <article className="enterprise-glass rounded-xl border border-white/10 p-5">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Company Health</p>
          <p className="mt-2 text-3xl font-bold text-white">{companyHealth.overallScore}</p>
          <p className="text-xs text-white/45">
            Trend {trendLabel(companyHealth.overallTrend)}
          </p>
          <ul className="mt-4 space-y-2">
            {companyHealth.dimensions.slice(0, 4).map((dim) => (
              <li key={dim.key} className="flex items-center justify-between text-xs">
                <span className="text-white/55">{dim.label}</span>
                <span className="font-medium text-white">{dim.score}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {topAgents.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topAgents.map((section) => (
            <article key={section.agentId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{section.agentName}</p>
                  <p className="text-[10px] text-purple-300/70">{section.agentRole}</p>
                </div>
                <Link
                  href={`/sai/organization/agents/${section.agentId}/workspace`}
                  className="text-[10px] text-purple-300 hover:underline"
                >
                  Workspace
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/40">
                <span>{section.priorities.length} priorities</span>
                <span>{section.risks.length} risks</span>
                <span>{section.opportunities.length} opportunities</span>
              </div>
              {(section.recommendations[0] ?? section.risks[0]) && (
                <p className="mt-2 line-clamp-2 text-xs text-white/50">
                  {(section.recommendations[0] ?? section.risks[0]).title}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function FounderAttentionRequired({
  alerts,
  pendingDecisionCount,
  approvalCount,
  items,
}: AttentionProps) {
  const total = pendingDecisionCount + approvalCount + alerts.length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Attention Required
          </h3>
          <p className="mt-1 text-xs text-white/45">
            {total === 0 ? "Nothing blocking execution right now." : `${total} item(s) need founder attention`}
          </p>
        </div>
        {approvalCount > 0 && (
          <Link href="/sai/founder?tab=inbox" className="text-xs text-amber-300 hover:underline">
            {approvalCount} pending approval{approvalCount === 1 ? "" : "s"} →
          </Link>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {alerts.slice(0, 4).map((alert) => (
          <article
            key={alert.id}
            className={`rounded-xl border p-4 ${severityStyles[alert.severity] ?? severityStyles.low}`}
          >
            <p className="text-[10px] uppercase tracking-wider opacity-80">{alert.sourceAgent}</p>
            <p className="mt-1 text-sm font-medium">{alert.title}</p>
            <p className="mt-1 text-xs opacity-80">{alert.requiredAction}</p>
          </article>
        ))}

        {items.map((item, index) => (
          <article
            key={`${item.label}-${index}`}
            className={`rounded-xl border p-4 ${severityStyles[item.severity] ?? severityStyles.low}`}
          >
            <p className="text-[10px] uppercase tracking-wider opacity-80">{item.label}</p>
            <p className="mt-1 text-sm font-medium">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
