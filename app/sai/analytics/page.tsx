import { OrganizationHealthPanel } from "@/components/sai/organization-health";
import { SectionPage } from "@/components/sai/section-page";
import { getDashboardMetrics } from "@/lib/sai/metrics";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  let overview = {
    organizationHealthScore: 0,
    activeProjects: 0,
    tasksInProgress: 0,
    releases: 0,
    openIssues: 0,
  };
  let healthMetrics: Awaited<ReturnType<typeof getDashboardMetrics>>["healthMetrics"] = [];

  if (isSupabaseConfigured()) {
    try {
      const metrics = await getDashboardMetrics();
      overview = {
        organizationHealthScore: metrics.overview.organizationHealthScore,
        activeProjects: metrics.overview.activeProjects,
        tasksInProgress: metrics.overview.tasksInProgress,
        releases: metrics.overview.releases,
        openIssues: metrics.overview.openIssues,
      };
      healthMetrics = metrics.healthMetrics;
    } catch {
      // keep zeroed metrics
    }
  }

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
          <p className="text-3xl font-bold text-white">{overview.tasksInProgress}</p>
          <p className="mt-1 text-xs text-white/50">Tasks In Progress</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.activeProjects}</p>
          <p className="mt-1 text-xs text-white/50">Active Projects</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-5 text-center">
          <p className="text-3xl font-bold text-white">{overview.releases}</p>
          <p className="mt-1 text-xs text-white/50">Released Versions</p>
        </div>
      </div>

      <div className="mt-6">
        <OrganizationHealthPanel metrics={healthMetrics} />
      </div>
    </SectionPage>
  );
}
