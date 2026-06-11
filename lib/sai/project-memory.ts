import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { ProjectMemoryEntry } from "./types";

type MemoryRow = {
  id: string;
  project_id: string;
  memory_type: ProjectMemoryEntry["memoryType"];
  title: string;
  summary: string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
};

function mapRow(row: MemoryRow): ProjectMemoryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    memoryType: row.memory_type,
    title: row.title,
    summary: row.summary,
    sourceType: row.source_type,
    sourceId: row.source_id,
    createdAt: row.created_at,
  };
}

export async function addProjectMemory(entry: {
  projectId: string;
  memoryType: ProjectMemoryEntry["memoryType"];
  title: string;
  summary?: string;
  sourceType?: string;
  sourceId?: string;
}): Promise<ProjectMemoryEntry> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_memory")
    .insert({
      project_id: entry.projectId,
      memory_type: entry.memoryType,
      title: entry.title,
      summary: entry.summary ?? "",
      source_type: entry.sourceType ?? null,
      source_id: entry.sourceId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as MemoryRow);
}

export async function getProjectMemory(projectId: string): Promise<ProjectMemoryEntry[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_memory")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as MemoryRow[]).map(mapRow);
}
