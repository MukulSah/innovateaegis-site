import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivity } from "./activity-logs";
import type { CompanyMemory, MemoryType } from "./types";

type MemoryRow = {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  project_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  projects?: { name: string } | null;
};

export type MemoryInput = {
  title: string;
  content: string;
  type: MemoryType;
  projectId?: string | null;
  createdBy?: string;
};

export type MemoryFilters = {
  type?: MemoryType;
  projectId?: string;
  search?: string;
};

const memorySelect = `*, projects(name)`;

function mapRow(row: MemoryRow): CompanyMemory {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInput(input: MemoryInput) {
  return {
    title: input.title.trim(),
    content: input.content.trim(),
    type: input.type,
    project_id: input.projectId ?? null,
    created_by: input.createdBy?.trim() || "SAI",
  };
}

export async function getMemories(filters: MemoryFilters = {}, limit = 100): Promise<CompanyMemory[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase.from("memories").select(memorySelect).order("created_at", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},content.ilike.${term}`);
  }

  const { data, error } = await query.limit(limit);
  if (error) throw new Error(error.message);
  return (data as MemoryRow[]).map(mapRow);
}

export async function getMemoryById(id: string): Promise<CompanyMemory | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memories")
    .select(memorySelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as MemoryRow) : null;
}

export async function getMemoryCountsByType(): Promise<Record<MemoryType, number>> {
  const counts = Object.fromEntries(
    [
      "product", "engineering", "customer", "decision", "business",
      "process", "research", "release", "meeting", "sales", "risk",
      "security", "operations", "finance", "legal", "support",
      "incident", "compliance", "training",
    ].map((t) => [t, 0]),
  ) as Record<MemoryType, number>;

  if (!isSupabaseConfigured()) return counts;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("memories").select("type");
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const type = row.type as MemoryType;
    if (type in counts) counts[type] += 1;
  }

  return counts;
}

export async function createMemory(input: MemoryInput): Promise<CompanyMemory> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memories")
    .insert(mapInput(input))
    .select(memorySelect)
    .single();

  if (error) throw new Error(error.message);
  const memory = mapRow(data as MemoryRow);

  await recordActivity({
    actor: memory.createdBy,
    action: `Memory created: ${memory.title}`,
    entityType: "memory",
    entityId: memory.id,
  });

  return memory;
}

export async function updateMemory(id: string, input: MemoryInput): Promise<CompanyMemory> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memories")
    .update(mapInput(input))
    .eq("id", id)
    .select(memorySelect)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as MemoryRow);
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function validateMemoryInput(body: unknown): MemoryInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const types: MemoryType[] = [
    "product", "engineering", "customer", "decision", "business",
    "process", "research", "release", "meeting", "sales", "risk",
    "security", "operations", "finance", "legal", "support",
    "incident", "compliance", "training",
  ];
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const type = data.type as MemoryType;

  if (!title || !types.includes(type)) return null;

  return {
    title,
    content: typeof data.content === "string" ? data.content : "",
    type,
    projectId: typeof data.projectId === "string" && data.projectId ? data.projectId : null,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
  };
}
