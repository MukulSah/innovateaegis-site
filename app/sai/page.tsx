import { AskSAIPanel } from "@/components/sai/ask-sai";
import { CompanyOverviewPanel } from "@/components/sai/company-overview";
import { OrganizationHealthPanel } from "@/components/sai/organization-health";
import { QuickPanels } from "@/components/sai/quick-panels";
import { SAIBrainBanner } from "@/components/sai/sai-brain-banner";
import {
  aiAgents,
  companyOverview,
  employees,
  healthMetrics,
  projects,
} from "@/lib/sai/data";

export default function SAIDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          Welcome back, Founder
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
          Company Headquarters
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Your living digital organization — memory, intelligence, accountability, and execution.
        </p>
      </header>

      <SAIBrainBanner />

      <AskSAIPanel />

      <CompanyOverviewPanel data={companyOverview} />

      <OrganizationHealthPanel metrics={healthMetrics} />

      <QuickPanels projects={projects} employees={employees} agents={aiAgents} />
    </div>
  );
}
