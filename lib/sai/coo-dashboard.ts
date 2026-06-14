import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { getSessionHandoffs } from "./coo-routing";
import { computeCooHealthSummary } from "./execution-health";
import { getWorkflowApprovals } from "./governance";
import { getAllActiveSessions, getSessionsByLifecycle } from "./session-manager";
import { getSessionState } from "./session-state-engine";
import { getNextPrimaryStage } from "./sdlc";
import { getWorkflowRunById } from "./workflows";
import type { SessionEscalation, SessionStatus } from "./types";

type EscalationRow = {
  id: string;
  workflow_run_id: string;
  issue: string;
  owner: string;
  priority: string;
  status: string;
  created_by_agent_id: string | null;
  created_at: string;
};

export type CooSessionView = {
  id: string;
  sessionNumber: number | null;
  projectName: string;
  objective: string;
  currentStage: string | null;
  sessionStatus: SessionStatus;
  currentAgentName: string | null;
  nextAgentName: string | null;
  currentArtifact: string | null;
  currentDeliverable: string | null;
  progress: number;
  healthScore: number;
};

export type CooDashboardData = {
  activeSessions: CooSessionView[];
  completedSessions: CooSessionView[];
  failedSessions: CooSessionView[];
  blockedSessions: CooSessionView[];
  sessionQueue: CooSessionView[];
  pendingApprovals: Awaited<ReturnType<typeof getWorkflowApprovals>>;
  escalations: SessionEscalation[];
  health: Awaited<ReturnType<typeof computeCooHealthSummary>>;
  recentHandoffs: Awaited<ReturnType<typeof getSessionHandoffs>>;
  aiReliability: import("./types").AIReliabilityStatus;
};

function mapEscalation(row: EscalationRow): SessionEscalation {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    issue: row.issue,
    owner: row.owner,
    priority: row.priority as SessionEscalation["priority"],
    status: row.status as SessionEscalation["status"],
    createdByAgentId: row.created_by_agent_id,
    createdAt: row.created_at,
  };
}

async function buildSessionView(sessionId: string): Promise<CooSessionView | null> {
  const [workflow, state] = await Promise.all([
    getWorkflowRunById(sessionId),
    getSessionState(sessionId),
  ]);
  if (!workflow || !state) return null;

  const completed = workflow.steps.filter((s) => s.status === "completed").length;

  return {
    id: sessionId,
    sessionNumber: state.sessionNumber,
    projectName: state.projectName,
    objective: state.objective,
    currentStage: state.currentStage,
    sessionStatus: state.sessionStatus,
    currentAgentName: state.currentAgentName,
    nextAgentName: state.nextAgentName,
    currentArtifact: state.currentArtifact,
    currentDeliverable: state.currentDeliverable,
    progress: workflow.steps.length ? Math.round((completed / workflow.steps.length) * 100) : 0,
    healthScore: state.executionHealth,
  };
}

export async function getCooDashboard(cooAgentId: string): Promise<CooDashboardData> {
  const agents = await getAgents();
  const allActive = await getAllActiveSessions();
  const owned = allActive.filter((s) => s.session_owner_agent_id === cooAgentId);

  const lifecycleRows = await getSessionsByLifecycle({
    includeCompleted: true,
    includeCancelled: true,
    limit: 30,
  });
  const ownedLifecycle = lifecycleRows.filter((s) => s.session_owner_agent_id === cooAgentId);

  const views = (await Promise.all(owned.map((s) => buildSessionView(s.id)))).filter(
    (v): v is CooSessionView => v !== null,
  );

  const lifecycleViews = (
    await Promise.all(ownedLifecycle.map((s) => buildSessionView(s.id)))
  ).filter((v): v is CooSessionView => v !== null);

  const activeSessions = views.filter(
    (v) => ["executing", "running", "planning", "waiting_approval", "needs_founder_review"].includes(v.sessionStatus),
  );
  const completedSessions = lifecycleViews.filter((v) => v.sessionStatus === "completed");
  const failedSessions = lifecycleViews.filter(
    (v) => v.sessionStatus === "failed" || v.sessionStatus === "needs_founder_review",
  );
  const blockedSessions = views.filter(
    (v) => v.sessionStatus === "blocked" || v.sessionStatus === "stalled" || v.sessionStatus === "recovery",
  );
  const sessionQueue = views.filter((v) => ["pending_coo", "planning"].includes(v.sessionStatus));

  const pendingApprovals = (
    await Promise.all(owned.map((s) => getWorkflowApprovals({ workflowId: s.id, status: "pending" })))
  ).flat();

  const supabase = createSupabaseAdmin();

  const { resolveStaleEscalations } = await import("./escalation-resolver");
  const { detectArchitectExecutionFailure } = await import("./architect-monitor");
  await Promise.all(
    owned.map(async (s) => {
      await resolveStaleEscalations(s.id).catch(() => 0);
      await detectArchitectExecutionFailure(s.id).catch(() => false);
    }),
  );

  const { data: escalationRows } = await supabase
    .from("session_escalations")
    .select("*")
    .in("workflow_run_id", owned.map((s) => s.id))
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  const primarySession = activeSessions[0];
  const recentHandoffs = primarySession ? await getSessionHandoffs(primarySession.id) : [];

  const health = await computeCooHealthSummary(owned.map((s) => s.id));
  const { getSessionAIReliability, getGlobalAIReliability } = await import("./ai-reliability");
  const aiReliability = primarySession
    ? await getSessionAIReliability(primarySession.id)
    : await getGlobalAIReliability();

  return {
    activeSessions,
    completedSessions,
    failedSessions,
    blockedSessions,
    sessionQueue,
    pendingApprovals,
    escalations: (escalationRows ?? []).map(mapEscalation),
    health,
    recentHandoffs,
    aiReliability,
  };
}

export async function createSessionEscalation(input: {
  sessionId: string;
  issue: string;
  owner?: string;
  priority?: SessionEscalation["priority"];
  createdByAgentId: string;
}): Promise<SessionEscalation> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_escalations")
    .insert({
      workflow_run_id: input.sessionId,
      issue: input.issue,
      owner: input.owner ?? "Founder",
      priority: input.priority ?? "medium",
      status: "open",
      created_by_agent_id: input.createdByAgentId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapEscalation(data as EscalationRow);
}

export function getNextStepLabel(stepKey: string): string {
  return getNextPrimaryStage(stepKey)?.label ?? "Complete";
}

export async function resolveCooAgentId(): Promise<string | null> {
  const agents = await getAgents();
  return findAgentForRole(agents, ["COO", "Chief Operating"])?.id ?? null;
}
