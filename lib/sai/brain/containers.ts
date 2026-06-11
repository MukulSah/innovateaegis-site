import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentMemoryContainer, FounderMemory } from "./types";

type AgentContainerRow = {
  id: string;
  agent_role: string;
  display_name: string;
  description: string;
  category_id: string | null;
  domain_id: string | null;
  created_at: string;
  updated_at: string;
};

type FounderMemoryRow = {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  created_by: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export async function getAgentMemoryContainers(): Promise<AgentMemoryContainer[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_memories")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) throw new Error(error.message);

  const containers = data as AgentContainerRow[];
  const categoryIds = containers.map((c) => c.category_id).filter(Boolean) as string[];

  let recordCounts = new Map<string, number>();
  if (categoryIds.length) {
    const { data: records } = await supabase
      .from("memory_records")
      .select("category_id")
      .in("category_id", categoryIds)
      .eq("status", "active");

    for (const row of records ?? []) {
      if (row.category_id) {
        recordCounts.set(row.category_id, (recordCounts.get(row.category_id) ?? 0) + 1);
      }
    }
  }

  return containers.map((row) => ({
    id: row.id,
    agentRole: row.agent_role,
    displayName: row.display_name,
    description: row.description,
    categoryId: row.category_id,
    domainId: row.domain_id,
    recordCount: row.category_id ? recordCounts.get(row.category_id) ?? 0 : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getFounderMemories(filters?: {
  category?: string;
  status?: string;
}): Promise<FounderMemory[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("founder_memories")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.status) query = query.eq("status", filters.status);
  else query = query.eq("status", "active");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data as FounderMemoryRow[]).map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    createdBy: row.created_by,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createFounderMemory(input: {
  category: string;
  title: string;
  content?: string;
  tags?: string[];
  createdBy?: string | null;
}): Promise<FounderMemory> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("founder_memories")
    .insert({
      category: input.category,
      title: input.title.trim(),
      content: input.content?.trim() ?? "",
      tags: input.tags ?? [],
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const row = data as FounderMemoryRow;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    createdBy: row.created_by,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateFounderMemory(
  id: string,
  input: Partial<{ category: string; title: string; content: string; tags: string[]; status: string }>,
): Promise<FounderMemory> {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (input.category !== undefined) patch.category = input.category;
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.content !== undefined) patch.content = input.content.trim();
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from("founder_memories")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const row = data as FounderMemoryRow;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    createdBy: row.created_by,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteFounderMemory(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("founder_memories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
