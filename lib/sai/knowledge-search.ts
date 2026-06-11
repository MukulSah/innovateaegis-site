import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { KnowledgeSearchResult } from "./types";

export async function searchKnowledge(query: string, limit = 30): Promise<KnowledgeSearchResult[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];

  const term = `%${query.trim()}%`;
  const supabase = createSupabaseAdmin();
  const results: KnowledgeSearchResult[] = [];

  const [
    memories,
    documents,
    decisions,
    tasks,
    releases,
    projects,
    agentMemory,
    projectMemory,
  ] = await Promise.all([
    supabase
      .from("memories")
      .select("id, title, content, type, created_at")
      .or(`title.ilike.${term},content.ilike.${term}`)
      .limit(limit),
    supabase
      .from("documents")
      .select("id, title, content, type, created_at")
      .or(`title.ilike.${term},content.ilike.${term}`)
      .limit(limit),
    supabase
      .from("decisions")
      .select("id, title, decision, rationale, created_at")
      .or(`title.ilike.${term},decision.ilike.${term},rationale.ilike.${term}`)
      .limit(limit),
    supabase
      .from("tasks")
      .select("id, title, description, created_at")
      .or(`title.ilike.${term},description.ilike.${term}`)
      .limit(limit),
    supabase
      .from("releases")
      .select("id, version, title, description, created_at")
      .or(`title.ilike.${term},description.ilike.${term},version.ilike.${term}`)
      .limit(limit),
    supabase
      .from("projects")
      .select("id, name, objective, created_at")
      .or(`name.ilike.${term},objective.ilike.${term}`)
      .limit(limit),
    supabase
      .from("agent_memory")
      .select("id, title, summary, content, memory_type, created_at, agents(name)")
      .or(`title.ilike.${term},summary.ilike.${term},content.ilike.${term}`)
      .limit(limit),
    supabase
      .from("project_memory")
      .select("id, title, summary, memory_type, created_at")
      .or(`title.ilike.${term},summary.ilike.${term}`)
      .limit(limit),
  ]);

  for (const row of memories.data ?? []) {
    results.push({
      id: row.id,
      category: "memory",
      title: row.title,
      snippet: (row.content as string).slice(0, 160),
      type: row.type as string,
      createdAt: row.created_at as string,
    });
  }

  for (const row of documents.data ?? []) {
    results.push({
      id: row.id,
      category: "document",
      title: row.title,
      snippet: (row.content as string).slice(0, 160),
      type: row.type as string,
      createdAt: row.created_at as string,
    });
  }

  for (const row of decisions.data ?? []) {
    results.push({
      id: row.id,
      category: "decision",
      title: row.title,
      snippet: (row.decision as string).slice(0, 160),
      type: "decision",
      createdAt: row.created_at as string,
    });
  }

  for (const row of tasks.data ?? []) {
    results.push({
      id: row.id,
      category: "task",
      title: row.title,
      snippet: (row.description as string).slice(0, 160),
      type: "task",
      createdAt: row.created_at as string,
    });
  }

  for (const row of releases.data ?? []) {
    results.push({
      id: row.id,
      category: "release",
      title: `${row.version} — ${row.title}`,
      snippet: (row.description as string).slice(0, 160),
      type: "release",
      createdAt: row.created_at as string,
    });
  }

  for (const row of projects.data ?? []) {
    results.push({
      id: row.id,
      category: "project",
      title: row.name as string,
      snippet: (row.objective as string).slice(0, 160),
      type: "project",
      createdAt: row.created_at as string,
    });
  }

  for (const row of agentMemory.data ?? []) {
    const agent = row.agents as unknown as { name: string } | null;
    results.push({
      id: row.id,
      category: "agent_memory",
      title: `${agent?.name ?? "Agent"}: ${row.title}`,
      snippet: ((row.content ?? row.summary) as string).slice(0, 160),
      type: row.memory_type as string,
      createdAt: row.created_at as string,
    });
  }

  for (const row of projectMemory.data ?? []) {
    results.push({
      id: row.id,
      category: "project_memory",
      title: row.title as string,
      snippet: (row.summary as string).slice(0, 160),
      type: row.memory_type as string,
      createdAt: row.created_at as string,
    });
  }

  return results
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getSearchIndexSize(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createSupabaseAdmin();
  const tables = [
    "memories",
    "documents",
    "decisions",
    "tasks",
    "releases",
    "agent_memory",
    "project_memory",
  ] as const;

  let total = 0;
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (!error) total += count ?? 0;
  }
  return total;
}
