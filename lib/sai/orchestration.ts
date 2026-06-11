import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { executeAgentWork } from "./agent-executor";
import { getDefaultAIProvider } from "./ai-providers";
import { sendAgentMessage } from "./agent-conversations";
import { findAgentForRole, getAgents } from "./agents";
import { getProjectGovernance } from "./governance";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import { SDLC_WORKFLOW } from "./sdlc";
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
  const currentStep = stepRows.find((s) => s.status === "in_progress")
    ?? stepRows.find((s) => s.status === "pending");

  if (!currentStep) {
    await supabase
      .from("orchestration_runs")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("workflow_id", workflowId);
    return;
  }

  const stepKey = currentStep.step_key as string;
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

      await notifyFounder(
        `Orchestration complete: ${objective}`,
        "All agent steps executed",
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
