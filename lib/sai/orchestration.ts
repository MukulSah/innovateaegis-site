import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { executeAgentWork } from "./agent-executor";
import { getDefaultAIProvider } from "./ai-providers";
import { sendAgentMessage } from "./agent-conversations";
import { findAgentForRole, getAgents } from "./agents";
import { getProjectGovernance, getWorkflowApprovals, processApprovalDecision } from "./governance";
import { getStepGovernanceApproval } from "./sdlc";
import { routeAfterStepComplete } from "./coo-routing";
import { closeSession, updateSessionFields } from "./session-manager";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import { getPrimarySdlcChain, SDLC_WORKFLOW } from "./sdlc";
import { updateSessionStatePointers } from "./session-state-view";
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
  const supabase = createSupabaseAdmin();
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

  const currentStep =
    stepRows.find((s) => s.status === "in_progress" && primaryKeys.has(s.step_key as string)) ??
    stepRows.find((s) => s.status === "in_progress" && !passiveKeys.has(s.step_key as string)) ??
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
      await supabase
        .from("orchestration_runs")
        .update({ status: "WAITING", current_step_key: "requirements" })
        .eq("workflow_id", workflowId);
      await updateSessionFields(workflowId, { sessionStatus: "waiting_approval" });
      return;
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

  const nextStepIndex = stepRows.findIndex((s) => s.step_key === stepKey) + 1;
  const nextStep = stepRows[nextStepIndex];
  const nextAgent = nextStep
    ? agents.find((a) => a.id === nextStep.assigned_agent_id)
      ?? findAgentForRole(agents, SDLC_WORKFLOW.find((s) => s.key === nextStep.step_key)?.matchRoles ?? [])
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
    await executeAgentWork(agent.id, {
      workflowId,
      projectId,
      projectName,
      objective,
      stepKey,
      taskId: taskRow?.id ?? null,
      receiverAgentId: nextAgent?.id ?? null,
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

    const approvalType = getStepGovernanceApproval(stepKey);
    const pendingApprovals = approvalType
      ? await getWorkflowApprovals({ workflowId, status: "pending" })
      : [];
    const stepApproval = pendingApprovals.find((a) => a.approvalType === approvalType);
    const stepApprovalPending = Boolean(stepApproval);

    if (stepApprovalPending && stepApproval) {
      if (approvalType === "task_plan") {
        const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
        if (coo) {
          await processApprovalDecision(stepApproval.id, "approved", coo.name, "COO approved task plan");
        }
      } else if (approvalType === "execution_readiness") {
        const orchestrator = findAgentForRole(agents, ["Work Routing", "Orchestrator"]);
        if (orchestrator) {
          await processApprovalDecision(
            stepApproval.id,
            "approved",
            orchestrator.name,
            "Coordination escalation resolved",
          );
        }
      } else if (approvalType === "requirements") {
        await supabase
          .from("orchestration_runs")
          .update({ status: "WAITING", current_agent_id: agent.id })
          .eq("workflow_id", workflowId);
        await updateSessionFields(workflowId, { sessionStatus: "waiting_approval" });
        return;
      } else {
        await supabase
          .from("orchestration_runs")
          .update({ status: "WAITING", current_agent_id: agent.id })
          .eq("workflow_id", workflowId);
        await updateSessionFields(workflowId, { sessionStatus: "waiting_approval" });
        return;
      }
    }

    if (nextStep) {
      await supabase
        .from("workflow_run_steps")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", nextStep.id);

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

      await closeSession(workflowId, projectId);

      await notifyFounder(
        `Orchestration complete: ${objective}`,
        "All agent steps executed — session closed, project memory updated",
        "WORKFLOW",
        { severity: "MEDIUM", entityType: "workflow", entityId: workflowId },
      );
    }
  } catch {
    await supabase
      .from("orchestration_runs")
      .update({ status: "FAILED" })
      .eq("workflow_id", workflowId);
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
  const provider = await getDefaultAIProvider();
  return Boolean(provider?.apiKey);
}
