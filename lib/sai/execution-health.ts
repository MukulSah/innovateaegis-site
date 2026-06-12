import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getWorkflowApprovals } from "./governance";
import { getPrimarySdlcChain } from "./sdlc";

export type ExecutionHealthSnapshot = {
  score: number;
  blockedSessions: number;
  failedTurns: number;
  pendingApprovals: number;
  completedSteps: number;
  totalSteps: number;
  workflowProgress: number;
  agentActivity: number;
  deliverablesProduced: number;
  taskCompletion: number;
};

/** Execution Health V2 — reflects active work, not only completed steps. */
export async function computeSessionHealth(sessionId: string): Promise<ExecutionHealthSnapshot> {
  const supabase = createSupabaseAdmin();
  const primaryKeys = new Set(getPrimarySdlcChain().map((s) => s.key));

  const [stepsRes, runtimeRes, approvals, sessionRes, tasksRes, artifactsRes] = await Promise.all([
    supabase
      .from("workflow_run_steps")
      .select("step_key, status")
      .eq("workflow_run_id", sessionId),
    supabase.from("agent_runtime_sessions").select("status").eq("workflow_id", sessionId),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
    supabase
      .from("workflow_runs")
      .select("session_status, current_agent_id, execution_released_at, current_deliverable")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase.from("tasks").select("status").eq("workflow_run_id", sessionId),
    supabase
      .from("session_artifacts")
      .select("artifact_name, artifact_type")
      .eq("workflow_run_id", sessionId),
  ]);

  const steps = stepsRes.data ?? [];
  const primarySteps = steps.filter((s) => primaryKeys.has(s.step_key as string));
  const completedPrimary = primarySteps.filter((s) => s.status === "completed").length;
  const totalPrimary = primarySteps.length || 1;
  const workflowProgress = completedPrimary / totalPrimary;

  const tasks = tasksRes.data ?? [];
  const completedTasks = tasks.filter((t) =>
    ["released", "archived", "testing", "approval"].includes(t.status as string),
  ).length;
  const taskCompletion = tasks.length ? completedTasks / tasks.length : workflowProgress;

  const session = sessionRes.data;
  const hasAgent = Boolean(session?.current_agent_id);
  const isExecuting = ["executing", "running"].includes(session?.session_status ?? "");
  const agentActivity = hasAgent ? (isExecuting ? 1 : 0.85) : session?.execution_released_at ? 0.65 : 0.4;

  const artifacts = artifactsRes.data ?? [];
  const deliverableNames = new Set(
    artifacts
      .filter((a) => (a.artifact_type as string) !== "context_package")
      .map((a) => a.artifact_name as string),
  );
  const targetDeliverable = session?.current_deliverable as string | null;
  const deliverablesProduced = targetDeliverable
    ? deliverableNames.has(targetDeliverable)
      ? 1
      : hasAgent
        ? 0.7
        : 0.5
    : deliverableNames.size > 0
      ? 0.8
      : 0.45;

  const failedTurns = (runtimeRes.data ?? []).filter((r) => r.status === "FAILED").length;
  const pendingApprovals = approvals.length;
  const isBlocked = session?.session_status === "blocked";

  const blockedFactor = isBlocked ? 0.5 : 1;
  const failureFactor = Math.max(0.4, 1 - failedTurns * 0.15);
  const approvalFactor = Math.max(0.7, 1 - Math.min(pendingApprovals * 0.05, 0.2));

  let score = Math.round(
    (workflowProgress * 0.2 +
      agentActivity * 0.25 +
      deliverablesProduced * 0.2 +
      taskCompletion * 0.15 +
      blockedFactor * 0.1 +
      failureFactor * 0.05 +
      approvalFactor * 0.05) *
      100,
  );

  if (session?.execution_released_at && hasAgent) {
    score = Math.max(score, 50);
  }
  if (hasAgent && primarySteps.some((s) => s.status === "in_progress")) {
    score = Math.max(score, 55);
  }
  if (deliverableNames.has("requirements_v1")) {
    score = Math.max(score, 60);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    blockedSessions: isBlocked ? 1 : 0,
    failedTurns,
    pendingApprovals,
    completedSteps: completedPrimary,
    totalSteps: totalPrimary,
    workflowProgress,
    agentActivity,
    deliverablesProduced,
    taskCompletion,
  };
}

export async function computeCooHealthSummary(sessionIds: string[]): Promise<ExecutionHealthSnapshot> {
  if (sessionIds.length === 0) {
    return {
      score: 100,
      blockedSessions: 0,
      failedTurns: 0,
      pendingApprovals: 0,
      completedSteps: 0,
      totalSteps: 0,
      workflowProgress: 1,
      agentActivity: 1,
      deliverablesProduced: 1,
      taskCompletion: 1,
    };
  }

  const snapshots = await Promise.all(sessionIds.map((id) => computeSessionHealth(id)));
  const avg = (key: keyof ExecutionHealthSnapshot) =>
    snapshots.reduce((s, x) => s + (x[key] as number), 0) / snapshots.length;

  return {
    score: Math.round(avg("score")),
    blockedSessions: snapshots.reduce((s, x) => s + x.blockedSessions, 0),
    failedTurns: snapshots.reduce((s, x) => s + x.failedTurns, 0),
    pendingApprovals: snapshots.reduce((s, x) => s + x.pendingApprovals, 0),
    completedSteps: snapshots.reduce((s, x) => s + x.completedSteps, 0),
    totalSteps: snapshots.reduce((s, x) => s + x.totalSteps, 0),
    workflowProgress: avg("workflowProgress"),
    agentActivity: avg("agentActivity"),
    deliverablesProduced: avg("deliverablesProduced"),
    taskCompletion: avg("taskCompletion"),
  };
}
