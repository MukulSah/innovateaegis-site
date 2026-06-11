import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { TaskHistoryEntry } from "./types";

type HistoryRow = {
  id: string;
  task_id: string;
  project_id: string;
  actor_type: TaskHistoryEntry["actorType"];
  actor_id: string | null;
  actor_name: string;
  action: string;
  notes: string;
  outcome: string;
  created_at: string;
};

function mapRow(row: HistoryRow): TaskHistoryEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    notes: row.notes,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

export async function recordTaskHistory(entry: {
  taskId: string;
  projectId: string;
  actorType?: TaskHistoryEntry["actorType"];
  actorId?: string | null;
  actorName?: string;
  action: string;
  notes?: string;
  outcome?: string;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("task_history").insert({
    task_id: entry.taskId,
    project_id: entry.projectId,
    actor_type: entry.actorType ?? "system",
    actor_id: entry.actorId ?? null,
    actor_name: entry.actorName ?? "SAI",
    action: entry.action,
    notes: entry.notes ?? "",
    outcome: entry.outcome ?? "",
  });
  if (error) throw new Error(error.message);
}

export async function getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("task_history")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as HistoryRow[]).map(mapRow);
}

export async function getProjectTaskHistory(projectId: string): Promise<TaskHistoryEntry[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("task_history")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as HistoryRow[]).map(mapRow);
}
