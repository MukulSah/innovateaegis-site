import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getAgents, findAgentForRole } from "./agents";
import { getActiveRuntimeSessions } from "./agent-runtime";
import { getAgentMetrics } from "./agent-metrics";
import { getEmployees } from "./employees";
import { getExecutionCenterData } from "./execution-center";
import { getWorkflowApprovals } from "./governance";
import { getProjects } from "./projects";
import { getSessionState } from "./session-state-engine";
import type { SessionStateView } from "./session-state-view";
import { computeWorkflowProgress } from "./workflow-engine";
import { getWorkflowRuns } from "./workflows";
import { computeAllAgentWorkloads } from "./workload";
import type {
  Agent,
  AgentHandlingStatus,
  AgentLiveSession,
  HealthStatus,
  OrganizationActionItem,
  OrganizationAgentRow,
  OrganizationDepartmentSnapshot,
  OrganizationHeadquartersData,
  OrganizationSessionWorkspace,
} from "./types";
import { getFounderSessionTimeline } from "./founder-timeline";
import { getAllSessionRows } from "./session-center";

import { ORGANIZATION_DEPARTMENTS } from "./organization-constants";
export { ORGANIZATION_DEPARTMENTS } from "./organization-constants";

const IDLE_SESSION: AgentLiveSession = {
  sessionId: null,
  sessionNumber: null,
  projectId: null,
  projectName: null,
  objective: null,
  currentStage: null,
  workflowStage: null,
  handlingStatus: "idle",
  currentStep: null,
  nextStep: null,
  progressPercent: 0,
  healthScore: null,
  cooReviewPending: 0,
  cooReviewLabel: null,
};

