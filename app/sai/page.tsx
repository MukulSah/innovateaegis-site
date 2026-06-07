import { cookies } from "next/headers";
import { AskSAIPanel } from "@/components/sai/ask-sai";
import { CompanyOverviewPanel } from "@/components/sai/company-overview";
import { OrganizationHealthPanel } from "@/components/sai/organization-health";
import { QuickPanels } from "@/components/sai/quick-panels";
import { SAIBrainBanner } from "@/components/sai/sai-brain-banner";
import { sessionFromCookie, SAI_USER_COOKIE } from "@/lib/sai/auth";
import {
  getAIAgents,
  getBrainStats,
  getCompanyOverview,
  getEmployees,
  getHealthMetrics,
  getProjects,
} from "@/lib/sai/queries";

export default async function SAIDashboardPage() {
  const cookieStore = await cookies();
  const user = sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value);

  const [overview, healthMetrics, projects, employees, agents, brainStats] =
    await Promise.all([
      getCompanyOverview(),
      getHealthMetrics(),
      getProjects(),
      getEmployees(),
      getAIAgents(),
      getBrainStats(),
    ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          Welcome back, {user?.name ?? "Founder"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
          Company Headquarters
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Your living digital organization — memory, intelligence, accountability, and execution.
        </p>
      </header>

      <SAIBrainBanner dataPoints={brainStats.dataPoints} memories={brainStats.memories} />

      <AskSAIPanel />

      <CompanyOverviewPanel data={overview} />

      <OrganizationHealthPanel metrics={healthMetrics} />

      <QuickPanels projects={projects} employees={employees} agents={agents} />
    </div>
  );
}
