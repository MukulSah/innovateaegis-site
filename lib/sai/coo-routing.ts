import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgentById } from "./agents";
import { recordActivityFeed } from "./activity-feed";
import { sendAgentMessage } from "./agent-conversations";
import { postExecutiveMessage } from "./executive-session-chat";
import { nullableUuid } from "./nullable-uuid";
import {
  applyWorkflowTransition,
  resolveAgentForPrimaryStep,
} from "./session-state-engine";
import { getNextPrimaryStage, SDLC_WORKFLOW } from "./sdlc";
import { resolveStaleEscalations } from "./escalation-resolver";
import { triggerStepExecution } from "./step-execution";
import type { SessionHandoff } from "./types";

type HandoffRow = {
  id: string;
  workflow_run_id: string;
  artifact_id: string | null;
  artifact_name: string | null;
  completed_by_agent_id: string | null;
  assigned_to_agent_id: string | null;
  assigned_by_agent_id: string | null;
  from_step_key: string | null;
  to_step_key: string | null;
  reason: string;
  status: string;
  created_at: string;
};

function mapHandoff(row: HandoffRow): SessionHandoff {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    artifactId: row.artifact_id,
    artifactName: row.artifact_name,
    completedByAgentId: row.completed_by_agent_id,
    assignedToAgentId: row.assigned_to_agent_id,
    assignedByAgentId: row.assigned_by_agent_id,
    fromStepKey: row.from_step_key,
    toStepKey: row.to_step_key,
    reason: row.reason,
    status: row.status as SessionHandoff["status"],
    createdAt: row.created_at,
  };
}

