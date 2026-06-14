import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgentById, getAgents } from "./agents";
import { recordActivityFeed } from "./activity-feed";
import { sendAgentMessage } from "./agent-conversations";
import { createSessionHandoff } from "./coo-routing";
import { evaluateExecutionReadiness } from "./execution-readiness";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { postExecutiveMessage, postAgentSessionMessage } from "./executive-session-chat";
import {
  appendReleaseTrailStep,
  completeReleaseTrail,
  isReleaseInProgress,
  startReleaseTrail,
} from "./execution-release-trail";
import { notifyAgent } from "./notifications";
import { addProjectMemory } from "./project-memory";
import { createSessionArtifact, getSessionArtifacts } from "./session-artifacts";
import { touchSessionActivity, updateSessionFields } from "./session-manager";
import {
  deliverableArtifactName,
  getInitialExecutionStage,
  getNextDeliveryStage,
  SDLC_WORKFLOW,
} from "./sdlc";
import { recordWorkflowEvent } from "./workflow-events";
import { getWorkflowRunById } from "./workflows";
import type { Agent } from "./types";

export type ExecutionReleaseResult = {
  sessionId: string;
  released: boolean;
  initialAgentId: string | null;
  initialAgentName: string | null;
  nextAgentId: string | null;
  nextAgentName: string | null;
  contextArtifactId: string | null;
  releaseArtifactId: string | null;
  handoffId: string | null;
  deliverable: string;
  failureReason?: string;
};

export class ExecutionReleaseError extends Error {
  constructor(
    message: string,
    public readonly trailId?: string,
  ) {
    super(message);
    this.name = "ExecutionReleaseError";
  }
}

async function logStep(
  trailId: string,
  key: string,
  label: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
    await appendReleaseTrailStep(trailId, { key, label, status: "completed" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await appendReleaseTrailStep(trailId, { key, label, status: "failed", error: msg });
    throw new ExecutionReleaseError(msg, trailId);
  }
}

async function buildPmContextPackage(input: {
  sessionId: string;
  projectId: string;
  projectName: string;
  objective: string;
  pmAgent: Agent;
  strategicBrief: Record<string, unknown>;
}): Promise<{ content: string; artifactId: string }> {
  const { getAgentContext } = await import("./context-engine");
  const bundle = await getAgentContext(input.pmAgent, {
    workflowId: input.sessionId,
    projectId: input.projectId,
    projectName: input.projectName,
    objective: input.objective,
    stepKey: "requirements",
    strategicBrief: input.strategicBrief,
  });

  const header = `# PM Context Package

## Project
${input.projectName}

## Session Objective
${input.objective}

## Package Version
pm_context_v1

---

`;

  const content = header + bundle.markdown;

  const artifact = await createSessionArtifact({
    workflowRunId: input.sessionId,
    projectId: input.projectId,
    agentId: input.pmAgent.id,
    stepKey: "requirements",
    inputSummary: "Execution release context package",
    outputSummary: content.slice(0, 12000),
    artifactName: "pm_context_v1",
    artifactType: "context_package",
  });

  await addProjectMemory({
    projectId: input.projectId,
    memoryType: "requirement",
    title: "PM Context Package (pm_context_v1)",
    summary: `Context package for ${input.pmAgent.name} — ${input.objective.slice(0, 200)}`,
    sourceType: "execution_release",
    sourceId: artifact.id,
  });

  return { content, artifactId: artifact.id };
}

async function resolveStageAgents(
  sessionId: string,
  stageKey: string,
  agents: Agent[],
): Promise<Agent | null> {
  const supabase = createSupabaseAdmin();
  const { data: step } = await supabase
    .from("workflow_run_steps")
    .select("assigned_agent_id")
    .eq("workflow_run_id", sessionId)
    .eq("step_key", stageKey)
    .maybeSingle();

  const assignedId = step?.assigned_agent_id as string | null;
  if (assignedId) {
    return agents.find((a) => a.id === assignedId) ?? (await getAgentById(assignedId));
  }

  const sdlcStep = SDLC_WORKFLOW.find((s) => s.key === stageKey);
  if (!sdlcStep) return null;
  return findAgentForRole(agents, sdlcStep.matchRoles);
}

/** Minutes to suppress stall/escalation noise while release is in flight. */
export const RELEASE_GRACE_MINUTES = 10;

export async function isInExecutionReleaseGrace(sessionId: string): Promise<boolean> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) return false;
  if (session.sessionStatus === "execution_releasing") return true;
  if (session.executionReleasedAt) return false;
  if (await isReleaseInProgress(sessionId)) return true;

  const supabase = createSupabaseAdmin();
  const since = new Date(Date.now() - RELEASE_GRACE_MINUTES * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("execution_release_trails")
    .select("created_at")
    .eq("workflow_run_id", sessionId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function hasExecutionBeenReleased(sessionId: string): Promise<boolean> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) return false;
  if (session.executionReleasedAt) return true;
  const brief = session.strategicBrief?.executionRelease as { releasedAt?: string } | undefined;
  if (brief?.releasedAt) return true;
  const artifacts = await getSessionArtifacts(sessionId);
  return artifacts.some((a) => a.artifactName === "execution_release_v1");
}

