import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { recordActivityFeed } from "./activity-feed";
import { recordWorkflowEvent } from "./workflow-events";
import {
  deliverableArtifactName,
  getNextPrimaryStage,
  getPrimarySdlcChain,
  SDLC_WORKFLOW,
  stepContextArtifactName,
} from "./sdlc";
import {
  getSessionStateView,
  refreshSessionHealthScores,
  syncOrchestrationPointers,
  type SessionStateView,
} from "./session-state-view";
import type { Agent, SessionStatus } from "./types";
import { guardRecoveryFromCompletedSession } from "./session-finalization-engine";

export type { SessionStateView };

const NON_EXECUTABLE_STATUSES = new Set<SessionStatus>([
  "completed",
  "cancelled",
  "failed",
  "waiting_for_ai_capacity",
]);

/** True when agents may still run work for this session. */
export async function isSessionExecutable(
  sessionId: string,
  forceResume = false,
): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("workflow_runs")
    .select("status, session_status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return false;
  if (data.status !== "running") return false;
  const sessionStatus = (data.session_status as SessionStatus) ?? "running";
  if (forceResume && sessionStatus === "waiting_for_ai_capacity") return true;
  return !NON_EXECUTABLE_STATUSES.has(sessionStatus);
}

/** Stop orchestration, dismiss pending approvals, resolve escalations. */
export async function haltSessionExecution(
  sessionId: string,
  reason: string,
  actor = "System",
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from("orchestration_runs")
    .update({ status: "COMPLETED", completed_at: now })
    .eq("workflow_id", sessionId);

  await supabase
    .from("workflow_approvals")
    .update({
      status: "rejected",
      approved_by: actor,
      approved_at: now,
      description: `Dismissed — session halted: ${reason}`,
    })
    .eq("workflow_id", sessionId)
    .eq("status", "pending");

  await supabase
    .from("workflow_approvals")
    .update({
      status: "rejected",
      approved_by: actor,
      approved_at: now,
    })
    .eq("workflow_id", sessionId)
    .eq("status", "escalated");

  const { resolveStaleEscalations } = await import("./escalation-resolver");
  await resolveStaleEscalations(sessionId).catch(() => {});

  await supabase
    .from("workflow_run_steps")
    .update({ status: "skipped" })
    .eq("workflow_run_id", sessionId)
    .eq("status", "in_progress");

  await recordActivityFeed({
    actor,
    action: "session_execution_halted",
    targetType: "workflow",
    targetId: sessionId,
    description: reason,
  });
}

/** Canonical session state — all workspaces must use this. */
export async function getSessionState(sessionId: string): Promise<SessionStateView | null> {
  return getSessionStateView(sessionId);
}

export async function resolveAgentForPrimaryStep(
  sessionId: string,
  stepKey: string,
  agents?: Agent[],
): Promise<string | null> {
  const roster = agents ?? (await getAgents());
  const supabase = createSupabaseAdmin();
  const { data: stepRow } = await supabase
    .from("workflow_run_steps")
    .select("assigned_agent_id")
    .eq("workflow_run_id", sessionId)
    .eq("step_key", stepKey)
    .maybeSingle();

  if (stepRow?.assigned_agent_id) return stepRow.assigned_agent_id as string;

  const sdlcStep = SDLC_WORKFLOW.find((s) => s.key === stepKey);
  const resolved = findAgentForRole(roster, sdlcStep?.matchRoles ?? []);
  if (!resolved) return null;

  await supabase
    .from("workflow_run_steps")
    .update({ assigned_agent_id: resolved.id })
    .eq("workflow_run_id", sessionId)
    .eq("step_key", stepKey);

  return resolved.id;
}

export async function resolveNextPrimaryAgentId(
  sessionId: string,
  afterStepKey: string,
  agents?: Agent[],
): Promise<string | null> {
  const nextStage = getNextPrimaryStage(afterStepKey);
  if (!nextStage) return null;
  return resolveAgentForPrimaryStep(sessionId, nextStage.key, agents);
}

function pickPrimaryInProgressStep(
  steps: { step_key: string; status: string; step_order: number; assigned_agent_id?: string | null }[],
): { step_key: string; status: string; assigned_agent_id?: string | null } | null {
  const primaryKeys = new Set(getPrimarySdlcChain().map((s) => s.key));
  const chain = getPrimarySdlcChain();
  const inProgress = steps.filter(
    (s) => s.status === "in_progress" && primaryKeys.has(s.step_key),
  );
  if (inProgress.length === 0) return null;
  return inProgress.sort(
    (a, b) =>
      chain.findIndex((c) => c.key === b.step_key) -
      chain.findIndex((c) => c.key === a.step_key),
  )[0];
}

