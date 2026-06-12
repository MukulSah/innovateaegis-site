import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgents } from "./agents";
import { computeSessionHealth } from "./execution-health";
import { computeStrategicHealth } from "./strategic-health";
import { getWorkflowRunById } from "./workflows";
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

type WorkflowStateRow = {
  id: string;
  project_id: string;
  session_number: number | null;
  objective: string;
  session_status: string | null;
  workflow_stage: string | null;
  current_stage: string | null;
  current_agent_id: string | null;
  next_agent_id: string | null;
  current_artifact_id: string | null;
  current_artifact: string | null;
  current_deliverable: string | null;
  execution_health: number | null;
  strategic_health: number | null;
  execution_released_at: string | null;
  executive_sponsor_agent_id: string | null;
  session_owner_agent_id: string | null;
  projects?: { name: string } | { name: string }[] | null;
};

export async function getSessionStateView(sessionId: string): Promise<SessionStateView | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select(
      "id, project_id, session_number, objective, session_status, workflow_stage, current_stage, current_agent_id, next_agent_id, current_artifact_id, current_artifact, current_deliverable, execution_health, strategic_health, execution_released_at, executive_sponsor_agent_id, session_owner_agent_id, projects(name)",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as WorkflowStateRow;
  const agents = await getAgents();
  const agentName = (id: string | null | undefined) =>
    id ? agents.find((a) => a.id === id)?.name ?? null : null;

  let executionHealth = row.execution_health ?? 0;
  let strategicHealth = row.strategic_health ?? 0;

  if (!row.execution_health || !row.strategic_health) {
    const [exec, strat] = await Promise.all([
      computeSessionHealth(sessionId),
      computeStrategicHealth(sessionId),
    ]);
    executionHealth = exec.score;
    strategicHealth = strat.score;
  }

  return {
    sessionId: row.id,
    projectId: row.project_id,
    projectName:
      (Array.isArray(row.projects) ? row.projects[0]?.name : row.projects?.name) ?? "Project",
    sessionNumber: row.session_number,
    objective: row.objective,
    sessionStatus: (row.session_status as SessionStatus) ?? "running",
    workflowStage: row.workflow_stage,
    currentAgentId: row.current_agent_id,
    currentAgentName: agentName(row.current_agent_id),
    nextAgentId: row.next_agent_id,
    nextAgentName: agentName(row.next_agent_id),
    currentArtifactId: row.current_artifact_id,
    currentArtifact: row.current_artifact,
    currentDeliverable: row.current_deliverable,
    executionHealth,
    strategicHealth,
    executionReleasedAt: row.execution_released_at,
    executiveSponsorAgentId: row.executive_sponsor_agent_id,
    executiveSponsorName: agentName(row.executive_sponsor_agent_id),
    sessionOwnerAgentId: row.session_owner_agent_id,
    sessionOwnerName: agentName(row.session_owner_agent_id),
    currentStage: row.current_stage,
  };
}

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
  const workflow = await getWorkflowRunById(sessionId);
  if (!workflow?.currentAgentId) return;

  const supabase = createSupabaseAdmin();
  const stage = workflow.workflowStage ?? workflow.steps.find((s) => s.status === "in_progress")?.stepKey;
  await supabase
    .from("orchestration_runs")
    .update({
      current_agent_id: workflow.currentAgentId,
      current_step_key: stage ?? null,
    })
    .eq("workflow_id", sessionId);
}