function healthFromScore(score: number): HealthStatus {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

function agentAiHealth(agent: Agent, metrics: OrganizationAgentRow["metrics"]): HealthStatus {
  const score = metrics?.scores.overallScore ?? agent.performanceScore;
  if (agent.status === "disabled") return "red";
  return healthFromScore(score);
}

function resolveHandlingStatus(input: {
  isCurrent: boolean;
  isNext: boolean;
  hasRuntime: boolean;
  reviewCount: number;
  agentStatus: Agent["status"];
}): AgentHandlingStatus {
  if (input.reviewCount > 0) return "review";
  if (input.isCurrent || input.hasRuntime) return "running";
  if (input.isNext) return "waiting";
  if (input.agentStatus === "idle") return "idle";
  return "idle";
}

function buildLiveSession(
  agent: Agent,
  state: SessionStateView | null,
  role: "current" | "next" | "step" | null,
  reviewCount: number,
  progressPercent: number,
  hasRuntime: boolean,
): AgentLiveSession {
  if (!state) {
    return {
      ...IDLE_SESSION,
      handlingStatus: resolveHandlingStatus({
        isCurrent: false,
        isNext: false,
        hasRuntime,
        reviewCount,
        agentStatus: agent.status,
      }),
      cooReviewPending: reviewCount,
      cooReviewLabel: reviewCount > 0 ? `${reviewCount} COO review${reviewCount === 1 ? "" : "s"}` : null,
    };
  }

  const isCurrent = role === "current" || role === "step";
  const isNext = role === "next";

  return {
    sessionId: state.sessionId,
    sessionNumber: state.sessionNumber,
    projectId: state.projectId,
    projectName: state.projectName,
    objective: state.objective,
    currentStage: state.currentStage,
    workflowStage: state.workflowStage,
    handlingStatus: resolveHandlingStatus({
      isCurrent,
      isNext,
      hasRuntime,
      reviewCount,
      agentStatus: agent.status,
    }),
    currentStep: isCurrent ? state.currentStage ?? state.workflowStage : null,
    nextStep: isNext ? state.currentStage ?? state.workflowStage : state.nextAgentName,
    progressPercent,
    healthScore: state.executionHealth,
    cooReviewPending: reviewCount,
    cooReviewLabel: reviewCount > 0 ? `${reviewCount} pending COO review` : null,
  };
}

function pickPrimarySession(
  agentId: string,
  currentMap: Map<string, SessionStateView>,
  nextMap: Map<string, SessionStateView>,
  stepMap: Map<string, SessionStateView>,
  runtimeAgentIds: Set<string>,
): { state: SessionStateView | null; role: "current" | "next" | "step" | null; progress: number } {
  if (currentMap.has(agentId)) {
    return { state: currentMap.get(agentId)!, role: "current", progress: 0 };
  }
  if (stepMap.has(agentId)) {
    return { state: stepMap.get(agentId)!, role: "step", progress: 0 };
  }
  if (nextMap.has(agentId)) {
    return { state: nextMap.get(agentId)!, role: "next", progress: 0 };
  }
  if (runtimeAgentIds.has(agentId)) {
    const first = [...currentMap.values()][0] ?? null;
    return { state: first, role: "current", progress: 0 };
  }
  return { state: null, role: null, progress: 0 };
}

async function buildActionCenter(
  agents: Agent[],
  executionData: Awaited<ReturnType<typeof getExecutionCenterData>>,
): Promise<OrganizationActionItem[]> {
  const items: OrganizationActionItem[] = [];
  const agentNames = new Set(agents.map((a) => a.name));

  for (const session of executionData.activeSessions) {
    const wf = session.workflow;
    items.push({
      id: `session-${wf.id}`,
      type: "session",
      title: `Session #${wf.sessionNumber ?? "—"} running`,
      description: `${wf.objective} · ${session.currentAgentName ?? "Unassigned"} handling · Next: ${session.nextAgentName ?? "—"}`,
      sessionId: wf.id,
      sessionNumber: wf.sessionNumber,
      projectName: wf.projectName ?? null,
      agentName: session.currentAgentName,
      status: wf.sessionStatus ?? wf.status,
      timestamp: wf.updatedAt,
      href: `/sai/sessions/${wf.id}`,
    });

    for (const feed of session.agentFeed.slice(0, 3)) {
      items.push({
        id: `feed-${feed.id}`,
        type: feed.type === "approval" ? "approval" : "activity",
        title: feed.headline,
        description: feed.body ?? feed.agentName,
        sessionId: wf.id,
        sessionNumber: wf.sessionNumber,
        projectName: feed.projectName ?? wf.projectName ?? null,
        agentName: feed.agentName,
        status: feed.approvalStatus ?? "active",
        timestamp: feed.createdAt,
        href: feed.approvalId ? `/sai/founder?tab=inbox` : `/sai/sessions/${wf.id}`,
      });
    }
  }

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdmin();
    const { data: activity } = await supabase
      .from("activity_feed")
      .select("id, action, description, actor, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    for (const row of activity ?? []) {
      if (items.length >= 40) break;
      const actor = row.actor ?? "System";
      if (!agentNames.has(actor) && row.action !== "session_state_reconciled") continue;
      items.push({
        id: `activity-${row.id}`,
        type: "activity",
        title: row.action.replace(/_/g, " "),
        description: row.description ?? "",
        sessionId: row.target_type === "workflow" ? row.target_id : null,
        sessionNumber: null,
        projectName: null,
        agentName: agentNames.has(actor) ? actor : null,
        status: "logged",
        timestamp: row.created_at,
        href: row.target_type === "workflow" && row.target_id ? `/sai/sessions/${row.target_id}` : null,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);
}

function buildDepartments(
  agents: Agent[],
  employees: Awaited<ReturnType<typeof getEmployees>>,
  agentRows: OrganizationAgentRow[],
  departmentNames: string[],
): OrganizationDepartmentSnapshot[] {
  const names = new Set([
    ...departmentNames,
    ...agents.map((a) => a.department).filter(Boolean),
    ...employees.map((e) => e.department).filter(Boolean),
  ]);

  return [...names]
    .filter(Boolean)
    .sort()
    .map((name) => {
      const deptAgents = agents.filter((a) => a.department === name);
      const deptEmployees = employees.filter((e) => e.department === name);
      const liveRows = agentRows.filter((r) => r.agent.department === name);
      const activeSessions = new Set(
        liveRows.map((r) => r.liveSession.sessionId).filter(Boolean),
      ).size;
      const assignedAgents = liveRows.filter(
        (r) => r.liveSession.handlingStatus !== "idle",
      ).length;
      const healthScores = liveRows
        .map((r) => r.liveSession.healthScore ?? r.metrics?.scores.overallScore ?? r.agent.performanceScore)
        .filter((s) => s > 0);
      const healthScore =
        healthScores.length > 0
          ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
          : deptAgents.length > 0
            ? Math.round(
                deptAgents.reduce((sum, a) => sum + a.performanceScore, 0) / deptAgents.length,
              )
            : 70;

      return {
        name,
        agentCount: deptAgents.length,
        employeeCount: deptEmployees.length,
        activeSessions,
        assignedAgents,
        healthScore,
        healthStatus: healthFromScore(healthScore),
      };
    });
}

export async function getOrganizationHeadquartersData(
  founderName = "Founder",
): Promise<OrganizationHeadquartersData> {
  const empty: OrganizationHeadquartersData = {
    dashboard: {
      totalAgents: 0,
      activeAgents: 0,
      idleAgents: 0,
      assignedAgents: 0,
      departmentCoverage: 0,
      aiHealthScore: 0,
      activeSessions: 0,
    },
    agents: [],
    departments: [],
    activeSessions: [],
    sessionWorkspaces: [],
    actionCenter: [],
    employees: [],
    projects: [],
    founderName,
  };

  if (!isSupabaseConfigured()) return empty;

  try {
    const [agents, employees, projects, metricsList, executionData, runtimeSessions, approvals, sessionTimeline] =
      await Promise.all([
        getAgents(),
        getEmployees(),
        getProjects(),
        getAgentMetrics(),
        getExecutionCenterData(),
        getActiveRuntimeSessions(),
        getWorkflowApprovals({ status: "pending" }),
        getFounderSessionTimeline(),
      ]);

    const workloads = await computeAllAgentWorkloads(agents);
    const workloadMap = new Map(workloads.map((w) => [w.agentId, w]));
    const metricsMap = new Map(metricsList.map((m) => [m.agentId, m]));

    const activeWorkflows = executionData.activeSessions.map((s) => s.workflow);
    const sessionStates = await Promise.all(
      activeWorkflows.map((w) => getSessionState(w.id).catch(() => null)),
    );

    const progressMap = new Map(
      executionData.activeSessions.map((s) => [s.workflow.id, s.progressPercent]),
    );

    const currentMap = new Map<string, SessionStateView>();
    const nextMap = new Map<string, SessionStateView>();
    for (const state of sessionStates) {
      if (!state) continue;
      if (state.currentAgentId) currentMap.set(state.currentAgentId, state);
      if (state.nextAgentId) nextMap.set(state.nextAgentId, state);
    }

    const stepMap = new Map<string, SessionStateView>();
    if (activeWorkflows.length > 0) {
      const supabase = createSupabaseAdmin();
      const { data: steps } = await supabase
        .from("workflow_run_steps")
        .select("workflow_run_id, assigned_agent_id, step_key, status")
        .in(
          "workflow_run_id",
          activeWorkflows.map((w) => w.id),
        )
        .eq("status", "in_progress");

      for (const step of steps ?? []) {
        const agentId = step.assigned_agent_id as string | null;
        if (!agentId) continue;
        const state = sessionStates.find((s) => s?.sessionId === step.workflow_run_id);
        if (state) stepMap.set(agentId, state);
      }
    }

    const runtimeAgentIds = new Set(runtimeSessions.map((r) => r.agentId));

    const approvalsBySession = new Map<string, number>();
    for (const approval of approvals) {
      if (!approval.workflowId) continue;
      approvalsBySession.set(
        approval.workflowId,
        (approvalsBySession.get(approval.workflowId) ?? 0) + 1,
      );
    }

    const agentRows: OrganizationAgentRow[] = agents.map((agent) => {
      const { state, role } = pickPrimarySession(
        agent.id,
        currentMap,
        nextMap,
        stepMap,
        runtimeAgentIds,
      );
      const progress = state ? (progressMap.get(state.sessionId) ?? 0) : 0;
      const reviewCount = state ? (approvalsBySession.get(state.sessionId) ?? 0) : 0;
      const metrics = metricsMap.get(agent.id) ?? null;
      const workload = workloadMap.get(agent.id) ?? {
        agentId: agent.id,
        agentName: agent.name,
        tasksCount: 0,
        reviewsCount: 0,
        approvalsCount: 0,
        deliverablesCount: 0,
        utilization: 0,
        capacityStatus: "AVAILABLE" as const,
      };

      return {
        agent: { ...agent, capacityStatus: workload.capacityStatus },
        liveSession: buildLiveSession(
          agent,
          state,
          role,
          reviewCount,
          progress,
          runtimeAgentIds.has(agent.id),
        ),
        workload,
        metrics,
        aiHealth: agentAiHealth(agent, metrics),
      };
    });

    const departments = buildDepartments(agents, employees, agentRows, [...ORGANIZATION_DEPARTMENTS]);
    const actionCenter = await buildActionCenter(agents, executionData);

    const assignedAgents = agentRows.filter((r) => r.liveSession.handlingStatus !== "idle").length;
    const idleAgents = agentRows.filter((r) => r.liveSession.handlingStatus === "idle").length;
    const activeAgents = agents.filter((a) => a.status === "active" || a.status === "busy").length;
    const coveredDepartments = new Set(agents.map((a) => a.department).filter(Boolean)).size;
    const aiHealthScore =
      agentRows.length > 0
        ? Math.round(
            agentRows.reduce(
              (sum, r) => sum + (r.metrics?.scores.overallScore ?? r.agent.performanceScore),
              0,
            ) / agentRows.length,
          )
        : 0;

    const sessionWorkspaces: OrganizationSessionWorkspace[] = getAllSessionRows(sessionTimeline).map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      projectName: s.projectName,
      objective: s.objective,
      bucket: s.bucket,
      sessionStatus: s.sessionStatus,
      executionHealth: s.executionHealth,
      currentAgentName: s.currentAgentName,
      href: `/sai/sessions/${s.id}`,
    }));

    return {
      dashboard: {
        totalAgents: agents.length,
        activeAgents,
        idleAgents,
        assignedAgents,
        departmentCoverage: coveredDepartments,
        aiHealthScore,
        activeSessions: executionData.activeSessions.length,
      },
      agents: agentRows,
      departments,
      activeSessions: executionData.activeSessions,
      sessionWorkspaces,
      actionCenter,
      employees,
      projects,
      founderName,
    };
  } catch (error) {
    console.error("[organization-headquarters]", error);
    return empty;
  }
}

export async function getAgentSessionHistory(agentId: string, limit = 15) {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const workflows = await getWorkflowRuns();
  const agentWorkflows = workflows.filter(
    (w) =>
      w.executiveSponsorAgentId === agentId ||
      w.sessionOwnerAgentId === agentId ||
      w.steps.some((s) => s.assignedAgentId === agentId),
  );

  const sessions = await Promise.all(
    agentWorkflows.slice(0, limit).map(async (w) => {
      const state = await getSessionState(w.id).catch(() => null);
      return {
        workflow: w,
        progressPercent: computeWorkflowProgress(w.steps),
        state,
      };
    }),
  );

  return sessions;
}

export function resolveCooAgent(agents: Agent[]): Agent | null {
  return findAgentForRole(agents, ["COO", "Chief Operating"]) ?? null;
}
