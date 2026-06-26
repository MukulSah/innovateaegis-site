import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { executeAgentWork } from "./agent-executor";
import { resolveDefaultProviderConfig } from "./ai-provider-resolver";
import { sendAgentMessage } from "./agent-conversations";
import { findAgentForRole, getAgents } from "./agents";
import { getProjectGovernance, getWorkflowApprovals, processApprovalDecision } from "./governance";
import { getStepGovernanceApproval } from "./sdlc";
import { routeAfterStepComplete } from "./coo-routing";
import { getWorkflowRunById } from "./workflows";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import { getPrimarySdlcChain, SDLC_WORKFLOW, deliverableArtifactName, stepContextArtifactName } from "./sdlc";
import { finalizeSession, guardRecoveryFromCompletedSession } from "./session-finalization-engine";
import { updateSessionFields } from "./session-manager";
import { updateSessionStatePointers } from "./session-state-view";
import { recordAgentExecutionTrail } from "./agent-execution-trail";
import { resolveStaleEscalations } from "./escalation-resolver";
import {
  getNextPrimaryAgentForStep,
  pickPrimaryInProgressStep,
} from "./session-state-engine";
import type { OrchestrationRun, OrchestrationStatus, WorkflowMode } from "./types";

type OrchestrationRow = {
  id: string;
  workflow_id: string;
  status: OrchestrationStatus;
  current_agent_id: string | null;
  current_step_key: string | null;
  execution_mode: WorkflowMode;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  agents?: { name: string } | null;
};

const select = `*, agents(name)`;

function mapRow(row: OrchestrationRow): OrchestrationRun {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    currentAgentId: row.current_agent_id,
    currentAgentName: row.agents?.name ?? null,
    currentStepKey: row.current_step_key,
    executionMode: row.execution_mode,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function getOrchestrationRun(workflowId: string): Promise<OrchestrationRun | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("orchestration_runs")
    .select(select)
    .eq("workflow_id", workflowId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as OrchestrationRow) : null;
}

export async function startOrchestration(
  workflowId: string,
  projectId: string,
  objective: string,
  projectName: string,
  executionMode: WorkflowMode,
): Promise<OrchestrationRun> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("orchestration_runs")
    .upsert(
      {
        workflow_id: workflowId,
        status: "RUNNING",
        execution_mode: executionMode,
        current_step_key: SDLC_WORKFLOW[0]?.key ?? "requirements",
        started_at: now,
      },
      { onConflict: "workflow_id" },
    )
    .select(select)
    .single();

  if (error) throw new Error(error.message);

  await recordActivityFeed({
    actor: "SAI Orchestrator",
    action: "orchestration_started",
    targetType: "workflow",
    targetId: workflowId,
    description: `Mode: ${executionMode}`,
  });

  await notifyFounder(
    `AI orchestration started`,
    `${objective} — agents beginning autonomous execution`,
    "WORKFLOW",
    { severity: "MEDIUM", entityType: "workflow", entityId: workflowId },
  );

  if (executionMode !== "manual") {
    await advanceOrchestration(workflowId, projectId, objective, projectName);
  }

  return mapRow(data as OrchestrationRow);
}

