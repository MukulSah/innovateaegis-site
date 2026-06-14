import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDeliverables } from "./deliverables";
import { getWorkflowApprovals } from "./governance";
import { getReleases } from "./releases";
import { getReviews } from "./reviews";
import { getTasks } from "./tasks";
import { getBlockedTaskDetails } from "./blocked-task-intelligence";
import type { ExecutionBoardData } from "./types";

export async function getExecutionBoard(): Promise<ExecutionBoardData> {
  const empty: ExecutionBoardData = {
    activeWorkflows: 0,
    activeTasks: 0,
    blockedTasks: 0,
    reviewsPending: 0,
    approvalsPending: 0,
    deliverablesPending: 0,
    escalations: 0,
    releasesReady: 0,
    workflows: [],
    blockedTaskList: [],
    blockedTaskDetails: [],
    pendingReviews: [],
    pendingApprovals: [],
    pendingDeliverables: [],
    readyReleases: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createSupabaseAdmin();

  const [tasks, approvals, reviews, deliverables, releases, workflowRows] = await Promise.all([
    getTasks(),
    getWorkflowApprovals({ status: "pending" }),
    getReviews({ status: "PENDING" }),
    getDeliverables(),
    getReleases(),
    supabase
      .from("workflow_runs")
      .select("id, name, objective, status, projects(name)")
      .eq("status", "running")
      .order("created_at", { ascending: false }),
  ]);

  const activeTasks = tasks.filter((t) =>
    ["assigned", "in_progress", "code_review", "testing", "approval"].includes(t.status),
  );
  const blockedTasks = tasks.filter((t) => t.status === "planning" || t.approvalStatus === "rejected");
  const pendingDeliverables = deliverables.filter((d) =>
    ["DRAFT", "IN_REVIEW"].includes(d.status),
  );
  const readyReleases = releases.filter((r) => r.status === "ready");
  const escalatedApprovals = await getWorkflowApprovals({ status: "escalated" });

  const workflows = (workflowRows.data ?? []).map((w) => ({
    id: w.id as string,
    name: w.name as string,
    objective: w.objective as string,
    projectName: (w.projects as unknown as { name: string } | null)?.name ?? null,
  }));

  const blockedTaskDetails = await getBlockedTaskDetails();

  return {
    activeWorkflows: workflows.length,
    activeTasks: activeTasks.length,
    blockedTasks: blockedTasks.length,
    reviewsPending: reviews.length,
    approvalsPending: approvals.length,
    deliverablesPending: pendingDeliverables.length,
    escalations: escalatedApprovals.length,
    releasesReady: readyReleases.length,
    workflows,
    blockedTaskList: blockedTasks.slice(0, 10),
    blockedTaskDetails: blockedTaskDetails.slice(0, 10),
    pendingReviews: reviews.slice(0, 10),
    pendingApprovals: approvals.slice(0, 10),
    pendingDeliverables: pendingDeliverables.slice(0, 10),
    readyReleases: readyReleases.slice(0, 10),
  };
}