async function buildReleaseResultFromSession(sessionId: string): Promise<ExecutionReleaseResult> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) {
    return {
      sessionId,
      released: false,
      initialAgentId: null,
      initialAgentName: null,
      nextAgentId: null,
      nextAgentName: null,
      contextArtifactId: null,
      releaseArtifactId: null,
      handoffId: null,
      deliverable: deliverableArtifactName(getInitialExecutionStage().key),
    };
  }

  const agents = await getAgents();
  const agentName = (id: string | null | undefined) =>
    id ? agents.find((a) => a.id === id)?.name ?? null : null;
  const brief = session.strategicBrief?.executionRelease as Record<string, unknown> | undefined;

  return {
    sessionId,
    released: true,
    initialAgentId: session.currentAgentId ?? (brief?.initialAgentId as string | null) ?? null,
    initialAgentName: agentName(session.currentAgentId),
    nextAgentId: session.nextAgentId ?? (brief?.nextAgentId as string | null) ?? null,
    nextAgentName: agentName(session.nextAgentId),
    contextArtifactId: null,
    releaseArtifactId: null,
    handoffId: null,
    deliverable: session.currentDeliverable ?? deliverableArtifactName(getInitialExecutionStage().key),
  };
}

export async function recordExecutionReleaseFailure(input: {
  sessionId: string;
  projectId: string;
  cooAgentId: string;
  reason: string;
  trailId?: string;
}): Promise<void> {
  await recordExecutiveArtifact({
    workflowRunId: input.sessionId,
    projectId: input.projectId,
    agentId: input.cooAgentId,
    stepKey: "execution_release",
    artifactName: "execution_release_failure_v1",
    content: `# Execution Release Failure\n\n${input.reason}`,
    artifactType: "release_failure",
  });

  const coo = await getAgentById(input.cooAgentId);
  if (coo) {
    await postExecutiveMessage(coo, input.sessionId, `Execution release failed: ${input.reason}`, {
      projectId: input.projectId,
      stepKey: "execution_release",
      artifactName: "execution_release_failure_v1",
    });
  }

  if (input.trailId) {
    await completeReleaseTrail(input.trailId, "failed", input.reason);
  }
}

/**
 * Bridge from COO readiness (READY) to active agent execution.
 */
