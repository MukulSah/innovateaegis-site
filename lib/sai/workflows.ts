import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { syncAgentGroupMembers } from "./agent-groups";
import { addAgentMemory, findAgentForRole, getAgents } from "./agents";
import { countDecisions } from "./decisions";
import { countDocuments, createDocument } from "./documents";
import { getEmployees } from "./employees";
import { createProjectObjective, linkObjectiveWorkflow } from "./project-objectives";
import { addProjectMemory } from "./project-memory";
import { addTimelineEvent } from "./project-timeline";
import { syncProjectTaskCounts } from "./projects";
import { SDLC_WORKFLOW } from "./sdlc";
import { recommendAssignment } from "./task-assignment";
import { assignAgentsToTask } from "./task-assignments";
import { createTask } from "./tasks";
import {
  executeWorkflowBootstrap,
  generateImplementationGuide,
  generateTestPlan,
  computeWorkflowProgress,
  getActiveAgentName,
} from "./workflow-engine";
import { getProjectGovernance } from "./governance";
import { recordActivityFeed } from "./activity-feed";
import { recordCompanyTimeline } from "./company-timeline";
import { notifyFounder } from "./notifications";
import {
  pauseOrchestration,
  resumeOrchestration,
  shouldAutoOrchestrate,
  startOrchestration,
} from "./orchestration";
import { recordWorkflowEvent } from "./workflow-events";
import type {
  ControlPanelStats,
  WorkflowRun,
  WorkflowRunStep,
  WorkflowStatus,
  WorkflowStepStatus,
} from "./types";

type WorkflowRunRow = {
  id: string;
  project_id: string;
  name: string;
  objective: string;
  owner: string;
  status: WorkflowStatus;
  workflow_mode?: string;
  governance_status?: string;
  current_step_index: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  projects?: { name: string } | null;
};

type WorkflowStepRow = {
  id: string;
  workflow_run_id: string;
  step_key: string;
  step_label: string;
  step_order: number;
  assigned_agent_id: string | null;
  status: WorkflowStepStatus;
  output: string;
  started_at: string | null;
  completed_at: string | null;
  agents?: { name: string } | null;
};

