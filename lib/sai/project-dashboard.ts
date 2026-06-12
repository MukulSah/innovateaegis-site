import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDecisions } from "./decisions";
import { getProjectObjectives } from "./project-objectives";
import { getProjectMemory } from "./project-memory";
import { getProjectResources } from "./project-resources";
import { getProjectTimeline } from "./project-timeline";
import { getProjectById } from "./projects";
import { getSessionArtifacts } from "./session-artifacts";
import { getSessionStateView } from "./session-state-view";
import { getTasksByProject } from "./tasks";
import { getWorkflowApprovals } from "./governance";
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

  const [objectives, tasks, workflows, timeline, memory, deliverables, approvals, resources] =
    await Promise.all([
      getProjectObjectives(projectId),
      getTasksByProject(projectId),
      getWorkflowRunsByProject(projectId),
      getProjectTimeline(projectId),
      getProjectMemory(projectId),
      getProjectDeliverables(projectId),
      getProjectApprovals(projectId),
      getProjectResources(projectId),
    ]);

  const activeWorkflow =
    workflows.find((w) => w.status === "running") ??
    workflows.find((w) => ["executing", "running", "planning", "waiting_approval"].includes(w.sessionStatus));

  let executive: ProjectDashboard["executive"] = null;
  if (activeWorkflow) {
    const [state, artifacts, wfApprovals, decisions] = await Promise.all([
      getSessionStateView(activeWorkflow.id),
      getSessionArtifacts(activeWorkflow.id),
      getWorkflowApprovals({ workflowId: activeWorkflow.id, status: "pending" }),
      getDecisions({ projectId }),
    ]);

    executive = {
      currentSessionId: activeWorkflow.id,
      currentSessionNumber: state?.sessionNumber ?? activeWorkflow.sessionNumber,
      currentAgentName: state?.currentAgentName ?? null,
      nextAgentName: state?.nextAgentName ?? null,
      currentDeliverable: state?.currentDeliverable ?? null,
      currentArtifact: state?.currentArtifact ?? null,
      executionHealth: state?.executionHealth ?? 0,
      strategicHealth: state?.strategicHealth ?? 0,
      openRisks: wfApprovals.filter((a) => a.priority === "critical").length,
      pendingApprovals: wfApprovals.length,
      executiveSponsorName: state?.executiveSponsorName ?? activeWorkflow.executiveSponsorName ?? null,
      sessionOwnerName: state?.sessionOwnerName ?? activeWorkflow.sessionOwnerName ?? null,
      recentArtifacts: artifacts.slice(0, 6).map((a) => ({
        id: a.id,
        name: a.artifactName ?? a.stepKey,
        stepKey: a.stepKey,
        createdAt: a.createdAt,
      })),
      recentDecisions: decisions.slice(0, 5).map((d) => ({
        id: d.id,
        title: d.title,
        createdAt: d.createdAt,
      })),
      resourcesCount: resources.length,
    };
  }

  const activeTasks = tasks.filter((t) => !["released", "archived"].includes(t.status)).length;
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
    executive,
    metrics: {
      activeTasks,
      blockedTasks,
      pendingApprovals,
      activeWorkflows,
    },
  };
}