export async function releaseExecution(input: {
  sessionId: string;
  projectId: string;
  cooAgentId: string;
  force?: boolean;
}): Promise<ExecutionReleaseResult> {
  const session = await getWorkflowRunById(input.sessionId);
  if (!session) throw new ExecutionReleaseError("Session not found");

  if (!input.force) {
    if (await hasExecutionBeenReleased(input.sessionId)) {
      return buildReleaseResultFromSession(input.sessionId);
    }
    if (await isReleaseInProgress(input.sessionId)) {
      return buildReleaseResultFromSession(input.sessionId);
    }
  }

  const trailId = await startReleaseTrail(input.sessionId);
  const agents = await getAgents();
  const coo = agents.find((a) => a.id === input.cooAgentId);
  if (!coo) throw new ExecutionReleaseError("COO agent not found", trailId);

  const supabase = createSupabaseAdmin();
  await supabase
    .from("workflow_runs")
    .update({ session_status: "execution_releasing" })
    .eq("id", input.sessionId);

  let readiness = await evaluateExecutionReadiness(input.projectId, input.sessionId);
  await logStep(trailId, "validate_ready", "Validate READY Status", async () => {
    if (!readiness.ready) {
      throw new Error(`Execution not READY: ${readiness.gaps.join(", ")}`);
    }
  });

  const initialStage = getInitialExecutionStage();
  const nextStage = getNextDeliveryStage(initialStage.key);
  const deliverable = deliverableArtifactName(initialStage.key);

  let initialAgent: Agent | null = null;
  let resolvedNextAgentId: string | null = null;
  let resolvedNextAgentName: string | null = null;

  await logStep(trailId, "resolve_workflow", "Workflow Resolved", async () => {
    readiness = await evaluateExecutionReadiness(input.projectId, input.sessionId);
  });

  await logStep(trailId, "resolve_initial_agent", "Initial Agent Resolved", async () => {
    initialAgent = await resolveStageAgents(input.sessionId, initialStage.key, agents);
    if (!initialAgent) {
      throw new Error(`No agent available for stage ${initialStage.key}`);
    }
    if (nextStage) {
      const next = await resolveStageAgents(input.sessionId, nextStage.key, agents);
      resolvedNextAgentId = next?.id ?? null;
      resolvedNextAgentName = next?.name ?? null;
    }
  });

  const pmAgent = initialAgent!;
  let contextArtifactId: string | null = null;
  let releaseArtifactId: string | null = null;
  let handoffId: string | null = null;

  await logStep(trailId, "context_package", "Context Package Generated", async () => {
    const pkg = await buildPmContextPackage({
      sessionId: input.sessionId,
      projectId: input.projectId,
      projectName: session.projectName ?? "Project",
      objective: session.objective,
      pmAgent,
      strategicBrief: session.strategicBrief,
    });
    contextArtifactId = pkg.artifactId;
  });

  await logStep(trailId, "release_artifact", "Execution Release Artifact Created", async () => {
    const brief = session.strategicBrief as Record<string, unknown>;
    const workflowName = String(
      (brief.cooPlan as Record<string, unknown> | undefined)?.workflow ?? readiness.workflowName,
    );
    const content = `# Execution Release

## Project
${session.projectName}

## Session
#${session.sessionNumber ?? "—"}

## Workflow
${workflowName}

## Execution Status
Released

## Initial Agent
${pmAgent.name}

## Deliverable
${deliverable}

## Assigned By
${coo.name}

## Release Timestamp
${new Date().toISOString()}
`;

    releaseArtifactId = await recordExecutiveArtifact({
      workflowRunId: input.sessionId,
      projectId: input.projectId,
      agentId: coo.id,
      stepKey: "execution_release",
      artifactName: "execution_release_v1",
      content,
      artifactType: "execution_release",
    });
  });

  await logStep(trailId, "handoff", "Handoff Created", async () => {
    const handoff = await createSessionHandoff({
      workflowRunId: input.sessionId,
      artifactId: contextArtifactId,
      artifactName: "pm_context_v1",
      completedByAgentId: coo.id,
      assignedToAgentId: pmAgent.id,
      assignedByAgentId: coo.id,
      fromStepKey: "execution_readiness",
      toStepKey: initialStage.key,
      reason: "Requirements definition required",
    });
    handoffId = handoff.id;

    const supabase = createSupabaseAdmin();
    await supabase
      .from("workflow_run_steps")
      .update({ status: "in_progress", started_at: new Date().toISOString(), assigned_agent_id: pmAgent.id })
      .eq("workflow_run_id", input.sessionId)
      .eq("step_key", initialStage.key);

    await supabase
      .from("tasks")
      .update({ assigned_agent_id: pmAgent.id, status: "assigned" })
      .eq("workflow_run_id", input.sessionId)
      .eq("workflow_step_key", initialStage.key);
  });

  await logStep(trailId, "inbox", "Inbox Updated", async () => {
    await notifyAgent(
      pmAgent.id,
      `Assigned: ${session.projectName} Session #${session.sessionNumber ?? "—"}`,
      `Artifact: pm_context_v1 · Deliverable: ${deliverable} · Assigned by ${coo.name}`,
      "WORKFLOW",
      { severity: "HIGH", entityType: "workflow", entityId: input.sessionId },
    );
    await sendAgentMessage({
      workflowId: input.sessionId,
      senderAgentId: coo.id,
      receiverAgentId: pmAgent.id,
      message: `Waiting for you: ${session.projectName} — ${deliverable}. Context: pm_context_v1`,
      messageType: "handoff",
    });
  });

  await logStep(trailId, "session_update", "Session Updated", async () => {
    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();
    await supabase
      .from("workflow_runs")
      .update({
        session_status: "executing",
        current_stage: initialStage.label,
        current_agent_id: pmAgent.id,
        next_agent_id: resolvedNextAgentId,
        current_artifact: "pm_context_v1",
        current_deliverable: deliverable,
        workflow_stage: initialStage.key,
        execution_released_at: now,
        current_step_index: SDLC_WORKFLOW.findIndex((s) => s.key === initialStage.key),
      })
      .eq("id", input.sessionId);

    await updateSessionFields(input.sessionId, {
      sessionStatus: "executing",
      currentStage: initialStage.label,
      strategicBrief: {
        ...session.strategicBrief,
        executionRelease: {
          releasedAt: now,
          initialAgentId: pmAgent.id,
          nextAgentId: resolvedNextAgentId,
          contextArtifact: "pm_context_v1",
          deliverable,
          workflowName: readiness.workflowName,
        },
      },
    });

    await supabase.from("orchestration_runs").upsert(
      {
        workflow_id: input.sessionId,
        status: "RUNNING",
        current_agent_id: pmAgent.id,
        current_step_key: initialStage.key,
        started_at: now,
      },
      { onConflict: "workflow_id" },
    );
  });

  await logStep(trailId, "execution_started", "Execution Started", async () => {
    await postExecutiveMessage(coo, input.sessionId, "Execution readiness passed.", {
      projectId: input.projectId,
      stepKey: "execution_release",
      artifactName: "execution_release_v1",
    });
    await postExecutiveMessage(coo, input.sessionId, "Execution released.", {
      projectId: input.projectId,
      stepKey: "execution_release",
      artifactName: "execution_release_v1",
    });
    await postExecutiveMessage(coo, input.sessionId, `Assigned ${pmAgent.name}.`, {
      projectId: input.projectId,
      stepKey: initialStage.key,
      artifactName: "pm_context_v1",
    });
    await postAgentSessionMessage(pmAgent, input.sessionId, "Context package received.", {
      projectId: input.projectId,
      stepKey: initialStage.key,
      artifactName: "pm_context_v1",
    });
    await postAgentSessionMessage(pmAgent, input.sessionId, "Requirements analysis started.", {
      projectId: input.projectId,
      stepKey: initialStage.key,
      artifactName: deliverable,
    });

    await recordWorkflowEvent({
      workflowId: input.sessionId,
      eventType: "execution_released",
      actor: coo.name,
      title: "Execution Released",
      description: `${pmAgent.name} assigned · ${deliverable}`,
    });
    await recordWorkflowEvent({
      workflowId: input.sessionId,
      eventType: "agent_assigned",
      actor: coo.name,
      title: `${pmAgent.name} Assigned`,
      description: `Context: pm_context_v1`,
    });
    await recordWorkflowEvent({
      workflowId: input.sessionId,
      eventType: "context_generated",
      actor: "Documentation Pipeline",
      title: "Context Package Generated",
      description: "pm_context_v1",
    });
    await recordWorkflowEvent({
      workflowId: input.sessionId,
      eventType: "work_started",
      actor: pmAgent.name,
      title: "Requirements Work Started",
      description: deliverable,
    });

    await recordActivityFeed({
      actor: coo.name,
      action: "execution_released",
      targetType: "workflow",
      targetId: input.sessionId,
      description: `${pmAgent.name} → ${deliverable}`,
    });

    await touchSessionActivity(input.sessionId);
  });

  await completeReleaseTrail(trailId, "completed");

  return {
    sessionId: input.sessionId,
    released: true,
    initialAgentId: pmAgent.id,
    initialAgentName: pmAgent.name,
    nextAgentId: resolvedNextAgentId,
    nextAgentName: resolvedNextAgentName,
    contextArtifactId,
    releaseArtifactId,
    handoffId,
    deliverable,
  };
}

/** READY sessions must not remain idle without an active agent. */
export async function validateAndRepairIdleReadySession(sessionId: string): Promise<void> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) return;

  const brief = session.strategicBrief as Record<string, unknown>;
  const readiness = brief.executionReadiness as { ready?: boolean; status?: string } | undefined;
  const isReady = readiness?.ready === true || readiness?.status === "READY";
  if (!isReady) return;

  if (await hasExecutionBeenReleased(sessionId)) return;
  if (await isReleaseInProgress(sessionId)) return;

  const supabase = createSupabaseAdmin();
  const { data: wf } = await supabase
    .from("workflow_runs")
    .select("current_agent_id, session_owner_agent_id, execution_released_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (wf?.current_agent_id || wf?.execution_released_at) return;

  const cooId = wf?.session_owner_agent_id as string | null;
  if (!cooId) return;

  try {
    await releaseExecution({
      sessionId,
      projectId: session.projectId,
      cooAgentId: cooId,
    });
  } catch (error) {
    await recordExecutionReleaseFailure({
      sessionId,
      projectId: session.projectId,
      cooAgentId: cooId,
      reason: error instanceof Error ? error.message : "Release failed",
    });
  }
}
