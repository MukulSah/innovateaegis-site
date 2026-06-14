import { AskSAIPanel } from "@/components/sai/ask-sai";
import { CompanyOverviewPanel } from "@/components/sai/company-overview";
import { OrganizationHealthPanel } from "@/components/sai/organization-health";
import { QuickPanels } from "@/components/sai/quick-panels";
import { GovernanceMetricsPanel } from "@/components/sai/governance-metrics";
import { AIOperationsPanel } from "@/components/sai/ai-operations-panel";
import { ExecutionMetricsPanel } from "@/components/sai/execution-metrics";
import { OperationsMetricsPanel } from "@/components/sai/operations-metrics";
import { RecentActivityPanel } from "@/components/sai/recent-activity";
import { SaiDashboardLive } from "@/components/sai/sai-dashboard-live";
import { SAIBrainBanner } from "@/components/sai/sai-brain-banner";
import { getAgents } from "@/lib/sai/agents";
import { getEmployees } from "@/lib/sai/employees";
import { getDashboardMetrics } from "@/lib/sai/metrics";
import { agentsToQuickPanel } from "@/lib/sai/mappers";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { displayName } from "@/lib/sai/current-user.types";
import { getProjects } from "@/lib/sai/projects";
import type { Employee, Project } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SAIDashboardPage() {
  const currentUser = await getCurrentUser();
  const welcomeName = currentUser ? displayName(currentUser.profile) : "there";
  let projects: Project[] = [];
  let employees: Employee[] = [];
  let agentsForPanel = agentsToQuickPanel([]);
  let overview = {
    activeProjects: 0,
    employeesOnline: 0,
    totalEmployees: 0,
    aiAgentsActive: 0,
    totalAgents: 0,
    tasksInProgress: 0,
    releases: 0,
    openIssues: 0,
    currentObjectives: [] as string[],
    organizationHealthScore: 0,
  };
  let healthMetrics: Awaited<ReturnType<typeof getDashboardMetrics>>["healthMetrics"] = [];
  let brainStats = { dataPoints: 0, memories: 0 };
  let recentActivity: Awaited<ReturnType<typeof getDashboardMetrics>>["recentActivity"] = [];
  let governance: Awaited<ReturnType<typeof getDashboardMetrics>>["governance"] = {
    pendingApprovals: 0,
    approvedToday: 0,
    autoApprovedToday: 0,
    escalationsToday: 0,
    blockedWorkflows: 0,
    waitingForFounder: 0,
    waitingForRevision: 0,
    averageApprovalHours: 0,
    governanceHealth: 100,
    workflowHealth: 100,
    riskExposure: 0,
  };
  let aiOperations: Awaited<ReturnType<typeof getDashboardMetrics>>["aiOperations"] = {
    connectedProviders: 0,
    runningAgents: 0,
    activeSessions: 0,
    failedExecutions: 0,
    dailyCost: 0,
    monthlyCost: 0,
    conversationCount: 0,
    mostActiveAgent: null,
    modelUsage: [],
    providers: [],
    recentSessions: [],
    recentConversations: [],
  };
  let execution: Awaited<ReturnType<typeof getDashboardMetrics>>["execution"] = {
    unreadNotifications: 0,
    pendingReviews: 0,
    deliverablesInProgress: 0,
    agentUtilization: 0,
    executionVelocity: 0,
    workloadDistribution: [],
    reviewQueue: [],
    inboxActivity: [],
  };
  let operations: Awaited<ReturnType<typeof getDashboardMetrics>>["operations"] = {
    activeWorkflows: 0,
    workflowCompletionRate: 0,
    generatedTasks: 0,
    generatedRequirements: 0,
    generatedDocuments: 0,
    decisionsRecorded: 0,
    knowledgeEntries: 0,
    agentMemoryCount: 0,
    searchIndexSize: 0,
    blockedWorkflows: 0,
  };

  if (isSupabaseConfigured()) {
    try {
      const metrics = await getDashboardMetrics();
      overview = metrics.overview;
      healthMetrics = metrics.healthMetrics;
      brainStats = metrics.brainStats;
      recentActivity = metrics.recentActivity;
      operations = metrics.operations;
      governance = metrics.governance;
      execution = metrics.execution;
      aiOperations = metrics.aiOperations;

      const [dbProjects, dbEmployees, dbAgents] = await Promise.all([
        getProjects(),
        getEmployees(),
        getAgents(),
      ]);
      projects = dbProjects;
      employees = dbEmployees;
      agentsForPanel = agentsToQuickPanel(dbAgents);
    } catch {
      // keep zeroed metrics
    }
  }

  return (
    <SaiDashboardLive>
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          Welcome back, {welcomeName}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
          InnovateAegis Headquarters
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Founder Workspace · Company Brain · Agent Factory · Organizational Memory
        </p>
      </header>

      <SAIBrainBanner dataPoints={brainStats.dataPoints} memories={brainStats.memories} />

      <AskSAIPanel />

      <CompanyOverviewPanel data={overview} />

      <OrganizationHealthPanel metrics={healthMetrics} />

      <RecentActivityPanel activity={recentActivity} />

      <GovernanceMetricsPanel metrics={governance} />

      <ExecutionMetricsPanel metrics={execution} />

      <AIOperationsPanel metrics={aiOperations} />

      <OperationsMetricsPanel metrics={operations} />

      <QuickPanels projects={projects} employees={employees} agents={agentsForPanel} />
    </div>
    </SaiDashboardLive>
  );
}
