import { SectionPage } from "@/components/sai/section-page";
import { TimelinePanel } from "@/components/sai/timeline-panel";
import { INTEGRATION_CATALOG } from "@/lib/sai/integrations";
import {
  getActivityTimeline,
  getCompanyOverview,
  getHealthMetrics,
} from "@/lib/sai/queries";

export default async function AnalyticsPage() {
  const [overview, healthMetrics, timeline] = await Promise.all([
    getCompanyOverview(),
    getHealthMetrics(),
    getActivityTimeline(30),
  ]);

  return (
    <SectionPage
      title="Analytics"
      subtitle="Organization intelligence"
      description="Monitor business performance, team productivity, and organizational health. The owner manages outcomes, not tasks."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.organizationHealthScore}</p>
          <p className="mt-1 text-xs text-white/50">Health Score</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.revenue}</p>
          <p className="mt-1 text-xs text-emerald-400">{overview.revenueTrend}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.activeProjects}</p>
          <p className="mt-1 text-xs text-white/50">Active Projects</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.openIssues}</p>
          <p className="mt-1 text-xs text-white/50">Critical Blockers</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {healthMetrics.map((metric) => (
          <div
            key={metric.id}
            className="enterprise-glass rounded-xl border border-white/10 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{metric.label}</span>
              <span className="text-lg font-bold text-white">{metric.score}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  metric.status === "green" ? "bg-emerald-400" :
                  metric.status === "yellow" ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{ width: `${metric.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <TimelinePanel entries={timeline} />
      </div>

      <div className="mt-8 enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Future Integrations</h2>
        <p className="mt-1 text-xs text-white/50">Architecture prepared for external system connections.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATION_CATALOG.map((integration) => (
            <div key={integration.provider} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <p className="text-xs font-medium text-white/75">{integration.name}</p>
              <p className="text-[10px] text-white/35">{integration.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionPage>
  );
}
