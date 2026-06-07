import { SectionPage } from "@/components/sai/section-page";
import { companyOverview, healthMetrics } from "@/lib/sai/data";

export default function AnalyticsPage() {
  return (
    <SectionPage
      title="Analytics"
      subtitle="Organization intelligence"
      description="Monitor business performance, team productivity, and organizational health. The owner manages outcomes, not tasks."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{companyOverview.organizationHealthScore}</p>
          <p className="mt-1 text-xs text-white/50">Health Score</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{companyOverview.revenue}</p>
          <p className="mt-1 text-xs text-emerald-400">{companyOverview.revenueTrend}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{companyOverview.activeProjects}</p>
          <p className="mt-1 text-xs text-white/50">Active Projects</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{companyOverview.openIssues}</p>
          <p className="mt-1 text-xs text-white/50">Open Issues</p>
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
    </SectionPage>
  );
}
