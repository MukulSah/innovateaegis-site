import { SectionPage } from "@/components/sai/section-page";
import { RevenuePanel } from "@/components/sai/revenue-panel";
import { TimelinePanel } from "@/components/sai/timeline-panel";
import { getGitHubActivity, getGitHubSummary } from "@/lib/sai/integrations/github";
import { INTEGRATION_CATALOG } from "@/lib/sai/integrations";
import { getRevenueDashboard } from "@/lib/sai/revenue";
import {
  getActivityTimeline,
  getCompanyOverview,
  getHealthMetrics,
} from "@/lib/sai/queries";

export default async function AnalyticsPage() {
  const [overview, healthMetrics, timeline, revenue, githubActivity, githubSummary] =
    await Promise.all([
      getCompanyOverview(),
      getHealthMetrics(),
      getActivityTimeline(30),
      getRevenueDashboard(),
      getGitHubActivity(10),
      getGitHubSummary(),
    ]);

  return (
    <SectionPage
      title="Analytics"
      subtitle="Organization intelligence"
      description="Monitor business performance, team productivity, and organizational health. The owner manages outcomes, not tasks."
    >
      <RevenuePanel data={revenue} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.organizationHealthScore}</p>
          <p className="mt-1 text-xs text-white/50">Health Score</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.activeProjects}</p>
          <p className="mt-1 text-xs text-white/50">Active Projects</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.openIssues}</p>
          <p className="mt-1 text-xs text-white/50">Critical Blockers</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{githubSummary.total}</p>
          <p className="mt-1 text-xs text-white/50">GitHub Activities</p>
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

      {githubActivity.length > 0 && (
        <div className="mt-8 enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">GitHub Integration</h2>
          <p className="mt-1 text-xs text-white/45">Commits, PRs, issues, and releases linked to projects.</p>
          <ul className="mt-3 space-y-2">
            {githubActivity.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-xs">
                <span className="text-white/75">
                  <span className="text-purple-300/70">[{activity.type}]</span> {activity.title}
                </span>
                <span className="text-white/35">{activity.repo} · {activity.author}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <TimelinePanel entries={timeline} />
      </div>

      <div className="mt-8 enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Integration Architecture</h2>
        <p className="mt-1 text-xs text-white/50">Prepared for external system connections. Notion and GitHub active in demo mode.</p>
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
