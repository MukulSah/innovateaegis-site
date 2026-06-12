import Link from "next/link";
import { AiReliabilityPanel } from "@/components/sai/ai-reliability-panel";
import type { CeoDashboardData } from "@/lib/sai/ceo-dashboard";

type Props = {
  dashboard: CeoDashboardData;
  primarySessionId?: string | null;
};

function riskBadge(risk: string, behind: boolean) {
  if (behind) return "text-amber-200";
  if (risk === "critical" || risk === "high") return "text-red-300";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-300";
}

export function CeoWorkspaceDashboard({ dashboard, primarySessionId }: Props) {
  const primarySession = dashboard.sponsoredSessions.find((s) => s.id === primarySessionId)
    ?? dashboard.sponsoredSessions[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] text-white/40">Sponsored Sessions</p>
          <p className="text-2xl font-bold text-white">{dashboard.sponsoredSessions.length}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] text-white/40">Strategic Risks</p>
          <p className="text-2xl font-bold text-amber-200">{dashboard.strategicRisks.length}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] text-white/40">Open Escalations</p>
          <p className="text-2xl font-bold text-red-300">{dashboard.escalations.length}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] text-white/40">Pending Approvals</p>
          <p className="text-2xl font-bold text-purple-200">{dashboard.pendingApprovals.length}</p>
        </div>
      </div>

      <AiReliabilityPanel reliability={dashboard.aiReliability} />

      {primarySession && (
        <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <p className="text-[10px] uppercase tracking-wider text-purple-300/80">Primary Sponsored Session</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Session #{primarySession.sessionNumber} — {primarySession.projectName}
          </h2>
          <p className="mt-1 text-sm text-white/60">{primarySession.objective}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <span>
              Progress: {primarySession.currentProgress}% (expected {primarySession.expectedProgress}%)
            </span>
            <span className={riskBadge(primarySession.businessRisk, primarySession.behindSchedule)}>
              Strategic Health: {primarySession.strategicHealth}%
            </span>
            <span className="text-emerald-300/90">Execution Health: {primarySession.executionHealth}%</span>
            <span className="text-white/45">{primarySession.sessionStatus.replace("_", " ")}</span>
          </div>
          <Link
            href={`/sai/workflows/${primarySession.id}`}
            className="mt-3 inline-block text-xs text-purple-300 hover:underline"
          >
            View session →
          </Link>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Sponsored Sessions</h2>
          <ul className="mt-3 space-y-2">
            {dashboard.sponsoredSessions.length === 0 ? (
              <li className="text-sm text-white/40">No active sponsored sessions.</li>
            ) : (
              dashboard.sponsoredSessions.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/5 p-3 text-sm">
                  <p className="text-white/85">
                    #{s.sessionNumber} {s.projectName} — {s.objective}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {s.currentProgress}% / {s.expectedProgress}% expected · Strategic {s.strategicHealth}%
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-amber-400/15 p-5">
          <h2 className="text-sm font-semibold text-white">Strategic Risks</h2>
          <ul className="mt-3 space-y-2">
            {dashboard.strategicRisks.length === 0 ? (
              <li className="text-sm text-white/40">No elevated strategic risks.</li>
            ) : (
              dashboard.strategicRisks.map((r) => (
                <li key={r.sessionId + r.label} className="rounded-lg border border-amber-400/10 p-3 text-sm text-white/75">
                  <p>{r.label}</p>
                  <p className="mt-1 text-xs text-amber-200/80">{r.risk}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-red-400/15 p-5">
          <h2 className="text-sm font-semibold text-white">Blocked Objectives</h2>
          <ul className="mt-3 space-y-2">
            {dashboard.blockedObjectives.length === 0 ? (
              <li className="text-sm text-white/40">No blocked sessions.</li>
            ) : (
              dashboard.blockedObjectives.map((s) => (
                <li key={s.id} className="rounded-lg border border-red-400/10 p-3 text-sm text-white/75">
                  #{s.sessionNumber} {s.objective}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Delayed Sessions</h2>
          <ul className="mt-3 space-y-2">
            {dashboard.delayedSessions.length === 0 ? (
              <li className="text-sm text-white/40">All sessions on schedule.</li>
            ) : (
              dashboard.delayedSessions.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/5 p-3 text-sm text-white/75">
                  #{s.sessionNumber} — {s.currentProgress}% vs {s.expectedProgress}% expected
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Success Metrics</h2>
          <ul className="mt-3 space-y-2">
            {dashboard.successMetrics.length === 0 ? (
              <li className="text-sm text-white/40">No metrics defined yet.</li>
            ) : (
              dashboard.successMetrics.map((m) => (
                <li key={m.sessionId} className="rounded-lg border border-white/5 p-3 text-sm">
                  <p className="text-white/80">{m.objective}</p>
                  <p className="mt-1 text-xs text-emerald-300/80">{m.metrics}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-red-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">Escalations</h2>
          <ul className="mt-3 space-y-2">
            {dashboard.escalations.length === 0 ? (
              <li className="text-sm text-white/40">No open escalations.</li>
            ) : (
              dashboard.escalations.map((e) => (
                <li key={e.id} className="rounded-lg border border-red-400/10 p-3 text-sm text-white/75">
                  {e.issue}
                  <span className="ml-2 text-xs text-white/40">
                    Owner: {e.owner} · {e.priority}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Recent Executive Decisions</h2>
        <ul className="mt-3 space-y-2">
          {dashboard.recentDecisions.length === 0 ? (
            <li className="text-sm text-white/40">No recent timeline entries.</li>
          ) : (
            dashboard.recentDecisions.map((d) => (
              <li key={d.title + d.createdAt} className="flex justify-between gap-2 text-sm text-white/70">
                <span>{d.title}</span>
                <time className="shrink-0 text-xs text-white/35">
                  {new Date(d.createdAt).toLocaleDateString()}
                </time>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
