import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { recordActivity } from "./activity-logs";
import type { Project } from "./types";

type ProjectRow = {
  id: string;
  name: string;
  objective: string;
  status: Project["status"];
  progress: number;
  lead: string;
  business_owner: string;
  project_lead_agent_id: string | null;
  project_lead_employee_id: string | null;
  health_score: number;
  tasks_total: number;
  tasks_completed: number;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  name: string;
  objective: string;
  status: Project["status"];
  progress: number;
  businessOwner: string;
  projectLeadAgentId: string | null;
  projectLeadEmployeeId: string | null;
  healthScore: number;
  tasksTotal: number;
  tasksCompleted: number;
};

async function resolveLeadName(
  agentId: string | null,
  employeeId: string | null,
  legacyLead: string,
): Promise<string> {
  if (agentId) {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase.from("agents").select("name").eq("id", agentId).maybeSingle();
    if (data?.name) return data.name as string;
  }
  if (employeeId) {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase.from("employees").select("name").eq("id", employeeId).maybeSingle();
    if (data?.name) return data.name as string;
  }
  return legacyLead || "Unassigned";
}

async function mapRow(row: ProjectRow): Promise<Project> {
  const projectLeadName = await resolveLeadName(
    row.project_lead_agent_id,
    row.project_lead_employee_id,
    row.lead,
  );

  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    status: row.status,
    progress: row.progress,
    lead: projectLeadName,
    businessOwner: row.business_owner || "Unassigned",
    projectLeadAgentId: row.project_lead_agent_id,
    projectLeadEmployeeId: row.project_lead_employee_id,
    projectLeadName,
    healthScore: row.health_score ?? 80,
    tasksTotal: row.tasks_total,
    tasksCompleted: row.tasks_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInput(input: ProjectInput) {
  return {
    name: input.name.trim(),
    objective: input.objective.trim(),
    status: input.status,
    progress: input.progress,
    business_owner: input.businessOwner.trim() || "Unassigned",
    project_lead_agent_id: input.projectLeadAgentId || null,
    project_lead_employee_id: input.projectLeadEmployeeId || null,
    health_score: input.healthScore,
    lead: "",
    tasks_total: input.tasksTotal,
    tasks_completed: input.tasksCompleted,
  };
}

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return Promise.all((data as ProjectRow[]).map(mapRow));
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as ProjectRow) : null;
}

export async function createProject(
  input: ProjectInput,
  createdBy?: string | null,
): Promise<Project> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...mapInput(input),
      created_by: createdBy ?? null,
      updated_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const project = await mapRow(data as ProjectRow);

  await recordActivity({
    actor: project.businessOwner,
    action: `Project created: ${project.name}`,
    entityType: "project",
    entityId: project.id,
  });

  return project;
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update(mapInput(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as ProjectRow);
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function syncProjectTaskCounts(projectId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("status")
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);

  const tasks = data ?? [];
  const completed = tasks.filter((t) =>
    ["released", "archived"].includes(t.status as string),
  ).length;

  await supabase
    .from("projects")
    .update({
      tasks_total: tasks.length,
      tasks_completed: completed,
      progress: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    })
    .eq("id", projectId);
}

export function validateProjectInput(body: unknown): ProjectInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const statuses: Project["status"][] = ["on_track", "at_risk", "delayed", "completed"];

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const status = data.status as Project["status"];
  const progress = Number(data.progress);
  const healthScore = Number(data.healthScore ?? 80);
  const tasksTotal = Number(data.tasksTotal ?? 0);
  const tasksCompleted = Number(data.tasksCompleted ?? 0);

  if (!name || !statuses.includes(status)) return null;

  if (
    Number.isNaN(progress) || progress < 0 || progress > 100 ||
    Number.isNaN(healthScore) || healthScore < 0 || healthScore > 100 ||
    Number.isNaN(tasksTotal) || tasksTotal < 0 ||
    Number.isNaN(tasksCompleted) || tasksCompleted < 0 || tasksCompleted > tasksTotal
  ) {
    return null;
  }

  return {
    name,
    objective: typeof data.objective === "string" ? data.objective : "",
    status,
    progress,
    businessOwner:
      typeof data.businessOwner === "string" && data.businessOwner.trim()
        ? data.businessOwner.trim()
        : "",
    projectLeadAgentId:
      typeof data.projectLeadAgentId === "string" && data.projectLeadAgentId
        ? data.projectLeadAgentId
        : null,
    projectLeadEmployeeId:
      typeof data.projectLeadEmployeeId === "string" && data.projectLeadEmployeeId
        ? data.projectLeadEmployeeId
        : null,
    healthScore,
    tasksTotal,
    tasksCompleted,
  };
}
