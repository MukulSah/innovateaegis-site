import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { computeSessionHealth } from "./execution-health";
import { computeStrategicHealth } from "./strategic-health";
import type { SessionStatus } from "./types";

/** Canonical session state — all workspaces must read from this view. */
export type SessionStateView = {
  sessionId: string;
  projectId: string;
  projectName: string;
  sessionNumber: number | null;
  objective: string;
  sessionStatus: SessionStatus;
  workflowStage: string | null;
  currentAgentId: string | null;
  currentAgentName: string | null;
  nextAgentId: string | null;
  nextAgentName: string | null;
  currentArtifactId: string | null;
  currentArtifact: string | null;
  currentDeliverable: string | null;
  executionHealth: number;
  strategicHealth: number;
  executionReleasedAt: string | null;
  executiveSponsorAgentId: string | null;
  executiveSponsorName: string | null;
  sessionOwnerAgentId: string | null;
  sessionOwnerName: string | null;
  currentStage: string | null;
};

export async function getSessionStateView(sessionId: string): Promise<SessionStateView | null> {
  const { getSessionTruth } = await import("./session-truth-engine");
  const truth = await getSessionTruth(sessionId);
  if (!truth) return null;

  return {
    sessionId: truth.sessionId,
    projectId: truth.projectId,
    projectName: truth.projectName,
    sessionNumber: truth.sessionNumber,
    objective: truth.objective,
    sessionStatus: truth.sessionStatus,
    workflowStage: truth.workflowStage,
    currentAgentId: truth.currentAgentId,
    currentAgentName: truth.currentAgentName,
    nextAgentId: truth.nextAgentId,
    nextAgentName: truth.nextAgentName,
    currentArtifactId: truth.currentArtifactId,
    currentArtifact: truth.currentArtifact,
    currentDeliverable: truth.currentDeliverable,
    executionHealth: truth.executionHealth,
    strategicHealth: truth.strategicHealth,
    executionReleasedAt: truth.executionReleasedAt,
    executiveSponsorAgentId: truth.executiveSponsorAgentId,
    executiveSponsorName: truth.executiveSponsorName,
    sessionOwnerAgentId: truth.sessionOwnerAgentId,
    sessionOwnerName: truth.sessionOwnerName,
    currentStage: truth.currentStage,
  };
}

export { getSessionTruth, getSessionTruthList } from "./session-truth-engine";

export async function updateSessionStatePointers(input: {
  sessionId: string;
  currentAgentId?: string | null;
  nextAgentId?: string | null;
  currentArtifactId?: string | null;
  currentArtifact?: string | null;
  currentDeliverable?: string | null;
  workflowStage?: string | null;
  currentStage?: string | null;
  sessionStatus?: SessionStatus;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.currentAgentId !== undefined) patch.current_agent_id = input.currentAgentId;
  if (input.nextAgentId !== undefined) patch.next_agent_id = input.nextAgentId;
  if (input.currentArtifactId !== undefined) patch.current_artifact_id = input.currentArtifactId;
  if (input.currentArtifact !== undefined) patch.current_artifact = input.currentArtifact;
  if (input.currentDeliverable !== undefined) patch.current_deliverable = input.currentDeliverable;
  if (input.workflowStage !== undefined) patch.workflow_stage = input.workflowStage;
  if (input.currentStage !== undefined) patch.current_stage = input.currentStage;
  if (input.sessionStatus !== undefined) patch.session_status = input.sessionStatus;

  await supabase.from("workflow_runs").update(patch).eq("id", input.sessionId);
  await refreshSessionHealthScores(input.sessionId);

  if (input.currentAgentId) {
    const { resolveStaleEscalations } = await import("./escalation-resolver");
    await resolveStaleEscalations(input.sessionId).catch(() => {});
  }
}

/** Recompute and persist health scores on workflow_runs. */
export async function refreshSessionHealthScores(sessionId: string): Promise<void> {
  const [execution, strategic] = await Promise.all([
    computeSessionHealth(sessionId),
    computeStrategicHealth(sessionId),
  ]);

  const supabase = createSupabaseAdmin();
  await supabase
    .from("workflow_runs")
    .update({
      execution_health: execution.score,
      strategic_health: strategic.score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/** Sync orchestration_runs to match canonical workflow_runs pointers. */
export async function syncOrchestrationPointers(sessionId: string): Promise<void> {
  const { getSessionState } = await import("./session-state-engine");
  const state = await getSessionState(sessionId);
  if (!state?.currentAgentId) return;

  const supabase = createSupabaseAdmin();
  await supabase
    .from("orchestration_runs")
    .update({
      current_agent_id: state.currentAgentId,
      current_step_key: state.workflowStage ?? null,
    })
    .eq("workflow_id", sessionId);
}
