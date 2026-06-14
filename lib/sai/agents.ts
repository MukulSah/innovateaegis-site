import { validateReportingHierarchy, findAgentForRole as hierarchyFindAgentForRole } from "@/lib/sai/agent-hierarchy";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivity } from "./activity-logs";
import type { Agent, AgentMemory, AgentStatus, PriorityLevel } from "./types";

type AgentRow = {
  id: string;
  name: string;
  role: string;
  department: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  tools_access: string[];
  objectives: string[];
  reporting_agent_id: string | null;
  priority_level: PriorityLevel;
  memory_enabled: boolean;
  approval_required: boolean;
  status: AgentStatus;
  performance_score: number;
  capacity_status: string | null;
  cloned_from_id: string | null;
  created_at: string;
  updated_at: string;
  agent_projects?: { project_id: string }[];
};

type MemoryRow = {
  id: string;
  agent_id: string;
  memory_type: AgentMemory["memoryType"];
  title: string;
  summary: string;
  content: string | null;
  project_id: string | null;
  task_id: string | null;
  workflow_id: string | null;
  created_at: string;
};

export type AgentInput = {
  name: string;
  role: string;
  department: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  toolsAccess: string[];
  objectives: string[];
  projectIds: string[];
  reportingAgentId?: string | null;
  priorityLevel: PriorityLevel;
  memoryEnabled: boolean;
  approvalRequired: boolean;
  status: AgentStatus;
  performanceScore: number;
};

function mapRow(row: AgentRow, taskCount = 0): Agent {
  const projectIds = row.agent_projects?.map((p) => p.project_id) ?? [];
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    description: row.description,
    responsibilities: row.responsibilities ?? [],
    skills: row.skills ?? [],
    toolsAccess: row.tools_access ?? [],
    objectives: row.objectives ?? [],
    projectIds,
    reportingAgentId: row.reporting_agent_id,
    reportingAgentName: null,
    priorityLevel: row.priority_level,
    memoryEnabled: row.memory_enabled,
    approvalRequired: row.approval_required,
    status: row.status,
    capacityStatus: (row.capacity_status?.toUpperCase() ?? "AVAILABLE") as Agent["capacityStatus"],
    performanceScore: row.performance_score,
    assignedProjects: projectIds.length,
    activeTaskCount: taskCount,
    clonedFromId: row.cloned_from_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInput(input: AgentInput) {
  return {
    name: input.name.trim(),
    role: input.role.trim(),
    department: input.department.trim(),
    description: input.description.trim(),
    responsibilities: input.responsibilities,
    skills: input.skills,
    tools_access: input.toolsAccess,
    objectives: input.objectives,
    reporting_agent_id: normalizeReportingAgentId(input.reportingAgentId),
    priority_level: input.priorityLevel,
    memory_enabled: input.memoryEnabled,
    approval_required: input.approvalRequired,
    status: input.status,
    performance_score: input.performanceScore,
  };
}

const agentSelect = `*, agent_projects(project_id)`;

function enrichReportingNames(rows: AgentRow[]): AgentRow[] {
  const nameById = new Map(rows.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    ...row,
    reportingAgentName: row.reporting_agent_id
      ? nameById.get(row.reporting_agent_id) ?? null
      : null,
  }));
}

type EnrichedAgentRow = AgentRow & { reportingAgentName?: string | null };

function mapEnrichedRow(row: EnrichedAgentRow, taskCount = 0): Agent {
  const agent = mapRow(row, taskCount);
  return {
    ...agent,
    reportingAgentName: row.reportingAgentName ?? null,
  };
}

async function syncAgentProjects(agentId: string, projectIds: string[]) {
  const supabase = createSupabaseAdmin();
  await supabase.from("agent_projects").delete().eq("agent_id", agentId);

  if (projectIds.length === 0) return;

  const { error } = await supabase.from("agent_projects").insert(
    projectIds.map((projectId) => ({ agent_id: agentId, project_id: projectId })),
  );

  if (error) throw new Error(error.message);
}

async function getTaskCountsByAgent(): Promise<Record<string, number>> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("assigned_agent_id")
    .not("assigned_agent_id", "is", null)
    .in("status", [
      "backlog", "planning", "ready", "assigned", "in_progress",
      "code_review", "testing", "approval",
    ]);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.assigned_agent_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function getAgents(): Promise<Agent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const [agentsResult, taskCounts] = await Promise.all([
    supabase.from("agents").select(agentSelect).order("name", { ascending: true }),
    getTaskCountsByAgent(),
  ]);

  if (agentsResult.error) throw new Error(agentsResult.error.message);

  const enriched = enrichReportingNames(agentsResult.data as AgentRow[]);
  return enriched.map((row) =>
    mapEnrichedRow(row as EnrichedAgentRow, taskCounts[row.id] ?? 0),
  );
}

export async function getAgentById(id: string): Promise<Agent | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .select(agentSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: allAgents } = await supabase.from("agents").select("id, name");
  const nameById = new Map((allAgents ?? []).map((a) => [a.id, a.name as string]));
  const row = data as AgentRow;
  const taskCounts = await getTaskCountsByAgent();

  return mapEnrichedRow(
    {
      ...row,
      reportingAgentName: row.reporting_agent_id
        ? nameById.get(row.reporting_agent_id) ?? null
        : null,
    },
    taskCounts[id] ?? 0,
  );
}

async function assertValidReportingAgent(
  agentId: string | null,
  reportingAgentId: string | null,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .select("id, reporting_agent_id");

  if (error) throw new Error(error.message);

  const agents = (data ?? []).map((row) => ({
    id: row.id as string,
    reportingAgentId: row.reporting_agent_id as string | null,
  }));

  const hierarchyError = validateReportingHierarchy(
    agentId,
    reportingAgentId,
    agents,
  );
  if (hierarchyError) {
    throw new Error(hierarchyError);
  }
}

