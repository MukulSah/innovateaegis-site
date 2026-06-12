import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getAgents } from "./agents";
import { getWorkflowApprovals } from "./governance";
import { getSessionStateView } from "./session-state-view";
import { getSessionAgentFeed } from "./agent-feed";
import { getSessionArtifacts } from "./session-artifacts";
import { computeWorkflowProgress } from "./workflow-engine";
import { getWorkflowRuns } from "./workflows";
import type { ExecutionCenterData, ExecutionCenterSession } from "./types";

export async function getExecutionCenterData(): Promise<ExecutionCenterData> {
  if (!isSupabaseConfigured()) {
    return {
      engineStatus: {
        orchestrator: "Offline",
        workflowEngine: "Offline",
        sessionManager: "Offline",
        contextEngine: "Offline",
      },
      activeSessions: [],
      stats: { activeWorkflows: 0, blockedTasks: 0, approvalsPending: 0 },
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
  const orchStatuses = orchRuns.data ?? [];
  const runningOrch = orchStatuses.filter((o) => o.status === "RUNNING").length;
  const waitingOrch = orchStatuses.filter((o) => o.status === "WAITING").length;

  const engineStatus = {
    orchestrator:
      runningOrch > 0 ? "Running" : waitingOrch > 0 ? "Waiting" : "Idle",
    workflowEngine: `${activeWorkflows.length} active`,
    sessionManager: `${activeWorkflows.length} sessions`,
    contextEngine: contextRes.data?.context_loaded_at
      ? `Active ${new Date(contextRes.data.context_loaded_at).toLocaleTimeString()}`
      : "Ready",
  };

  const agentMap = new Map(agents.map((a) => [a.id, a.name]));

  const activeSessions: ExecutionCenterSession[] = await Promise.all(
    activeWorkflows.slice(0, 10).map(async (workflow) => {
      const [sessionState, artifacts, pending, agentFeed] = await Promise.all([
        getSessionStateView(workflow.id),
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
    }),
  );

  return {
    engineStatus,
    activeSessions,
    stats: {
      activeWorkflows: activeWorkflows.length,
      blockedTasks: tasksRes.data?.length ?? 0,
      approvalsPending: approvals.length,
    },
  };
}
