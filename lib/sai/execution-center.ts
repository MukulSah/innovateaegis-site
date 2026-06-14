import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getAgents } from "./agents";
import { getWorkflowApprovals } from "./governance";
import { getSessionState } from "./session-state-engine";
import { getSessionAgentFeed } from "./agent-feed";
import { getSessionArtifacts } from "./session-artifacts";
import { computeWorkflowProgress } from "./workflow-engine";
import { getWorkflowRuns } from "./workflows";
import type { ExecutionCenterData, ExecutionCenterSession, WorkflowRun } from "./types";

async function buildExecutionSession(
  workflow: WorkflowRun,
  agentMap: Map<string, string>,
): Promise<ExecutionCenterSession> {
  const [sessionState, artifacts, pending, agentFeed] = await Promise.all([
    getSessionState(workflow.id),
    getSessionArtifacts(workflow.id),
    getWorkflowApprovals({ workflowId: workflow.id, status: "pending" }),
    getSessionAgentFeed(workflow.id, workflow.projectName),
  ]);

  const progressPercent = computeWorkflowProgress(workflow.steps);
  const tasksTotal = workflow.steps.filter((s) => s.status !== "skipped").length;
  const tasksComplete = workflow.steps.filter((s) => s.status === "completed").length;

  return {
    workflow: {
      ...workflow,
      executiveSponsorName:
        sessionState?.executiveSponsorName ??
        workflow.executiveSponsorName ??
        (workflow.executiveSponsorAgentId
          ? agentMap.get(workflow.executiveSponsorAgentId) ?? null
          : null),
      sessionOwnerName:
        sessionState?.sessionOwnerName ??
        workflow.sessionOwnerName ??
        (workflow.sessionOwnerAgentId
          ? agentMap.get(workflow.sessionOwnerAgentId) ?? null
          : null),
    },
    orchestrationStatus: sessionState?.sessionStatus ?? null,
    progressPercent,
    tasksComplete,
    tasksTotal,
    pendingApprovals: pending.length,
    openRisks: pending.filter((a) => a.priority === "critical").length,
    currentAgentName: sessionState?.currentAgentName ?? null,
    nextAgentName: sessionState?.nextAgentName ?? null,
    timeline: artifacts.map((a) => ({
      id: a.id,
      stepKey: a.stepKey,
      turnNumber: a.turnNumber,
      agentName: a.agentId ? agentMap.get(a.agentId) : undefined,
      artifactName: a.artifactName,
      outputSummary: a.outputSummary.slice(0, 200),
      createdAt: a.createdAt,
    })),
    agentFeed,
  };
}

export async function getExecutionCenterData(): Promise<ExecutionCenterData> {
  const emptyStats = {
    activeWorkflows: 0,
    completedWorkflows: 0,
    failedWorkflows: 0,
    blockedTasks: 0,
    approvalsPending: 0,
  };

  if (!isSupabaseConfigured()) {
    return {
      engineStatus: {
        orchestrator: "Offline",
        workflowEngine: "Offline",
        sessionManager: "Offline",
        contextEngine: "Offline",
      },
      activeSessions: [],
      completedSessions: [],
      failedSessions: [],
      archivedSessions: [],
      stats: emptyStats,
    };
  }

  const supabase = createSupabaseAdmin();
  const [workflows, agents, tasksRes, approvals, contextRes, orchRuns] = await Promise.all([
    getWorkflowRuns(),
    getAgents(),
    supabase.from("tasks").select("status").eq("status", "planning"),
    getWorkflowApprovals({ status: "pending" }),
    supabase
      .from("agent_runtime_sessions")
      .select("context_loaded_at")
      .not("context_loaded_at", "is", null)
      .order("context_loaded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("orchestration_runs").select("status"),
  ]);

  const activeWorkflows = workflows.filter((w) => w.status === "running");
  const completedWorkflows = workflows.filter(
    (w) => w.status === "completed" && w.sessionStatus === "completed",
  );
  const failedWorkflows = workflows.filter(
    (w) => w.sessionStatus === "failed" || w.sessionStatus === "needs_founder_review",
  );
  const archivedWorkflows = workflows.filter(
    (w) =>
      w.status === "completed" &&
      (w.sessionStatus === "cancelled" ||
        (w.completedAt &&
          Date.now() - new Date(w.completedAt).getTime() > 30 * 24 * 60 * 60 * 1000)),
  );

  const orchStatuses = orchRuns.data ?? [];
  const runningOrch = orchStatuses.filter((o) => o.status === "RUNNING").length;
  const waitingOrch = orchStatuses.filter((o) => o.status === "WAITING").length;

  const engineStatus = {
    orchestrator:
      runningOrch > 0 ? "Running" : waitingOrch > 0 ? "Waiting" : "Idle",
    workflowEngine: `${activeWorkflows.length} active · ${completedWorkflows.length} completed`,
    sessionManager: `${activeWorkflows.length + completedWorkflows.length} sessions visible`,
    contextEngine: contextRes.data?.context_loaded_at
      ? `Active ${new Date(contextRes.data.context_loaded_at).toLocaleTimeString()}`
      : "Ready",
  };

  const agentMap = new Map(agents.map((a) => [a.id, a.name]));

  const [activeSessions, completedSessions, failedSessions, archivedSessions] = await Promise.all([
    Promise.all(activeWorkflows.slice(0, 10).map((w) => buildExecutionSession(w, agentMap))),
    Promise.all(completedWorkflows.slice(0, 10).map((w) => buildExecutionSession(w, agentMap))),
    Promise.all(failedWorkflows.slice(0, 10).map((w) => buildExecutionSession(w, agentMap))),
    Promise.all(archivedWorkflows.slice(0, 10).map((w) => buildExecutionSession(w, agentMap))),
  ]);

  return {
    engineStatus,
    activeSessions,
    completedSessions,
    failedSessions,
    archivedSessions,
    stats: {
      activeWorkflows: activeWorkflows.length,
      completedWorkflows: completedWorkflows.length,
      failedWorkflows: failedWorkflows.length,
      blockedTasks: tasksRes.data?.length ?? 0,
      approvalsPending: approvals.length,
    },
  };
}