export async function createAgent(input: AgentInput): Promise<Agent> {
  await assertValidReportingAgent(null, normalizeReportingAgentId(input.reportingAgentId));

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .insert(mapInput(input))
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await syncAgentProjects(data.id, input.projectIds);

  const agent = await getAgentById(data.id);
  if (!agent) throw new Error("Failed to load created agent");

  await recordActivity({
    actor: "SAI",
    action: `Agent added: ${agent.name}`,
    entityType: "agent",
    entityId: agent.id,
  });

  return agent;
}

export async function updateAgent(id: string, input: AgentInput): Promise<Agent> {
  await assertValidReportingAgent(id, normalizeReportingAgentId(input.reportingAgentId));

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("agents")
    .update(mapInput(input))
    .eq("id", id);

  if (error) throw new Error(error.message);

  await syncAgentProjects(id, input.projectIds);

  const agent = await getAgentById(id);
  if (!agent) throw new Error("Agent not found");
  return agent;
}

export async function deleteAgent(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function cloneAgent(id: string): Promise<Agent> {
  const source = await getAgentById(id);
  if (!source) throw new Error("Agent not found");

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      ...mapInput({
        name: `${source.name} (Copy)`,
        role: source.role,
        department: source.department,
        description: source.description,
        responsibilities: source.responsibilities,
        skills: source.skills,
        toolsAccess: source.toolsAccess,
        objectives: source.objectives,
        projectIds: source.projectIds,
        reportingAgentId: source.reportingAgentId,
        priorityLevel: source.priorityLevel,
        memoryEnabled: source.memoryEnabled,
        approvalRequired: source.approvalRequired,
        status: "idle",
        performanceScore: source.performanceScore,
      }),
      cloned_from_id: id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await syncAgentProjects(data.id, source.projectIds);

  const agent = await getAgentById(data.id);
  if (!agent) throw new Error("Failed to load cloned agent");
  return agent;
}

export async function setAgentStatus(
  id: string,
  status: AgentStatus,
): Promise<Agent> {
  const agent = await getAgentById(id);
  if (!agent) throw new Error("Agent not found");

  return updateAgent(id, {
    name: agent.name,
    role: agent.role,
    department: agent.department,
    description: agent.description,
    responsibilities: agent.responsibilities,
    skills: agent.skills,
    toolsAccess: agent.toolsAccess,
    objectives: agent.objectives,
    projectIds: agent.projectIds,
    reportingAgentId: agent.reportingAgentId,
    priorityLevel: agent.priorityLevel,
    memoryEnabled: agent.memoryEnabled,
    approvalRequired: agent.approvalRequired,
    status,
    performanceScore: agent.performanceScore,
  });
}

export async function getAgentMemory(agentId: string): Promise<AgentMemory[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data as MemoryRow[]).map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    memoryType: row.memory_type,
    title: row.title,
    summary: row.summary,
    content: row.content ?? row.summary,
    projectId: row.project_id,
    taskId: row.task_id,
    workflowId: row.workflow_id,
    createdAt: row.created_at,
  }));
}

export async function addAgentMemory(
  agentId: string,
  memory: Omit<AgentMemory, "id" | "agentId" | "createdAt">,
): Promise<AgentMemory> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_memory")
    .insert({
      agent_id: agentId,
      memory_type: memory.memoryType,
      title: memory.title,
      summary: memory.summary,
      content: memory.content ?? memory.summary,
      project_id: memory.projectId,
      task_id: memory.taskId,
      workflow_id: memory.workflowId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const row = data as MemoryRow;

  return {
    id: row.id,
    agentId: row.agent_id,
    memoryType: row.memory_type,
    title: row.title,
    summary: row.summary,
    content: row.content ?? row.summary,
    projectId: row.project_id,
    taskId: row.task_id,
    workflowId: row.workflow_id,
    createdAt: row.created_at,
  };
}

export function normalizeReportingAgentId(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

export function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function validateAgentInput(body: unknown): AgentInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const statuses: AgentStatus[] = ["active", "idle", "busy", "disabled"];
  const priorities: PriorityLevel[] = ["low", "medium", "high", "critical"];

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const status = data.status as AgentStatus;
  const priorityLevel = data.priorityLevel as PriorityLevel;
  const performanceScore = Number(data.performanceScore);

  if (!name || !statuses.includes(status) || !priorities.includes(priorityLevel)) {
    return null;
  }

  if (Number.isNaN(performanceScore) || performanceScore < 0 || performanceScore > 100) {
    return null;
  }

  const projectIds = Array.isArray(data.projectIds)
    ? data.projectIds.map(String)
    : [];

  return {
    name,
    role: typeof data.role === "string" ? data.role : "",
    department: typeof data.department === "string" ? data.department : "",
    description: typeof data.description === "string" ? data.description : "",
    responsibilities: parseStringList(data.responsibilities),
    skills: parseStringList(data.skills),
    toolsAccess: parseStringList(data.toolsAccess),
    objectives: parseStringList(data.objectives),
    projectIds,
    reportingAgentId: normalizeReportingAgentId(data.reportingAgentId),
    priorityLevel,
    memoryEnabled: Boolean(data.memoryEnabled),
    approvalRequired: Boolean(data.approvalRequired),
    status,
    performanceScore,
  };
}

export function findAgentForRole(agents: Agent[], matchRoles: string[]): Agent | null {
  return hierarchyFindAgentForRole(agents, matchRoles);
}
