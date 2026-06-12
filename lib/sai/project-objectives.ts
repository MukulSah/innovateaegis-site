import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProjectObjective } from "./types";

type ObjectiveRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: ProjectObjective["status"];
  workflow_run_id: string | null;
  strategic_brief: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
};

function mapRow(row: ObjectiveRow): ProjectObjective {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    strategicBrief: row.strategic_brief ?? {},
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function getProjectObjectives(projectId: string): Promise<ProjectObjective[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_objectives")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ObjectiveRow[]).map(mapRow);
}

export async function createProjectObjective(
  projectId: string,
  title: string,
  description: string,
  workflowRunId?: string | null,
  createdBy?: string | null,
  status: ProjectObjective["status"] = "active",
): Promise<ProjectObjective> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_objectives")
    .insert({
      project_id: projectId,
      title,
      description,
      status,
      workflow_run_id: workflowRunId ?? null,
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as ObjectiveRow);
}

export async function linkObjectiveWorkflow(
  objectiveId: string,
  workflowRunId: string,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("project_objectives")
    .update({ workflow_run_id: workflowRunId })
    .eq("id", objectiveId);

  if (error) throw new Error(error.message);
}
