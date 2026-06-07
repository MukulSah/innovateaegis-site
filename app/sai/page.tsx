import { cookies } from "next/headers";
import { AskSAIPanel } from "@/components/sai/ask-sai";
import { CommandCenter } from "@/components/sai/command-center";
import { CompanyOverviewPanel } from "@/components/sai/company-overview";
import { OrganizationHealthPanel } from "@/components/sai/organization-health";
import { QuickPanels } from "@/components/sai/quick-panels";
import { RecommendationsPanel } from "@/components/sai/recommendations-panel";
import { SAIBrainBanner } from "@/components/sai/sai-brain-banner";
import { sessionFromCookie, SAI_USER_COOKIE } from "@/lib/sai/auth";
import { getCommandCenterBriefing } from "@/lib/sai/command-center";
import { generateRecommendations } from "@/lib/sai/recommendations";
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

  const [briefing, recommendations, overview, healthMetrics, projects, employees, agents, brainStats] =
    await Promise.all([
      getCommandCenterBriefing(),
      generateRecommendations(),
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
          SAI Command Center
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Proactive intelligence — SAI tells you what matters, what is blocked, and what to do next.
        </p>
      </header>

      <CommandCenter briefing={briefing} />

      <RecommendationsPanel recommendations={recommendations} />

      <SAIBrainBanner dataPoints={brainStats.dataPoints} memories={brainStats.memories} />

      <AskSAIPanel />

      <CompanyOverviewPanel data={overview} />

      <OrganizationHealthPanel metrics={healthMetrics} />

      <QuickPanels projects={projects} employees={employees} agents={agents} />
    </div>
  );
}
