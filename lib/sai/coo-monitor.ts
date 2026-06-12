import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgents } from "./agents";
import { getSessionHandoffs } from "./coo-routing";
import { computeSessionHealth } from "./execution-health";
import { getWorkflowApprovals } from "./governance";
import { getSessionStateView } from "./session-state-view";
import { SDLC_WORKFLOW } from "./sdlc";
import { getWorkflowRunById } from "./workflows";
import type { SessionHandoff } from "./types";

export type CooMonitorSnapshot = {
  sessionId: string;
  sessionNumber: number | null;
  projectName: string;
  objective: string;
  status: string;
  currentAgentName: string | null;
  nextAgentName: string | null;
  currentArtifact: string | null;
  currentDeliverable: string | null;
  currentStage: string | null;
  executionHealth: Awaited<ReturnType<typeof computeSessionHealth>>;
  pendingApprovals: number;
  blockedTasks: number;
  agentWorkload: { agentName: string; taskCount: number }[];
  dependencies: string[];
  recentHandoffs: SessionHandoff[];
  progress: number;
};

export async function getCooMonitorSnapshot(sessionId: string): Promise<CooMonitorSnapshot | null> {
  const workflow = await getWorkflowRunById(sessionId);
  if (!workflow) return null;

  const supabase = createSupabaseAdmin();
  const agents = await getAgents();

  const [stepsRes, tasksRes, artifactsRes, approvals, handoffs, health, sessionState] = await Promise.all([
    supabase
      .from("workflow_run_steps")
      .select("step_key, status, assigned_agent_id, step_label")
      .eq("workflow_run_id", sessionId)
      .order("step_order"),
    supabase
      .from("tasks")
      .select("assigned_agent_id, status")
      .eq("workflow_run_id", sessionId),
    supabase
      .from("session_artifacts")
      .select("artifact_name, step_key")
      .eq("workflow_run_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
    getSessionHandoffs(sessionId),
    computeSessionHealth(sessionId),
    getSessionStateView(sessionId),
  ]);

  const steps = stepsRes.data ?? [];
  const current = steps.find((s) => s.status === "in_progress")
    ?? steps.find((s) => s.status === "pending");

  const agentName = (id: string | null) =>
    id ? agents.find((a) => a.id === id)?.name ?? null : null;

  const tasks = tasksRes.data ?? [];
  const workloadMap = new Map<string, number>();
  for (const t of tasks) {
    if (!t.assigned_agent_id || ["released", "archived"].includes(t.status)) continue;
    const name = agentName(t.assigned_agent_id as string) ?? "Agent";
    workloadMap.set(name, (workloadMap.get(name) ?? 0) + 1);
  }

  const blockedTasks = tasks.filter(
    (t) => t.status === "planning" || t.status === "blocked",
  ).length;

  const completed = steps.filter((s) => s.status === "completed").length;
  const currentStepKey = current?.step_key as string | undefined;
  const sdlcStep = currentStepKey
    ? SDLC_WORKFLOW.find((s) => s.key === currentStepKey)
    : null;

  return {
    sessionId,
    sessionNumber: workflow.sessionNumber,
    projectName: workflow.projectName ?? "Project",
    objective: workflow.objective,
    status: workflow.sessionStatus,
    currentAgentName: sessionState?.currentAgentName ?? null,
    nextAgentName: sessionState?.nextAgentName ?? null,
    currentArtifact: sessionState?.currentArtifact ?? null,
    currentDeliverable: sessionState?.currentDeliverable ?? null,
    currentStage: sessionState?.currentStage ?? sdlcStep?.label ?? null,
    executionHealth: health,
    pendingApprovals: approvals.length,
    blockedTasks,
    agentWorkload: [...workloadMap.entries()].map(([agentName, taskCount]) => ({
      agentName,
      taskCount,
    })),
    dependencies: sdlcStep?.taskDescription ? [sdlcStep.taskDescription.slice(0, 80)] : [],
    recentHandoffs: handoffs.slice(0, 5),
    progress: steps.length ? Math.round((completed / steps.length) * 100) : 0,
  };
}

export async function runCooSessionMonitor(sessionId: string): Promise<CooMonitorSnapshot | null> {
  const snapshot = await getCooMonitorSnapshot(sessionId);
  try {
    const { detectAndMarkStalled } = await import("./session-recovery");
    const { validateAndRepairIdleReadySession } = await import("./execution-release");
    await detectAndMarkStalled(sessionId);
    await validateAndRepairIdleReadySession(sessionId);
  } catch {
    // Monitoring is best-effort
  }
  return snapshot;
}