function mapStep(row: WorkflowStepRow): WorkflowRunStep {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    stepKey: row.step_key,
    stepLabel: row.step_label,
    stepOrder: row.step_order,
    assignedAgentId: row.assigned_agent_id,
    assignedAgentName: row.agents?.name ?? null,
    status: row.status,
    output: row.output,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

async function loadWorkflowSteps(runId: string): Promise<WorkflowRunStep[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_run_steps")
    .select("*, agents(name)")
    .eq("workflow_run_id", runId)
    .order("step_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as WorkflowStepRow[]).map(mapStep);
}

async function mapRun(row: WorkflowRunRow): Promise<WorkflowRun> {
  const steps = await loadWorkflowSteps(row.id);
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name,
    name: row.name ?? "SDLC Workflow",
    objective: row.objective,
    owner: row.owner ?? "SAI",
    status: row.status,
    workflowMode: row.workflow_mode as WorkflowRun["workflowMode"],
    governanceStatus: row.governance_status as WorkflowRun["governanceStatus"],
    currentStepIndex: row.current_step_index,
    steps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

async function createDeliverable(
  projectId: string,
  workflowRunId: string,
  stepKey: string,
  deliverableType: string,
  title: string,
  content: string,
) {
  const supabase = createSupabaseAdmin();
  await supabase.from("project_deliverables").insert({
    project_id: projectId,
    workflow_run_id: workflowRunId,
    workflow_step_key: stepKey,
    deliverable_type: deliverableType,
    title,
    content,
  });
}

async function createApproval(
  projectId: string,
  workflowRunId: string,
  taskId: string | null,
  approvalType: "architecture" | "qa" | "release" | "documentation" | "general",
) {
  const supabase = createSupabaseAdmin();
  await supabase.from("project_approvals").insert({
    project_id: projectId,
    workflow_run_id: workflowRunId,
    task_id: taskId,
    approval_type: approvalType,
    status: "pending",
    approver_name: "Founder",
  });
}

export async function getWorkflowRuns(): Promise<WorkflowRun[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*, projects(name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return Promise.all((data as WorkflowRunRow[]).map(mapRun));
}

export async function getWorkflowRunsByProject(projectId: string): Promise<WorkflowRun[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*, projects(name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return Promise.all((data as WorkflowRunRow[]).map(mapRun));
}

export async function getWorkflowRunById(id: string): Promise<WorkflowRun | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*, projects(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRun(data as WorkflowRunRow);
}

export { computeWorkflowProgress, getActiveAgentName };

export async function launchWorkflow(
  projectId: string,
  objective: string,
  workflowName = "SDLC Workflow",
  actor?: { userId: string; name: string },
): Promise<WorkflowRun> {
  const supabase = createSupabaseAdmin();
  const [agents, employees, projectRow] = await Promise.all([
    getAgents(),
    getEmployees(),
    supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
  ]);

  await syncAgentGroupMembers(agents);
  const projectName = projectRow.data?.name ?? "Project";

  const actorName = actor?.name ?? "SAI";
  const objectiveRecord = await createProjectObjective(
    projectId,
    objective,
    objective,
    null,
    actor?.userId ?? null,
  );
  const { workflowMode } = await getProjectGovernance(projectId);

  const { data: run, error: runError } = await supabase
    .from("workflow_runs")
    .insert({
      project_id: projectId,
      name: workflowName,
      objective,
      owner: actorName,
      status: "running",
      workflow_mode: workflowMode,
      governance_status: "normal",
      current_step_index: 0,
      created_by: actor?.userId ?? null,
    })
    .select("*, projects(name)")
    .single();

  if (runError) throw new Error(runError.message);

  await linkObjectiveWorkflow(objectiveRecord.id, run.id);

  await addTimelineEvent({
    projectId,
    eventType: "objective_created",
    title: `Objective created: ${objective}`,
    description: "SAI initiated automatic SDLC workflow",
    actorName,
    metadata: { workflowRunId: run.id, objectiveId: objectiveRecord.id },
  });

  await recordCompanyTimeline({
    eventType: "workflow_created",
    entityType: "workflow",
    entityId: run.id,
    projectId,
    workflowId: run.id,
    title: `Workflow created: ${objective}`,
    description: `Mode: ${workflowMode}`,
    actor: actorName,
  });

  await recordActivityFeed({
    actor: actorName,
    action: "workflow_started",
    targetType: "workflow",
    targetId: run.id,
    description: objective,
  });

  await notifyFounder(
    `Workflow started: ${objective}`,
    `${workflowName} launched for ${projectName}`,
    "WORKFLOW",
    { severity: "MEDIUM", entityType: "workflow", entityId: run.id },
  );

  await addProjectMemory({
    projectId,
    memoryType: "requirement",
    title: objective,
    summary: `Objective registered. Workflow ${workflowName} started.`,
    sourceType: "objective",
    sourceId: objectiveRecord.id,
  });

  for (let i = 0; i < SDLC_WORKFLOW.length; i++) {
    const step = SDLC_WORKFLOW[i];
    const roleAgent = findAgentForRole(agents, step.matchRoles);

    const recommendation = recommendAssignment(
      {
        title: step.taskTitle,
        description: step.taskDescription,
        workflowStepKey: step.key,
        projectId,
      },
      agents,
      employees,
    );

    const assignedAgentId = roleAgent?.id ?? recommendation.agentId;
    const assignedEmployeeId = recommendation.employeeId;
    const assignedAgent = agents.find((a) => a.id === assignedAgentId);

    await supabase.from("workflow_run_steps").insert({
      workflow_run_id: run.id,
      step_key: step.key,
      step_label: step.label,
      step_order: i,
      assigned_agent_id: assignedAgentId,
      status: i === 0 ? "in_progress" : "pending",
      started_at: i === 0 ? new Date().toISOString() : null,
    });

    const task = await createTask({
      projectId,
      title: step.taskTitle,
      description: `${step.taskDescription}\n\nObjective: ${objective}`,
      priority: i < 3 ? "high" : "medium",
      dependencies: [],
      acceptanceCriteria: [`Complete ${step.label}`],
      objectiveId: objectiveRecord.id,
      assignedAgentId,
      assignedEmployeeId,
      status: step.taskStatus,
      evidence: "",
      comments: [recommendation.reason],
      approvalStatus:
        step.approvalType || assignedAgent?.approvalRequired ? "pending" : "none",
      workflowRunId: run.id,
      workflowStepKey: step.key,
    });

    await createDeliverable(
      projectId,
      run.id,
      step.key,
      step.deliverableType,
      step.deliverableTitle,
      `Pending: ${step.taskDescription}`,
    );

    if (step.approvalType) {
      await createApproval(projectId, run.id, task.id, step.approvalType);
    }

    await addTimelineEvent({
      projectId,
      eventType: "task_created",
      title: `Task created: ${step.taskTitle}`,
      description: recommendation.reason,
      actorName: assignedAgent?.name ?? "Team Orchestrator Agent",
      metadata: { taskId: task.id, stepKey: step.key },
    });

    await assignAgentsToTask(task.id, step.key, agents);
  }

  const useAI = await shouldAutoOrchestrate();

  if (useAI && workflowMode !== "manual") {
    await startOrchestration(run.id, projectId, objective, projectName, workflowMode);
  } else {
    await executeWorkflowBootstrap({
      workflowId: run.id,
      projectId,
      projectName,
      objective,
      agents,
      objectiveId: objectiveRecord.id,
    });
  }

  await syncProjectTaskCounts(projectId);
  return mapRun(run as WorkflowRunRow);
}

export async function updateWorkflowStatus(
  id: string,
  status: WorkflowStatus,
): Promise<WorkflowRun> {
  const existing = await getWorkflowRunById(id);
  if (!existing) throw new Error("Workflow not found");

  if (status === "paused" && existing.status !== "paused") {
    await pauseOrchestration(id);
  }

  if (status === "running" && existing.status === "paused") {
    await resumeOrchestration(
      id,
      existing.projectId,
      existing.objective,
      existing.projectName ?? "Project",
    );
  }

  const supabase = createSupabaseAdmin();
  const updates: Record<string, unknown> = { status };
  if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("workflow_runs")
    .update(updates)
    .eq("id", id)
    .select("*, projects(name)")
    .single();

  if (error) throw new Error(error.message);

  if (status === "paused" || (status === "running" && existing.status === "paused")) {
    await recordWorkflowEvent({
      workflowId: id,
      eventType: status === "paused" ? "workflow_paused" : "workflow_resumed",
      title: status === "paused" ? "Workflow paused" : "Workflow resumed",
      actor: "Owner",
      description: existing.objective,
    });
  }

  return mapRun(data as WorkflowRunRow);
}

export async function deleteWorkflowRun(id: string): Promise<void> {
  const existing = await getWorkflowRunById(id);
  if (!existing) throw new Error("Workflow not found");

  const supabase = createSupabaseAdmin();

  const { error } = await supabase.from("workflow_runs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await syncProjectTaskCounts(existing.projectId);

  await recordActivityFeed({
    actor: "Owner",
    action: "workflow_deleted",
    targetType: "workflow",
    targetId: id,
    description: `Deleted workflow: ${existing.objective}`,
  });
}

export async function advanceWorkflowStep(
  workflowId: string,
  stepId: string,
  output: string,
): Promise<WorkflowRun> {
  const supabase = createSupabaseAdmin();
  const run = await getWorkflowRunById(workflowId);
  if (!run) throw new Error("Workflow not found");

  const now = new Date().toISOString();
  const currentStep = run.steps.find((s) => s.id === stepId);

  await supabase
    .from("workflow_run_steps")
    .update({ status: "completed", output, completed_at: now })
    .eq("id", stepId);

  if (currentStep) {
    const sdlcStep = SDLC_WORKFLOW.find((s) => s.key === currentStep.stepKey);
    if (sdlcStep) {
      const docContent =
        output ||
        (sdlcStep.key === "validation"
          ? generateTestPlan(run.objective)
          : sdlcStep.key === "documentation"
            ? generateImplementationGuide(run.objective)
            : `Completed: ${sdlcStep.deliverableTitle}`);

      const docType =
        sdlcStep.key === "validation"
          ? "test_plan"
          : sdlcStep.key === "documentation"
            ? "implementation_guide"
            : sdlcStep.key === "deployment"
              ? "release_note"
              : "technical_spec";

      await createDocument({
        workflowId,
        projectId: run.projectId,
        createdBy: currentStep.assignedAgentName ?? "SAI",
        title: sdlcStep.deliverableTitle,
        type: docType,
        content: docContent,
      });

      await supabase
        .from("project_deliverables")
        .update({ content: docContent })
        .eq("project_id", run.projectId)
        .eq("workflow_run_id", workflowId)
        .eq("workflow_step_key", currentStep.stepKey);

      const { data: stepTask } = await supabase
        .from("tasks")
        .select("id")
        .eq("workflow_run_id", workflowId)
        .eq("workflow_step_key", currentStep.stepKey)
        .maybeSingle();

      if (stepTask?.id) {
        await supabase
          .from("tasks")
          .update({ status: sdlcStep.taskStatus, completed_at: now })
          .eq("id", stepTask.id);
      }

      await addProjectMemory({
        projectId: run.projectId,
        memoryType: currentStep.stepKey === "knowledge" ? "lesson" : "technical",
        title: sdlcStep.deliverableTitle,
        summary: docContent,
        sourceType: "workflow_step",
        sourceId: stepId,
      });

      await addTimelineEvent({
        projectId: run.projectId,
        eventType: "workflow_step_completed",
        title: `${sdlcStep.deliverableTitle} completed`,
        description: docContent,
        actorName: currentStep.assignedAgentName ?? "SAI",
        metadata: { workflowRunId: workflowId, stepKey: currentStep.stepKey },
      });

      await recordWorkflowEvent({
        workflowId,
        eventType: `${currentStep.stepKey}_completed`,
        actor: currentStep.assignedAgentName ?? "SAI",
        title: `${sdlcStep.deliverableTitle} completed`,
        description: docContent.slice(0, 300),
      });

      if (currentStep.assignedAgentId) {
        await addAgentMemory(currentStep.assignedAgentId, {
          memoryType: currentStep.stepKey === "validation" ? "lesson" : "knowledge",
          title: sdlcStep.deliverableTitle,
          summary: docContent.slice(0, 500),
          content: docContent,
          projectId: run.projectId,
          taskId: stepTask?.id ?? null,
          workflowId,
        });
      }
    }
  }

  const currentIndex = run.steps.findIndex((s) => s.id === stepId);
  const nextStep = run.steps[currentIndex + 1];

  if (nextStep) {
    await supabase
      .from("workflow_run_steps")
      .update({ status: "in_progress", started_at: now })
      .eq("id", nextStep.id);

    await supabase
      .from("workflow_runs")
      .update({ current_step_index: currentIndex + 1, status: "running" })
      .eq("id", workflowId);

    await recordWorkflowEvent({
      workflowId,
      eventType: "step_started",
      actor: nextStep.assignedAgentName ?? "SAI",
      title: `${nextStep.stepLabel} started`,
      description: `Handoff to ${nextStep.assignedAgentName ?? "next agent"}`,
    });
  } else {
    await supabase
      .from("workflow_runs")
      .update({
        status: "completed",
        current_step_index: run.steps.length - 1,
        completed_at: now,
      })
      .eq("id", workflowId);

    await addTimelineEvent({
      projectId: run.projectId,
      eventType: "workflow_completed",
      title: "Workflow complete",
      description: run.objective,
      actorName: "SAI",
      metadata: { workflowRunId: workflowId },
    });

    await recordWorkflowEvent({
      workflowId,
      eventType: "workflow_completed",
      actor: "SAI",
      title: "Workflow completed",
      description: run.objective,
    });

    await recordActivityFeed({
      actor: "SAI",
      action: "workflow_completed",
      targetType: "workflow",
      targetId: workflowId,
      description: run.objective,
    });

    await notifyFounder(
      `Workflow completed: ${run.objective}`,
      "All SDLC steps finished",
      "WORKFLOW",
      { severity: "MEDIUM", entityType: "workflow", entityId: workflowId },
    );
  }

  await syncProjectTaskCounts(run.projectId);
  const updated = await getWorkflowRunById(workflowId);
  if (!updated) throw new Error("Workflow not found");
  return updated;
}

export async function getControlPanelStats(): Promise<ControlPanelStats> {
  if (!isSupabaseConfigured()) {
    return {
      totalAgents: 0,
      activeAgents: 0,
      disabledAgents: 0,
      totalTasks: 0,
      blockedTasks: 0,
      inProgressTasks: 0,
      pendingApprovals: 0,
      activeWorkflows: 0,
      blockedWorkflows: 0,
      workflowCompletionRate: 0,
      generatedDocuments: 0,
      decisionsRecorded: 0,
      autoApprovedToday: 0,
      escalationsToday: 0,
      waitingForFounder: 0,
      waitingForRevision: 0,
      governanceHealth: 100,
    };
  }

  const supabase = createSupabaseAdmin();
  const { getGovernanceStats } = await import("./governance");
  const govStats = await getGovernanceStats();

  const [agents, tasks, workflows, approvals, docCount, decisionCount] = await Promise.all([
    supabase.from("agents").select("status"),
    supabase.from("tasks").select("status, approval_status"),
    supabase.from("workflow_runs").select("status"),
    supabase.from("project_approvals").select("status"),
    countDocuments(),
    countDecisions(),
  ]);

  if (agents.error) throw new Error(agents.error.message);
  if (tasks.error) throw new Error(tasks.error.message);
  if (workflows.error) throw new Error(workflows.error.message);

  const agentRows = agents.data ?? [];
  const taskRows = tasks.data ?? [];
  const workflowRows = workflows.data ?? [];
  const approvalRows = approvals.data ?? [];

  return {
    totalAgents: agentRows.length,
    activeAgents: agentRows.filter((a) => a.status !== "disabled").length,
    disabledAgents: agentRows.filter((a) => a.status === "disabled").length,
    totalTasks: taskRows.length,
    blockedTasks: taskRows.filter(
      (t) => t.status === "backlog" && t.approval_status === "rejected",
    ).length,
    inProgressTasks: taskRows.filter((t) =>
      ["in_progress", "code_review", "testing", "assigned"].includes(t.status as string),
    ).length,
    pendingApprovals:
      taskRows.filter((t) => t.approval_status === "pending").length +
      approvalRows.filter((a) => a.status === "pending").length,
    activeWorkflows: workflowRows.filter((w) => w.status === "running").length,
    blockedWorkflows: workflowRows.filter((w) => w.status === "blocked").length,
    workflowCompletionRate:
      workflowRows.length > 0
        ? Math.round(
            (workflowRows.filter((w) => w.status === "completed").length / workflowRows.length) *
              100,
          )
        : 0,
    generatedDocuments: docCount,
    decisionsRecorded: decisionCount,
    autoApprovedToday: govStats.autoApprovedToday,
    escalationsToday: govStats.escalationsToday,
    waitingForFounder: govStats.waitingForFounder,
    waitingForRevision: govStats.waitingForRevision,
    governanceHealth: govStats.governanceHealth,
  };
}