/** Atomic workflow transition — steps, pointers, orchestration stay in sync. */
export async function applyWorkflowTransition(input: {
  sessionId: string;
  fromStepKey: string;
  toStepKey: string;
  currentAgentId: string;
  completedByAgentId?: string | null;
  sessionStatus?: SessionStatus;
  currentArtifact?: string | null;
  currentDeliverable?: string | null;
  currentArtifactId?: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const agents = await getAgents();
  const toSdlc = SDLC_WORKFLOW.find((s) => s.key === input.toStepKey);
  const nextAgentId = await resolveNextPrimaryAgentId(input.sessionId, input.toStepKey, agents);

  await supabase
    .from("workflow_run_steps")
    .update({ status: "completed", completed_at: now })
    .eq("workflow_run_id", input.sessionId)
    .eq("step_key", input.fromStepKey);

  await supabase
    .from("workflow_run_steps")
    .update({
      status: "in_progress",
      started_at: now,
      assigned_agent_id: input.currentAgentId,
    })
    .eq("workflow_run_id", input.sessionId)
    .eq("step_key", input.toStepKey);

  await supabase
    .from("tasks")
    .update({ assigned_agent_id: input.currentAgentId, status: "assigned" })
    .eq("workflow_run_id", input.sessionId)
    .eq("workflow_step_key", input.toStepKey);

  const patch: Record<string, unknown> = {
    updated_at: now,
    current_agent_id: input.currentAgentId,
    next_agent_id: nextAgentId,
    workflow_stage: input.toStepKey,
    current_stage: toSdlc?.label ?? input.toStepKey,
    current_deliverable: input.currentDeliverable ?? deliverableArtifactName(input.toStepKey),
    current_artifact: input.currentArtifact ?? stepContextArtifactName(input.toStepKey),
    session_status: input.sessionStatus ?? "executing",
  };
  if (input.currentArtifactId !== undefined) {
    patch.current_artifact_id = input.currentArtifactId;
  }

  await supabase.from("workflow_runs").update(patch).eq("id", input.sessionId);

  await supabase
    .from("orchestration_runs")
    .update({
      current_step_key: input.toStepKey,
      current_agent_id: input.currentAgentId,
      status: "RUNNING",
    })
    .eq("workflow_id", input.sessionId);

  await refreshSessionHealthScores(input.sessionId);

  await recordWorkflowEvent({
    workflowId: input.sessionId,
    eventType: "workflow_transition",
    actor: "Session State Engine",
    title: `${input.fromStepKey} → ${input.toStepKey}`,
    description: `Assigned agent ${input.currentAgentId}`,
  });

  const { resolveStaleEscalations } = await import("./escalation-resolver");
  await resolveStaleEscalations(input.sessionId).catch(() => {});
}

/** Repair drift between handoffs, steps, and canonical workflow_runs pointers. */
export async function reconcileSessionState(sessionId: string): Promise<{
  repaired: boolean;
  resumeExecution: boolean;
  actions: string[];
  state: SessionStateView | null;
}> {
  const supabase = createSupabaseAdmin();
  const actions: string[] = [];
  const agents = await getAgents();

  const { data: steps } = await supabase
    .from("workflow_run_steps")
    .select("step_key, status, assigned_agent_id, step_order")
    .eq("workflow_run_id", sessionId)
    .order("step_order");

  const stepRows = steps ?? [];
  const primaryStep = pickPrimaryInProgressStep(stepRows);
  const state = await getSessionState(sessionId);
  if (!state) return { repaired: false, resumeExecution: false, actions: ["Session not found"], state: null };

  const guard = await guardRecoveryFromCompletedSession(sessionId);
  if (!guard.allowRecovery) {
    return {
      repaired: guard.finalized,
      resumeExecution: false,
      actions: [guard.reason || "Session finalized — recovery blocked"],
      state: await getSessionState(sessionId),
    };
  }

  if (!(await isSessionExecutable(sessionId))) {
    const { data: wfRow } = await supabase
      .from("workflow_runs")
      .select("session_status")
      .eq("id", sessionId)
      .maybeSingle();
    const sessionStatus = (wfRow?.session_status as SessionStatus) ?? "running";

    // Waiting on AI retry is a paused-but-active state — never halt.
    if (sessionStatus === "waiting_for_ai_capacity") {
      return {
        repaired: false,
        resumeExecution: false,
        actions: ["Session waiting for AI retry — queue will resume automatically"],
        state,
      };
    }

    await haltSessionExecution(sessionId, "Session is not active");
    return {
      repaired: true,
      resumeExecution: false,
      actions: ["Halted orchestration and dismissed pending approvals for closed session"],
      state: await getSessionState(sessionId),
    };
  }

  const { data: latestHandoff } = await supabase
    .from("session_handoffs")
    .select("to_step_key, assigned_to_agent_id, from_step_key")
    .eq("workflow_run_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let targetStepKey = primaryStep?.step_key ?? null;
  let targetAgentId = (primaryStep?.assigned_agent_id as string | null) ?? null;

  if (latestHandoff?.to_step_key && latestHandoff.assigned_to_agent_id) {
    const handoffStep = stepRows.find((s) => s.step_key === latestHandoff.to_step_key);
    if (handoffStep?.status === "in_progress") {
      targetStepKey = latestHandoff.to_step_key as string;
      targetAgentId = latestHandoff.assigned_to_agent_id as string;
    }
  }

  if (!targetStepKey || !targetAgentId) {
    return { repaired: false, resumeExecution: false, actions: ["No repair needed — no active primary step"], state };
  }

  const mismatched =
    state.currentAgentId !== targetAgentId ||
    state.workflowStage !== targetStepKey;

  if (!mismatched) {
    await syncOrchestrationPointers(sessionId);
    return { repaired: false, resumeExecution: false, actions: ["State already consistent"], state };
  }

  const fromStepKey =
    (latestHandoff?.from_step_key as string | undefined) ??
    getPrimarySdlcChain()
      .slice()
      .reverse()
      .find((s) => {
        const row = stepRows.find((r) => r.step_key === s.key);
        return row?.status === "completed";
      })?.key ??
    "requirements";

  if (stepRows.find((s) => s.step_key === fromStepKey)?.status === "in_progress") {
    await supabase
      .from("workflow_run_steps")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("workflow_run_id", sessionId)
      .eq("step_key", fromStepKey);
    actions.push(`Completed stale in-progress step: ${fromStepKey}`);
  }

  await applyWorkflowTransition({
    sessionId,
    fromStepKey,
    toStepKey: targetStepKey,
    currentAgentId: targetAgentId,
    sessionStatus: "executing",
  });
  actions.push(`Repaired pointers → ${targetStepKey} / ${targetAgentId}`);

  await recordActivityFeed({
    actor: "Session State Engine",
    action: "session_state_reconciled",
    targetType: "workflow",
    targetId: sessionId,
    description: actions.join("; "),
  });

  const updated = await getSessionState(sessionId);
  return { repaired: true, resumeExecution: true, actions, state: updated };
}

export async function completeRequirementsAndRouteToArchitect(input: {
  sessionId: string;
  cooAgentId: string;
  pmAgentId: string;
  artifactId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const agents = await getAgents();
  const architectId = await resolveAgentForPrimaryStep(input.sessionId, "design", agents);
  if (!architectId) {
    return { ok: false, error: "No Solution Architect agent available for design step" };
  }

  const { createSessionHandoff } = await import("./coo-routing");
  await createSessionHandoff({
    workflowRunId: input.sessionId,
    artifactId: input.artifactId ?? null,
    artifactName: "requirements_v1",
    completedByAgentId: input.pmAgentId,
    assignedToAgentId: architectId,
    assignedByAgentId: input.cooAgentId,
    fromStepKey: "requirements",
    toStepKey: "design",
    reason: "Architect — Creates Design",
  });

  await applyWorkflowTransition({
    sessionId: input.sessionId,
    fromStepKey: "requirements",
    toStepKey: "design",
    currentAgentId: architectId,
    completedByAgentId: input.pmAgentId,
    sessionStatus: "executing",
    currentDeliverable: deliverableArtifactName("design"),
    currentArtifact: stepContextArtifactName("design"),
    currentArtifactId: input.artifactId ?? null,
  });

  const { triggerStepExecution } = await import("./step-execution");
  await triggerStepExecution(input.sessionId).catch(() => {});

  return { ok: true };
}

/** Resolve next agent using primary SDLC chain only (never passive orchestrator). */
export async function getNextPrimaryAgentForStep(
  sessionId: string,
  currentStepKey: string,
): Promise<{ stepKey: string; agentId: string; agentName: string | null } | null> {
  const nextStage = getNextPrimaryStage(currentStepKey);
  if (!nextStage) return null;
  const agents = await getAgents();
  const agentId = await resolveAgentForPrimaryStep(sessionId, nextStage.key, agents);
  if (!agentId) return null;
  return {
    stepKey: nextStage.key,
    agentId,
    agentName: agents.find((a) => a.id === agentId)?.name ?? null,
  };
}

export { pickPrimaryInProgressStep };
