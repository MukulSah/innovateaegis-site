import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import { recordActivity } from "./activity-logs";
import { notifyAgent, notifyFounder } from "./notifications";
import { syncProjectTaskCounts } from "./projects";
import { recordTaskHistory } from "./task-history";
import type { ApprovalStatus, PriorityLevel, Task, TaskStage } from "./types";

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  dependencies: string[];
  acceptance_criteria: string[];
  objective_id: string | null;
  feature_id: string | null;
  assigned_agent_id: string | null;
  assigned_employee_id: string | null;
  status: TaskStage;
  evidence: string;
  comments: string[];
  attachments: string[];
  knowledge_generated: string;
  approval_status: ApprovalStatus;
  workflow_run_id: string | null;
  workflow_step_key: string | null;
  due_date: string | null;
  completed_at: string | null;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  projects?: { name: string } | null;
  agents?: { name: string } | null;
  employees?: { name: string } | null;
};

export type TaskInput = {
  projectId: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  dependencies: string[];
  acceptanceCriteria: string[];
  objectiveId?: string | null;
  featureId?: string | null;
  assignedAgentId: string | null;
  assignedEmployeeId: string | null;
  status: TaskStage;
  evidence: string;
  comments: string[];
  attachments?: string[];
  knowledgeGenerated?: string;
  approvalStatus: ApprovalStatus;
  workflowRunId?: string | null;
  workflowStepKey?: string | null;
  dueDate?: string | null;
  progressPercentage?: number;
};

const taskSelect = `*, projects(name), agents(name), employees(name)`;

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dependencies: row.dependencies ?? [],
    acceptanceCriteria: row.acceptance_criteria ?? [],
    objectiveId: row.objective_id,
    featureId: row.feature_id,
    assignedAgentId: row.assigned_agent_id,
    assignedAgentName: row.agents?.name ?? null,
    assignedEmployeeId: row.assigned_employee_id,
    assignedEmployeeName: row.employees?.name ?? null,
    status: row.status,
    progressPercentage: row.progress_percentage ?? 0,
    evidence: row.evidence,
    comments: row.comments ?? [],
    attachments: row.attachments ?? [],
    knowledgeGenerated: row.knowledge_generated ?? "",
    approvalStatus: row.approval_status,
    workflowRunId: row.workflow_run_id,
    workflowStepKey: row.workflow_step_key,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInput(input: TaskInput) {
  const completedAt =
    ["released", "archived"].includes(input.status) ? new Date().toISOString() : null;

  return {
    project_id: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority,
    dependencies: input.dependencies,
    acceptance_criteria: input.acceptanceCriteria,
    objective_id: input.objectiveId ?? null,
    feature_id: input.featureId ?? null,
    assigned_agent_id: input.assignedAgentId || null,
    assigned_employee_id: input.assignedEmployeeId || null,
    status: input.status,
    evidence: input.evidence,
    comments: input.comments,
    attachments: input.attachments ?? [],
    knowledge_generated: input.knowledgeGenerated ?? "",
    approval_status: input.approvalStatus,
    workflow_run_id: input.workflowRunId ?? null,
    workflow_step_key: input.workflowStepKey ?? null,
    due_date: input.dueDate ?? null,
    completed_at: completedAt,
    progress_percentage: input.progressPercentage ?? 0,
  };
}

export async function getTasks(): Promise<Task[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskSelect)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapRow);
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskSelect)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapRow);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as TaskRow) : null;
}

