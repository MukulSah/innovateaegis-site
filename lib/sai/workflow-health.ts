import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { WorkflowHealth } from "./types";

export async function computeWorkflowHealth(workflowId: string): Promise<WorkflowHealth> {
  if (!isSupabaseConfigured()) {
    return {
      score: 0,
      taskCompletion: 0,
      pendingReviews: 0,
      blockedItems: 0,
      escalations: 0,
      riskLevel: "low",
      timelineProgress: 0,
    };
  }

  const supabase = createSupabaseAdmin();

  const [tasks, approvals, steps, workflow] = await Promise.all([
    supabase.from("tasks").select("status").eq("workflow_run_id", workflowId),
    supabase.from("workflow_approvals").select("status").eq("workflow_id", workflowId),
    supabase.from("workflow_run_steps").select("status").eq("workflow_run_id", workflowId),
    supabase.from("workflow_runs").select("governance_status").eq("id", workflowId).maybeSingle(),
  ]);

  const taskRows = tasks.data ?? [];
  const approvalRows = approvals.data ?? [];
  const stepRows = steps.data ?? [];

  const completedTasks = taskRows.filter((t) =>
    ["released", "archived"].includes(t.status as string),
  ).length;
  const taskCompletion =
    taskRows.length > 0 ? Math.round((completedTasks / taskRows.length) * 100) : 0;

  const completedSteps = stepRows.filter((s) => s.status === "completed").length;
  const timelineProgress =
    stepRows.length > 0 ? Math.round((completedSteps / stepRows.length) * 100) : 0;

  const pendingReviews = approvalRows.filter((a) =>
    ["pending", "escalated"].includes(a.status as string),
  ).length;
  const escalations = approvalRows.filter((a) => a.status === "escalated").length;
  const blockedItems = taskRows.filter((t) => t.status === "backlog").length;

  const governanceStatus = workflow.data?.governance_status as string;
  let riskLevel: WorkflowHealth["riskLevel"] = "low";
  if (escalations > 0 || governanceStatus === "escalated") riskLevel = "critical";
  else if (pendingReviews > 0 || governanceStatus === "waiting_for_approval") riskLevel = "high";
  else if (governanceStatus === "waiting_for_revision") riskLevel = "medium";

  const score = Math.max(
    0,
    Math.round(
      (taskCompletion + timelineProgress) / 2 -
        pendingReviews * 8 -
        escalations * 15 -
        blockedItems * 3,
    ),
  );

  return {
    score,
    taskCompletion,
    pendingReviews,
    blockedItems,
    escalations,
    riskLevel,
    timelineProgress,
  };
}
