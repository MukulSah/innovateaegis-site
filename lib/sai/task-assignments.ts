import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Agent, TaskAssignment, TaskAssignmentRole } from "./types";
import { findAgentForRole } from "./agents";

type TaskAssignmentRow = {
  id: string;
  task_id: string;
  agent_id: string | null;
  group_id: string | null;
  role: TaskAssignmentRole;
  assigned_at: string;
  agents?: { name: string } | null;
  agent_groups?: { name: string } | null;
};

export type TaskAssignmentInput = {
  taskId: string;
  agentId?: string | null;
  groupId?: string | null;
  role: TaskAssignmentRole;
};

function mapRow(row: TaskAssignmentRow): TaskAssignment {
  return {
    id: row.id,
    taskId: row.task_id,
    agentId: row.agent_id,
    agentName: row.agents?.name ?? null,
    groupId: row.group_id,
    groupName: row.agent_groups?.name ?? null,
    role: row.role,
    assignedAt: row.assigned_at,
  };
}

const assignmentSelect = `*, agents(name), agent_groups(name)`;

export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("task_assignments")
    .select(assignmentSelect)
    .eq("task_id", taskId)
    .order("assigned_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TaskAssignmentRow[]).map(mapRow);
}

export async function getAssignmentsByWorkflow(workflowId: string): Promise<TaskAssignment[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("workflow_run_id", workflowId);

  if (taskError) throw new Error(taskError.message);
  if (!tasks?.length) return [];

  const { data, error } = await supabase
    .from("task_assignments")
    .select(assignmentSelect)
    .in(
      "task_id",
      tasks.map((t) => t.id),
    )
    .order("assigned_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TaskAssignmentRow[]).map(mapRow);
}

export async function createTaskAssignment(input: TaskAssignmentInput): Promise<TaskAssignment> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("task_assignments")
    .insert({
      task_id: input.taskId,
      agent_id: input.agentId ?? null,
      group_id: input.groupId ?? null,
      role: input.role,
    })
    .select(assignmentSelect)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as TaskAssignmentRow);
}

export async function deleteTaskAssignments(taskId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("task_assignments").delete().eq("task_id", taskId);
  if (error) throw new Error(error.message);
}

type RoleSlot = { matchRoles: string[]; role: TaskAssignmentRole };

const STEP_ASSIGNMENT_SLOTS: Record<string, RoleSlot[]> = {
  requirements: [{ matchRoles: ["Product Management", "Product Manager"], role: "owner" }],
  design: [
    { matchRoles: ["Architecture", "Architect"], role: "owner" },
    { matchRoles: ["Product Management", "Product Manager"], role: "reviewer" },
  ],
  tasks: [{ matchRoles: ["Project Management", "Project Manager"], role: "owner" }],
  assignment: [{ matchRoles: ["Work Routing", "Orchestrator"], role: "owner" }],
  implementation: [
    { matchRoles: ["Engineering", "Software Engineer"], role: "owner" },
    { matchRoles: ["DevOps"], role: "contributor" },
    { matchRoles: ["Quality Assurance", "QA"], role: "reviewer" },
    { matchRoles: ["Project Management", "Project Manager"], role: "approver" },
  ],
  validation: [
    { matchRoles: ["Quality Assurance", "QA"], role: "owner" },
    { matchRoles: ["Engineering", "Software Engineer"], role: "contributor" },
  ],
  deployment: [
    { matchRoles: ["DevOps"], role: "owner" },
    { matchRoles: ["Architecture", "Architect"], role: "reviewer" },
  ],
  documentation: [{ matchRoles: ["Documentation"], role: "owner" }],
  knowledge: [{ matchRoles: ["Documentation", "Knowledge"], role: "owner" }],
};

export async function assignAgentsToTask(
  taskId: string,
  stepKey: string,
  agents: Agent[],
): Promise<TaskAssignment[]> {
  const slots = STEP_ASSIGNMENT_SLOTS[stepKey] ?? [
    { matchRoles: ["Engineering"], role: "owner" as TaskAssignmentRole },
  ];

  const created: TaskAssignment[] = [];
  const usedAgentIds = new Set<string>();

  for (const slot of slots) {
    const agent = findAgentForRole(
      agents.filter((a) => !usedAgentIds.has(a.id)),
      slot.matchRoles,
    );
    if (!agent) continue;
    usedAgentIds.add(agent.id);
    created.push(
      await createTaskAssignment({
        taskId,
        agentId: agent.id,
        role: slot.role,
      }),
    );
  }

  return created;
}