export async function createTask(input: TaskInput, historyAction?: string): Promise<Task> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .insert(mapInput(input))
    .select(taskSelect)
    .single();

  if (error) throw new Error(error.message);
  const task = mapRow(data as TaskRow);

  await recordTaskHistory({
    taskId: task.id,
    projectId: task.projectId,
    action: historyAction ?? "Task Created",
    notes: task.description,
    actorName: "SAI",
    actorType: "system",
  });

  if (task.assignedAgentName) {
    await recordTaskHistory({
      taskId: task.id,
      projectId: task.projectId,
      action: `Assigned to ${task.assignedAgentName}`,
      notes: "Automatic assignment by Team Orchestrator",
      actorName: "Team Orchestrator Agent",
      actorType: "agent",
    });
  }

  await recordActivity({
    actor: "SAI",
    action: `Task created: ${task.title}`,
    entityType: "task",
    entityId: task.id,
  });

  await recordActivityFeed({
    actor: "SAI",
    action: "task_created",
    targetType: "task",
    targetId: task.id,
    description: task.title,
  });

  if (task.assignedAgentId) {
    await notifyAgent(
      task.assignedAgentId,
      `Task assigned: ${task.title}`,
      task.description.slice(0, 200) || "You have been assigned a new task",
      "ASSIGNMENT",
      { severity: "MEDIUM", entityType: "task", entityId: task.id },
    );
    await notifyFounder(
      `Task assigned to ${task.assignedAgentName}`,
      task.title,
      "ASSIGNMENT",
      { severity: "LOW", entityType: "task", entityId: task.id },
    );
  }

  await syncProjectTaskCounts(task.projectId);
  return task;
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  const existing = await getTaskById(id);
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .update(mapInput(input))
    .eq("id", id)
    .select(taskSelect)
    .single();

  if (error) throw new Error(error.message);
  const task = mapRow(data as TaskRow);

  if (existing && existing.assignedAgentId !== task.assignedAgentId && task.assignedAgentName) {
    await recordTaskHistory({
      taskId: task.id,
      projectId: task.projectId,
      action: `Reassigned to ${task.assignedAgentName}`,
      notes: "Assignment updated by owner",
      actorName: "SAI",
      actorType: "owner",
    });
    if (task.assignedAgentId) {
      await notifyAgent(
        task.assignedAgentId,
        `Task assigned: ${task.title}`,
        "You have been assigned this task",
        "ASSIGNMENT",
        { severity: "MEDIUM", entityType: "task", entityId: task.id },
      );
    }
  }

  if (existing && existing.status !== task.status) {
    await recordTaskHistory({
      taskId: task.id,
      projectId: task.projectId,
      action: `Status changed to ${task.status.replace("_", " ")}`,
      notes: task.evidence,
      actorName: task.assignedAgentName ?? "SAI",
      actorType: task.assignedAgentId ? "agent" : "system",
    });
  }

  await recordActivity({
    actor: task.assignedAgentName ?? "SAI",
    action: `Task updated: ${task.title}`,
    entityType: "task",
    entityId: task.id,
  });

  await syncProjectTaskCounts(task.projectId);
  return task;
}

export async function reassignTaskAgent(taskId: string, newAgentId: string): Promise<Task> {
  const task = await getTaskById(taskId);
  if (!task) throw new Error("Task not found");

  return updateTask(taskId, {
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dependencies: task.dependencies,
    acceptanceCriteria: task.acceptanceCriteria,
    objectiveId: task.objectiveId,
    featureId: task.featureId,
    assignedAgentId: newAgentId,
    assignedEmployeeId: task.assignedEmployeeId,
    status: task.status,
    evidence: task.evidence,
    comments: task.comments,
    attachments: task.attachments,
    knowledgeGenerated: task.knowledgeGenerated,
    approvalStatus: task.approvalStatus,
    workflowRunId: task.workflowRunId,
    workflowStepKey: task.workflowStepKey,
    dueDate: task.dueDate,
    progressPercentage: task.progressPercentage,
  });
}

export async function deleteTask(id: string): Promise<void> {
  const task = await getTaskById(id);
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (task) await syncProjectTaskCounts(task.projectId);
}

export function validateTaskInput(body: unknown): TaskInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const priorities: PriorityLevel[] = ["low", "medium", "high", "critical"];
  const statuses: TaskStage[] = [
    "backlog", "planning", "ready", "assigned", "in_progress",
    "code_review", "testing", "approval", "released", "archived",
  ];
  const approvals: ApprovalStatus[] = ["none", "pending", "approved", "rejected"];

  const projectId = typeof data.projectId === "string" ? data.projectId : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const status = data.status as TaskStage;
  const priority = data.priority as PriorityLevel;
  const approvalStatus = (data.approvalStatus as ApprovalStatus) ?? "none";

  if (!projectId || !title || !statuses.includes(status) || !priorities.includes(priority)) {
    return null;
  }
  if (!approvals.includes(approvalStatus)) return null;

  return {
    projectId,
    title,
    description: typeof data.description === "string" ? data.description : "",
    priority,
    dependencies: Array.isArray(data.dependencies) ? data.dependencies.map(String) : [],
    acceptanceCriteria: Array.isArray(data.acceptanceCriteria)
      ? data.acceptanceCriteria.map(String)
      : [],
    objectiveId: typeof data.objectiveId === "string" ? data.objectiveId : null,
    featureId: typeof data.featureId === "string" ? data.featureId : null,
    assignedAgentId:
      typeof data.assignedAgentId === "string" && data.assignedAgentId
        ? data.assignedAgentId
        : null,
    assignedEmployeeId:
      typeof data.assignedEmployeeId === "string" && data.assignedEmployeeId
        ? data.assignedEmployeeId
        : null,
    status,
    evidence: typeof data.evidence === "string" ? data.evidence : "",
    comments: Array.isArray(data.comments) ? data.comments.map(String) : [],
    attachments: Array.isArray(data.attachments) ? data.attachments.map(String) : [],
    knowledgeGenerated:
      typeof data.knowledgeGenerated === "string" ? data.knowledgeGenerated : "",
    approvalStatus,
    workflowRunId: typeof data.workflowRunId === "string" ? data.workflowRunId : null,
    workflowStepKey: typeof data.workflowStepKey === "string" ? data.workflowStepKey : null,
    dueDate: typeof data.dueDate === "string" ? data.dueDate : null,
    progressPercentage:
      typeof data.progressPercentage === "number" ? data.progressPercentage : undefined,
  };
}