export async function createSessionHandoff(input: {
  workflowRunId: string;
  artifactId?: string | null;
  artifactName?: string | null;
  completedByAgentId?: string | null;
  assignedToAgentId: string;
  assignedByAgentId: string;
  fromStepKey?: string | null;
  toStepKey?: string | null;
  reason: string;
}): Promise<SessionHandoff> {
  const supabase = createSupabaseAdmin();

  let existingQuery = supabase
    .from("session_handoffs")
    .select("*")
    .eq("workflow_run_id", input.workflowRunId)
    .eq("assigned_to_agent_id", input.assignedToAgentId)
    .eq("assigned_by_agent_id", input.assignedByAgentId);

  if (input.fromStepKey) existingQuery = existingQuery.eq("from_step_key", input.fromStepKey);
  if (input.toStepKey) existingQuery = existingQuery.eq("to_step_key", input.toStepKey);
  if (input.artifactName) existingQuery = existingQuery.eq("artifact_name", input.artifactName);

  const { data: existing } = await existingQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return mapHandoff(existing as HandoffRow);

  const { data, error } = await supabase
    .from("session_handoffs")
    .insert({
      workflow_run_id: input.workflowRunId,
      artifact_id: nullableUuid(input.artifactId),
      artifact_name: input.artifactName ?? null,
      completed_by_agent_id: nullableUuid(input.completedByAgentId),
      assigned_to_agent_id: input.assignedToAgentId,
      assigned_by_agent_id: input.assignedByAgentId,
      from_step_key: input.fromStepKey ?? null,
      to_step_key: input.toStepKey ?? null,
      reason: input.reason,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapHandoff(data as HandoffRow);
}

export async function assignNextAgent(input: {
  sessionId: string;
  fromStepKey: string;
  toAgentId: string;
  cooAgentId: string;
  reason: string;
  artifactId?: string | null;
  artifactName?: string | null;
  completedByAgentId?: string | null;
}): Promise<SessionHandoff> {
  const nextStage = getNextPrimaryStage(input.fromStepKey);
  const toStepKey =
    input.fromStepKey === "coo_execution" ? "requirements" : (nextStage?.key ?? null);

  if (!toStepKey) {
    throw new Error(`No next primary stage after ${input.fromStepKey}`);
  }

  const handoff = await createSessionHandoff({
    workflowRunId: input.sessionId,
    artifactId: input.artifactId,
    artifactName: input.artifactName,
    completedByAgentId: input.completedByAgentId,
    assignedToAgentId: input.toAgentId,
    assignedByAgentId: input.cooAgentId,
    fromStepKey: input.fromStepKey,
    toStepKey,
    reason: input.reason,
  });

  const coo = await getAgentById(input.cooAgentId);
  const target = await getAgentById(input.toAgentId);

  if (coo) {
    await postExecutiveMessage(
      coo,
      input.sessionId,
      `Assigned ${target?.name ?? "next agent"}: ${input.reason}`,
      { stepKey: input.fromStepKey, artifactName: input.artifactName ?? undefined },
    );
  }
  if (coo && target) {
    await sendAgentMessage({
      workflowId: input.sessionId,
      senderAgentId: coo.id,
      receiverAgentId: target.id,
      message: `COO assigned you: ${input.reason}`,
      messageType: "handoff",
    });
    await recordActivityFeed({
      actor: coo.name,
      action: "coo_handoff",
      targetType: "workflow",
      targetId: input.sessionId,
      description: `${input.artifactName ?? input.fromStepKey} → ${target.name}`,
    });
  }

  await applyWorkflowTransition({
    sessionId: input.sessionId,
    fromStepKey: input.fromStepKey,
    toStepKey,
    currentAgentId: input.toAgentId,
    completedByAgentId: input.completedByAgentId,
    currentArtifactId: input.artifactId ?? null,
    sessionStatus: "executing",
  });

  await triggerStepExecution(input.sessionId).catch(() => {});
  await resolveStaleEscalations(input.sessionId);

  return handoff;
}

export async function routeAfterStepComplete(input: {
  sessionId: string;
  completedStepKey: string;
  artifactId?: string | null;
  artifactName?: string | null;
  completedByAgentId: string;
  cooAgentId: string;
}): Promise<SessionHandoff | null> {
  const supabase = createSupabaseAdmin();

  if (input.completedStepKey === "requirements") {
    const { canStartArchitecture } = await import("./requirements-engine");
    const workflow = await supabase
      .from("workflow_runs")
      .select("project_id")
      .eq("id", input.sessionId)
      .maybeSingle();
    const gate = await canStartArchitecture(
      input.sessionId,
      workflow.data?.project_id as string,
    );
    if (!gate.allowed) return null;
  }

  const nextStepKey =
    input.completedStepKey === "coo_execution"
      ? "requirements"
      : (getNextPrimaryStage(input.completedStepKey)?.key ?? null);
  if (!nextStepKey) return null;

  const sdlcStep = SDLC_WORKFLOW.find((s) => s.key === nextStepKey);
  if (!sdlcStep) return null;

  const toAgentId = await resolveAgentForPrimaryStep(input.sessionId, nextStepKey);
  if (!toAgentId) return null;

  return assignNextAgent({
    sessionId: input.sessionId,
    fromStepKey: input.completedStepKey,
    toAgentId,
    cooAgentId: input.cooAgentId,
    reason: `${sdlcStep.label} — ${sdlcStep.taskTitle}`,
    artifactId: input.artifactId,
    artifactName: input.artifactName ?? `${input.completedStepKey}_v1`,
    completedByAgentId: input.completedByAgentId,
  });
}

export async function getSessionHandoffs(workflowRunId: string): Promise<SessionHandoff[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_handoffs")
    .select("*")
    .eq("workflow_run_id", workflowRunId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as HandoffRow[]).map(mapHandoff);
}

export async function getAgentSessionHandoffs(agentId: string, limit = 20): Promise<SessionHandoff[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_handoffs")
    .select("*")
    .or(`assigned_to_agent_id.eq.${agentId},assigned_by_agent_id.eq.${agentId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as HandoffRow[]).map(mapHandoff);
}
