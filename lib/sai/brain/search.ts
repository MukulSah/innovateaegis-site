import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { BrainSearchResult } from "./types";

export type BrainSearchFilters = {
  query?: string;
  domainSlug?: string;
  categoryId?: string;
  tag?: string;
  ownerId?: string;
  dateFrom?: string;
  dateTo?: string;
  relatedToId?: string;
  status?: string;
  limit?: number;
};

function scoreMatch(
  query: string,
  title: string,
  description: string,
  content: string,
  tags: string[],
): number {
  const q = query.toLowerCase();
  let score = 0;
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const c = content.toLowerCase();

  if (t === q) score += 100;
  else if (t.includes(q)) score += 50;
  if (d.includes(q)) score += 20;
  if (c.includes(q)) score += 10;
  for (const tag of tags) {
    if (tag.toLowerCase().includes(q)) score += 15;
  }
  return score;
}

export async function searchBrainMemory(
  filters: BrainSearchFilters = {},
): Promise<BrainSearchResult[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const limit = filters.limit ?? 50;

  let domainId: string | undefined;
  if (filters.domainSlug) {
    const { data: domain } = await supabase
      .from("brain_domains")
      .select("id")
      .eq("slug", filters.domainSlug)
      .maybeSingle();
    domainId = domain?.id;
    if (!domainId) return [];
  }

  let recordIds: Set<string> | undefined;

  if (filters.relatedToId) {
    const { data: rels } = await supabase
      .from("memory_relationships")
      .select("source_id, target_id")
      .or(`source_id.eq.${filters.relatedToId},target_id.eq.${filters.relatedToId}`);

    recordIds = new Set<string>();
    for (const rel of rels ?? []) {
      if (rel.source_id !== filters.relatedToId) recordIds.add(rel.source_id);
      if (rel.target_id !== filters.relatedToId) recordIds.add(rel.target_id);
    }
    if (!recordIds.size) return [];
  }

  if (filters.tag) {
    const { data: tagRows } = await supabase
      .from("memory_tags")
      .select("record_id")
      .eq("tag", filters.tag.toLowerCase());

    const tagIds = new Set((tagRows ?? []).map((r) => r.record_id));
    if (recordIds) {
      recordIds = new Set([...recordIds].filter((id) => tagIds.has(id)));
    } else {
      recordIds = tagIds;
    }
    if (!recordIds.size) return [];
  }

  let query = supabase
    .from("memory_records")
    .select("id, title, description, content, permission_level, updated_at, brain_domains(slug, name), ai_summary")
    .eq("status", filters.status ?? "active")
    .order("updated_at", { ascending: false })
    .limit(limit * 2);

  if (domainId) query = query.eq("domain_id", domainId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.dateFrom) query = query.gte("updated_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("updated_at", filters.dateTo);

  if (filters.query?.trim()) {
    const term = `%${filters.query.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},content.ilike.${term},ai_summary.ilike.${term}`);
  }

  if (recordIds) {
    query = query.in("id", [...recordIds]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const ids = data.map((r) => r.id);
  const { data: allTags } = await supabase
    .from("memory_tags")
    .select("record_id, tag")
    .in("record_id", ids);

  const tagMap = new Map<string, string[]>();
  for (const row of allTags ?? []) {
    const list = tagMap.get(row.record_id) ?? [];
    list.push(row.tag);
    tagMap.set(row.record_id, list);
  }

  const { data: relCounts } = await supabase
    .from("memory_relationships")
    .select("source_id, target_id")
    .or(ids.map((id) => `source_id.eq.${id},target_id.eq.${id}`).join(","));

  const relatedCount = new Map<string, number>();
  for (const rel of relCounts ?? []) {
    for (const id of [rel.source_id, rel.target_id]) {
      if (ids.includes(id)) {
        relatedCount.set(id, (relatedCount.get(id) ?? 0) + 1);
      }
    }
  }

  const q = filters.query?.trim() ?? "";

  const results: BrainSearchResult[] = data.map((row) => {
    const rawDomain = row.brain_domains as
      | { slug: string; name: string }
      | { slug: string; name: string }[]
      | null;
    const domain = Array.isArray(rawDomain) ? rawDomain[0] : rawDomain;
    const tags = tagMap.get(row.id) ?? [];
    const summary =
      row.ai_summary ||
      row.description ||
      row.content.slice(0, 200) + (row.content.length > 200 ? "…" : "");

    return {
      id: row.id,
      title: row.title,
      domainSlug: domain?.slug ?? "",
      domainName: domain?.name ?? "",
      summary,
      permissionLevel: row.permission_level,
      tags,
      relatedCount: relatedCount.get(row.id) ?? 0,
      updatedAt: row.updated_at,
      score: q ? scoreMatch(q, row.title, row.description, row.content, tags) : 1,
    };
  });

  return results
    .sort((a, b) => b.score - a.score || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
