import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getProjectObjectives } from "./project-objectives";
import { getProjectMemory } from "./project-memory";
import { getProjectTimeline } from "./project-timeline";
import { getProjectById } from "./projects";
import { getTasksByProject } from "./tasks";
import { getWorkflowRunsByProject } from "./workflows";
import type { ProjectApproval, ProjectDashboard, ProjectDeliverable } from "./types";

async function getProjectDeliverables(projectId: string): Promise<ProjectDeliverable[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_deliverables")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    workflowRunId: row.workflow_run_id as string | null,
    workflowStepKey: row.workflow_step_key as string | null,
    deliverableType: row.deliverable_type as string,
    title: row.title as string,
    content: row.content as string,
    createdAt: row.created_at as string,
  }));
}

async function getProjectApprovals(projectId: string): Promise<ProjectApproval[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_approvals")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    taskId: row.task_id as string | null,
    workflowRunId: row.workflow_run_id as string | null,
    approvalType: row.approval_type as ProjectApproval["approvalType"],
    status: row.status as ProjectApproval["status"],
    approverName: row.approver_name as string,
    notes: row.notes as string,
    createdAt: row.created_at as string,
    decidedAt: row.decided_at as string | null,
  }));
}

export async function getProjectDashboard(projectId: string): Promise<ProjectDashboard | null> {
  if (!isSupabaseConfigured()) return null;

  const project = await getProjectById(projectId);
  if (!project) return null;

  const [objectives, tasks, workflows, timeline, memory, deliverables, approvals] =
    await Promise.all([
      getProjectObjectives(projectId),
      getTasksByProject(projectId),
      getWorkflowRunsByProject(projectId),
      getProjectTimeline(projectId),
      getProjectMemory(projectId),
      getProjectDeliverables(projectId),
      getProjectApprovals(projectId),
    ]);

  const activeTasks = tasks.filter((t) =>
    !["released", "archived"].includes(t.status),
  ).length;
  const blockedTasks = tasks.filter(
    (t) => t.approvalStatus === "rejected" || t.status === "backlog",
  ).length;
  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
  const activeWorkflows = workflows.filter((w) => w.status === "running").length;

  return {
    project,
    objectives,
    tasks,
    workflows,
    timeline,
    memory,
    deliverables,
    approvals,
    metrics: {
      activeTasks,
      blockedTasks,
      pendingApprovals,
      activeWorkflows,
    },
  };
}