export async function advanceOrchestration(
  workflowId: string,
  projectId: string,
  objective: string,
  projectName: string,
): Promise<void> {
  const { guardOrchestrationAdvance } = await import("./session-orchestration-v2");
  const guardV2 = await guardOrchestrationAdvance(workflowId);
  if (!guardV2.allowed) {
    console.warn(`[orchestration] advance blocked: ${guardV2.reason}`);
    return;
  }

  const guard = await guardRecoveryFromCompletedSession(workflowId);
  if (!guard.allowRecovery) {
    return;
  }

  try {
    const { runCooAutonomousTick } = await import("./coo-approval-engine");
    await runCooAutonomousTick();
  } catch {
    // COO tick is best-effort before each advance
  }

  const supabase = createSupabaseAdmin();
  const { isSessionExecutable } = await import("./session-state-engine");
  if (!(await isSessionExecutable(workflowId))) {
    const { data: wfRow } = await supabase
      .from("workflow_runs")
      .select("session_status")
      .eq("id", workflowId)
      .maybeSingle();
    const sessionStatus = (wfRow?.session_status as string) ?? "";

    // AI retry queue — keep orchestration alive, do not mark completed.
    if (sessionStatus === "waiting_for_ai_capacity") {
      await supabase
        .from("orchestration_runs")
        .update({ status: "WAITING" })
        .eq("workflow_id", workflowId);
      return;
    }

    await supabase
      .from("orchestration_runs")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("workflow_id", workflowId);
    return;
  }

  const run = await getOrchestrationRun(workflowId);
  if (!run || run.status === "COMPLETED" || run.status === "PAUSED") return;

  const { governanceProfile } = await getProjectGovernance(projectId);
  const agents = await getAgents();

  const { data: steps } = await supabase
    .from("workflow_run_steps")
    .select("*, agents(name)")
    .eq("workflow_run_id", workflowId)
    .order("step_order");

  const stepRows = steps ?? [];
  const passiveKeys = new Set(SDLC_WORKFLOW.filter((s) => s.passiveOnly).map((s) => s.key));
  const primaryKeys = new Set(getPrimarySdlcChain().map((s) => s.key));

  const { getParallelEligibleSteps } = await import("./session-orchestration-v2");
  const parallelKeys = await getParallelEligibleSteps(workflowId);
  const parallelStep =
    parallelKeys.length > 0
      ? stepRows.find(
          (s) =>
            parallelKeys.includes(s.step_key as string) &&
            s.status === "pending" &&
            !passiveKeys.has(s.step_key as string),
        )
      : undefined;

  const primaryInProgress = pickPrimaryInProgressStep(stepRows);
  const currentStep =
    primaryInProgress ??
    stepRows.find((s) => s.status === "in_progress" && !passiveKeys.has(s.step_key as string)) ??
    parallelStep ??
    stepRows.find((s) => s.status === "pending" && primaryKeys.has(s.step_key as string)) ??
    stepRows.find((s) => s.status === "pending" && !passiveKeys.has(s.step_key as string));

  if (!currentStep) {
    await supabase
      .from("orchestration_runs")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("workflow_id", workflowId);
    return;
  }

  const stepKey = currentStep.step_key as string;

  if (stepKey === "design") {
    const { canStartArchitecture } = await import("./requirements-engine");
    const gate = await canStartArchitecture(workflowId, projectId);
    if (!gate.allowed) {
      const { processCooPendingApprovals, clearSessionWaitingApproval } = await import(
        "./coo-approval-engine"
      );
      await processCooPendingApprovals(workflowId);
      await clearSessionWaitingApproval(workflowId);
      const retry = await canStartArchitecture(workflowId, projectId);
      if (!retry.allowed) {
        await supabase
          .from("orchestration_runs")
          .update({ status: "WAITING", current_step_key: "requirements" })
          .eq("workflow_id", workflowId);
        await updateSessionFields(workflowId, { sessionStatus: "waiting_approval" });
        return;
      }
    }
  }

  const sdlcStep = SDLC_WORKFLOW.find((s) => s.key === stepKey);
  const agentId = currentStep.assigned_agent_id as string | null;
  const agent = agentId ? agents.find((a) => a.id === agentId) : findAgentForRole(agents, sdlcStep?.matchRoles ?? []);

  if (!agent) {
    await supabase
      .from("orchestration_runs")
      .update({ status: "FAILED", current_step_key: stepKey })
      .eq("workflow_id", workflowId);
    return;
  }

  const nextPrimary = await getNextPrimaryAgentForStep(workflowId, stepKey);
  const nextAgent = nextPrimary
    ? agents.find((a) => a.id === nextPrimary.agentId) ?? null
    : null;

  await supabase
    .from("orchestration_runs")
    .update({
      current_agent_id: agent.id,
      current_step_key: stepKey,
      status: "RUNNING",
    })
    .eq("workflow_id", workflowId);

  await updateSessionStatePointers({
    sessionId: workflowId,
    currentAgentId: agent.id,
    nextAgentId: nextAgent?.id ?? null,
    workflowStage: stepKey,
    currentStage: sdlcStep?.label ?? stepKey,
    currentDeliverable: deliverableArtifactName(stepKey),
    currentArtifact: stepContextArtifactName(stepKey),
    sessionStatus: "executing",
  });

  const { data: taskRow } = await supabase
    .from("tasks")
    .select("id")
    .eq("workflow_run_id", workflowId)
    .eq("workflow_step_key", stepKey)
    .maybeSingle();

  if (nextAgent) {
    await sendAgentMessage({
      workflowId,
      senderAgentId: null,
      receiverAgentId: agent.id,
      message: `You have been assigned: ${sdlcStep?.taskTitle ?? stepKey}. Objective: ${objective}`,
      messageType: "request",
    });
  }

    try {
    await recordAgentExecutionTrail({
      sessionId: workflowId,
      projectId,
      agentId: agent.id,
      agentName: agent.name,
      stepKey,
      event: "agent_execution_requested",
    });
    await recordAgentExecutionTrail({
      sessionId: workflowId,
      projectId,
      agentId: agent.id,
      agentName: agent.name,
      stepKey,
      event: "agent_execution_started",
    });

    await executeAgentWork(agent.id, {
      workflowId,
      projectId,
      projectName,
      objective,
      stepKey,
      taskId: taskRow?.id ?? null,
      receiverAgentId: nextAgent?.id ?? null,
    });

    await recordAgentExecutionTrail({
      sessionId: workflowId,
      projectId,
      agentId: agent.id,
      agentName: agent.name,
      stepKey,
      event: "agent_execution_completed",
    });

    await supabase
      .from("workflow_run_steps")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", currentStep.id);

    try {
      const { touchSessionActivity } = await import("./session-manager");
      await touchSessionActivity(workflowId);
    } catch {
      // Activity tracking is best-effort
    }

    try {
      const { postAgentSessionMessage } = await import("./executive-session-chat");
      const stepLabel = sdlcStep?.label ?? stepKey;
      await postAgentSessionMessage(
        agent,
        workflowId,
        `${stepLabel} completed.`,
        { projectId, stepKey, artifactName: `${stepKey}_v1` },
      );
    } catch {
      // Session chat is best-effort
    }

    if (stepKey === "knowledge") {
      try {
        await finalizeSession(workflowId);
      } catch (error) {
        console.error("[orchestration] finalizeSession failed:", error);
        await notifyFounder(
          "Session finalization failed",
          error instanceof Error ? error.message : "Unknown finalization error",
          "ESCALATION",
          { severity: "CRITICAL", entityType: "workflow", entityId: workflowId },
        );
      }
    }

    const { data: sessionRow } = await supabase
      .from("workflow_runs")
      .select("session_owner_agent_id")
      .eq("id", workflowId)
      .maybeSingle();
    const cooId = sessionRow?.session_owner_agent_id as string | null;
    if (cooId && stepKey !== "coo_execution" && stepKey !== "ceo_strategy") {
      const { data: artifact } = await supabase
        .from("session_artifacts")
        .select("id, artifact_name")
        .eq("workflow_run_id", workflowId)
        .eq("step_key", stepKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      try {
        await routeAfterStepComplete({
          sessionId: workflowId,
          completedStepKey: stepKey,
          artifactId: artifact?.id ?? null,
          artifactName: artifact?.artifact_name ?? `${stepKey}_v1`,
          completedByAgentId: agent.id,
          cooAgentId: cooId,
        });
      } catch {
        // COO routing is best-effort; orchestration continues
      }
    }

    try {
      const { runCeoSessionMonitor } = await import("./ceo-monitor");
      await runCeoSessionMonitor(workflowId, { event: `step_completed:${stepKey}` });
    } catch {
      // CEO monitoring is best-effort
    }

    await resolveStaleEscalations(workflowId);

    const approvalType = getStepGovernanceApproval(stepKey);
    const pendingApprovals = approvalType
      ? await getWorkflowApprovals({ workflowId, status: "pending" })
      : [];
    const stepApproval = pendingApprovals.find((a) => a.approvalType === approvalType);
    const stepApprovalPending = Boolean(stepApproval);

    if (stepApprovalPending && stepApproval && approvalType) {
      const { cooApproveStepIfEligible } = await import("./coo-approval-engine");
      const canContinue = await cooApproveStepIfEligible(
        workflowId,
        projectId,
        approvalType,
        agents,
      );
      if (!canContinue) {
        await supabase
          .from("orchestration_runs")
          .update({ status: "WAITING", current_agent_id: agent.id })
          .eq("workflow_id", workflowId);
        await updateSessionFields(workflowId, { sessionStatus: "waiting_approval" });
        return;
      }
    }

    if (nextPrimary) {
      const nextStepRow = stepRows.find((s) => s.step_key === nextPrimary.stepKey);
      if (nextStepRow) {
        await supabase
          .from("workflow_run_steps")
          .update({ status: "in_progress", started_at: new Date().toISOString() })
          .eq("id", nextStepRow.id);
      }

      if (run.executionMode === "autonomous" || governanceProfile === "autonomous") {
        await advanceOrchestration(workflowId, projectId, objective, projectName);
      } else {
        await supabase
          .from("orchestration_runs")
          .update({ status: "WAITING", current_agent_id: nextAgent?.id ?? null })
          .eq("workflow_id", workflowId);
      }
    } else {
      await supabase
        .from("orchestration_runs")
        .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
        .eq("workflow_id", workflowId);

      try {
        await finalizeSession(workflowId);
      } catch (error) {
        console.error("[orchestration] finalizeSession failed at chain end:", error);
        await notifyFounder(
          "Session finalization failed",
          error instanceof Error ? error.message : "Unknown finalization error",
          "ESCALATION",
          { severity: "CRITICAL", entityType: "workflow", entityId: workflowId },
        );
      }

      const sessionAfterClose = await getWorkflowRunById(workflowId);
      if (sessionAfterClose?.sessionStatus === "needs_founder_review") {
        await notifyFounder(
          `Session requires founder review: ${objective}`,
          "Completion validation failed — implementation not verified. Review before closing.",
          "ESCALATION",
          { severity: "CRITICAL", entityType: "workflow", entityId: workflowId },
        );
      } else {
        await notifyFounder(
          `Orchestration complete: ${objective}`,
          "All agent steps executed — session closed, project memory updated",
          "WORKFLOW",
          { severity: "MEDIUM", entityType: "workflow", entityId: workflowId },
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    if (message === "SESSION_NOT_EXECUTABLE") {
      await supabase
        .from("orchestration_runs")
        .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
        .eq("workflow_id", workflowId);
      return;
    }
    if (message === "AI_RECOVERY_QUEUED") {
      await supabase
        .from("orchestration_runs")
        .update({ status: "WAITING" })
        .eq("workflow_id", workflowId);
      await notifyFounder(
        "AI Queue Active",
        "Execution delayed due to provider throttling. Waiting for retry queue.",
        "SYSTEM",
        { severity: "MEDIUM", entityType: "workflow", entityId: workflowId },
      );
      return;
    }
    await recordAgentExecutionTrail({
      sessionId: workflowId,
      projectId,
      agentId: agent.id,
      agentName: agent.name,
      stepKey,
      event: "agent_execution_failed",
      detail: message,
    }).catch(() => {});
    await supabase
      .from("workflow_run_steps")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("workflow_run_id", workflowId)
      .eq("step_key", stepKey)
      .neq("status", "completed");
    await supabase
      .from("orchestration_runs")
      .update({ status: "FAILED", current_step_key: stepKey })
      .eq("workflow_id", workflowId);
    await updateSessionFields(workflowId, { sessionStatus: "executing" });
  }
}

export async function pauseOrchestration(workflowId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("orchestration_runs")
    .update({ status: "PAUSED" })
    .eq("workflow_id", workflowId);
}

export async function resumeOrchestration(
  workflowId: string,
  projectId: string,
  objective: string,
  projectName: string,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("orchestration_runs")
    .update({ status: "RUNNING" })
    .eq("workflow_id", workflowId);

  await advanceOrchestration(workflowId, projectId, objective, projectName);
}

export async function getActiveOrchestrations(): Promise<OrchestrationRun[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("orchestration_runs")
    .select(select)
    .in("status", ["PENDING", "RUNNING", "WAITING"])
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as OrchestrationRow[]).map(mapRow);
}

export async function shouldAutoOrchestrate(): Promise<boolean> {
  const provider = await resolveDefaultProviderConfig();
  return Boolean(provider?.apiKey);
}
