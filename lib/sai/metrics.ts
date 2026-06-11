import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActivityFeed } from "./activity-feed";
import { getActivityLogs } from "./activity-logs";
import { getAgents } from "./agents";
import { countDeliverablesByStatus } from "./deliverables";
import { countUnreadNotifications, getNotifications } from "./notifications";
import { countPendingReviews, getReviews } from "./reviews";
import { getAIOperationsMetrics } from "./ai-operations";
import { getAverageUtilization, computeAllAgentWorkloads } from "./workload";
import { countDecisions } from "./decisions";
import { countDocuments } from "./documents";
import { getEmployees } from "./employees";
import { getGovernanceStats } from "./governance";
import { getSearchIndexSize } from "./knowledge-search";
import { computeWorkflowHealth } from "./workflow-health";
import { getMemories } from "./memories";
import { getProjects } from "./projects";
import { countReleasedVersions } from "./releases";
import type {
  CompanyOverview,
  DashboardMetrics,
  HealthMetric,
  HealthStatus,
  Project,
} from "./types";

function scoreToStatus(score: number): HealthStatus {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

function averageProjectHealth(projects: Project[]): number {
  if (projects.length === 0) return 0;
  const total = projects.reduce((sum, project) => sum + project.healthScore, 0);
  return Math.round(total / projects.length);
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (!isSupabaseConfigured()) {
    return {
      overview: {
        activeProjects: 0,
        employeesOnline: 0,
        totalEmployees: 0,
        aiAgentsActive: 0,
        totalAgents: 0,
        tasksInProgress: 0,
        releases: 0,
        openIssues: 0,
        currentObjectives: [],
        organizationHealthScore: 0,
      },
      healthMetrics: [],
      brainStats: { dataPoints: 0, memories: 0 },
      recentActivity: [],
      activityFeed: [],
      execution: {
        unreadNotifications: 0,
        pendingReviews: 0,
        deliverablesInProgress: 0,
        agentUtilization: 0,
        executionVelocity: 0,
        workloadDistribution: [],
        reviewQueue: [],
        inboxActivity: [],
      },
      aiOperations: {
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
      },
      operations: {
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
      },
      governance: {
        pendingApprovals: 0,
        approvedToday: 0,
        autoApprovedToday: 0,
        escalationsToday: 0,
        blockedWorkflows: 0,
        waitingForFounder: 0,
        waitingForRevision: 0,
        averageApprovalHours: 0,
        governanceHealth: 100,
        workflowHealth: 0,
        riskExposure: 0,
      },
    };
  }

  const supabase = createSupabaseAdmin();
  const [
    projects,
    employees,
    agents,
    memories,
    releasedVersions,
    recentActivity,
    activityFeed,
    docCount,
    decisionCount,
    searchIndexSize,
    workflowRows,
    agentMemoryCount,
    requirementDocs,
    govStats,
    runningWorkflows,
    unreadNotifications,
    pendingReviews,
    deliverablesInProgress,
    reviewQueue,
    inboxActivity,
    aiOperations,
  ] = await Promise.all([
    getProjects(),
    getEmployees(),
    getAgents(),
    getMemories(),
    countReleasedVersions(),
    getActivityLogs(10),
    getActivityFeed(10),
    countDocuments(),
    countDecisions(),
    getSearchIndexSize(),
    supabase.from("workflow_runs").select("status"),
    supabase.from("agent_memory").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("type", "requirement"),
    getGovernanceStats(),
    supabase.from("workflow_runs").select("id").eq("status", "running").limit(5),
    countUnreadNotifications(),
    countPendingReviews(),
    countDeliverablesByStatus("IN_REVIEW"),
    getReviews({ status: "PENDING" }),
    getNotifications({ limit: 5 }),
    getAIOperationsMetrics(),
  ]);

  const { data: taskRows, error: taskError } = await supabase.from("tasks").select("status");
  if (taskError) throw new Error(taskError.message);

  const tasks = taskRows ?? [];
  const completedTasks = tasks.filter((task) =>
    ["released", "archived"].includes(task.status as string),
  ).length;
  const inProgressTasks = tasks.filter((task) =>
    ["in_progress", "code_review", "testing", "approval", "assigned"].includes(
      task.status as string,
    ),
  ).length;
  const openIssues = tasks.filter((task) =>
    ["backlog", "planning", "testing"].includes(task.status as string),
  ).length;

  const activeProjects = projects.filter((project) => project.status !== "completed");
  const activeAgents = agents.filter(
    (agent) => agent.status === "active" || agent.status === "busy",
  );

  const engineeringScore =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const productScore = Math.min(100, activeProjects.length * 25);
  const operationsScore =
    agents.length > 0 ? Math.round((activeAgents.length / agents.length) * 100) : 0;
  const knowledgeScore = Math.min(100, memories.length * 5);
  const releaseScore = Math.min(100, releasedVersions * 25);
  const customerScore = averageProjectHealth(activeProjects);

  const healthMetrics: HealthMetric[] = [
    {
      id: "engineering",
      label: "Engineering Health",
      status: scoreToStatus(engineeringScore),
      score: engineeringScore,
      explanation:
        tasks.length > 0
          ? `${completedTasks} of ${tasks.length} tasks completed (${engineeringScore}% completion rate).`
          : "No tasks recorded yet. Engineering health will update as work is tracked.",
    },
    {
      id: "product",
      label: "Product Health",
      status: scoreToStatus(productScore),
      score: productScore,
      explanation: `${activeProjects.length} active project${activeProjects.length === 1 ? "" : "s"} in the portfolio.`,
    },
    {
      id: "operations",
      label: "Operations Health",
      status: scoreToStatus(operationsScore),
      score: operationsScore,
      explanation: `${activeAgents.length} of ${agents.length} agents active across operations.`,
    },
    {
      id: "knowledge",
      label: "Knowledge Health",
      status: scoreToStatus(knowledgeScore),
      score: knowledgeScore,
      explanation: `${memories.length} company memory record${memories.length === 1 ? "" : "s"} indexed.`,
    },
    {
      id: "release",
      label: "Release Health",
      status: scoreToStatus(releaseScore),
      score: releaseScore,
      explanation: `${releasedVersions} released version${releasedVersions === 1 ? "" : "s"} shipped.`,
    },
    {
      id: "customer",
      label: "Customer Health",
      status: scoreToStatus(customerScore),
      score: customerScore,
      explanation:
        activeProjects.length > 0
          ? `Average project health score is ${customerScore} across active initiatives.`
          : "No active projects to evaluate customer delivery health.",
    },
  ];

  const organizationHealthScore = Math.round(
    healthMetrics.reduce((sum, metric) => sum + metric.score, 0) / healthMetrics.length,
  );

  const overview: CompanyOverview = {
    activeProjects: activeProjects.length,
    employeesOnline: employees.filter((employee) => employee.status !== "offline").length,
    totalEmployees: employees.length,
    aiAgentsActive: activeAgents.length,
    totalAgents: agents.length,
    tasksInProgress: inProgressTasks,
    releases: releasedVersions,
    openIssues,
    currentObjectives: activeProjects.map((project) => project.name),
    organizationHealthScore,
  };

  const dataPoints =
    projects.length +
    employees.length +
    agents.length +
    tasks.length +
    memories.length +
    releasedVersions;

  const workflows = workflowRows.data ?? [];
  const activeWorkflows = workflows.filter((w) => w.status === "running").length;
  const blockedWorkflows = workflows.filter((w) => w.status === "blocked").length;
  const workflowCompletionRate =
    workflows.length > 0
      ? Math.round(
          (workflows.filter((w) => w.status === "completed").length / workflows.length) * 100,
        )
      : 0;

  let workflowHealthSum = 100;
  const runningIds = (runningWorkflows.data ?? []).map((w) => w.id as string);
  if (runningIds.length > 0) {
    const healthScores = await Promise.all(runningIds.map((id) => computeWorkflowHealth(id)));
    workflowHealthSum = Math.round(
      healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length,
    );
  }

  const riskExposure = Math.min(
    100,
    govStats.escalationsToday * 15 +
      govStats.pendingApprovals * 8 +
      govStats.waitingForFounder * 12,
  );

  const workloadDistribution = await computeAllAgentWorkloads(agents);
  const agentUtilization = await getAverageUtilization(agents);
  const completedLastWeek = tasks.filter((task) =>
    ["released", "archived"].includes(task.status as string),
  ).length;
  const executionVelocity =
    tasks.length > 0 ? Math.round((completedLastWeek / tasks.length) * 100) : 0;

  return {
    overview,
    healthMetrics,
    brainStats: {
      dataPoints: dataPoints + docCount + decisionCount,
      memories: memories.length,
    },
    recentActivity,
    activityFeed: activityFeed,
    governance: {
      ...govStats,
      workflowHealth: workflowHealthSum,
      riskExposure,
    },
    operations: {
      activeWorkflows,
      workflowCompletionRate,
      generatedTasks: tasks.length,
      generatedRequirements: requirementDocs.count ?? 0,
      generatedDocuments: docCount,
      decisionsRecorded: decisionCount,
      knowledgeEntries: memories.length,
      agentMemoryCount: agentMemoryCount.count ?? 0,
      searchIndexSize,
      blockedWorkflows,
    },
    execution: {
      unreadNotifications,
      pendingReviews,
      deliverablesInProgress,
      agentUtilization,
      executionVelocity,
      workloadDistribution,
      reviewQueue: reviewQueue.slice(0, 5),
      inboxActivity,
    },
    aiOperations,
  };
}
