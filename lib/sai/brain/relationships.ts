import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { logMemoryActivity } from "./activities";
import type { KnowledgeGraph, MemoryRelationship, RelationshipType } from "./types";

type RelationshipRow = {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: RelationshipType;
  label: string | null;
  created_by: string | null;
  created_at: string;
  source?: { title: string; brain_domains: { slug: string; name: string } | null } | null;
  target?: { title: string; brain_domains: { slug: string; name: string } | null } | null;
};

const relSelect = `
  *,
  source:memory_records!memory_relationships_source_id_fkey(title, brain_domains(slug, name)),
  target:memory_records!memory_relationships_target_id_fkey(title, brain_domains(slug, name))
`;

function mapRelationship(row: RelationshipRow): MemoryRelationship {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    relationshipType: row.relationship_type,
    label: row.label,
    createdBy: row.created_by,
    createdAt: row.created_at,
    sourceTitle: row.source?.title,
    targetTitle: row.target?.title,
    sourceDomain: row.source?.brain_domains?.name,
    targetDomain: row.target?.brain_domains?.name,
  };
}

export async function getRecordRelationships(recordId: string): Promise<MemoryRelationship[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_relationships")
    .select(relSelect)
    .or(`source_id.eq.${recordId},target_id.eq.${recordId}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as RelationshipRow[]).map(mapRelationship);
}

export async function createRelationship(input: {
  sourceId: string;
  targetId: string;
  relationshipType?: RelationshipType;
  label?: string;
  createdBy?: string | null;
}): Promise<MemoryRelationship> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_relationships")
    .insert({
      source_id: input.sourceId,
      target_id: input.targetId,
      relationship_type: input.relationshipType ?? "related_to",
      label: input.label ?? null,
      created_by: input.createdBy ?? null,
    })
    .select(relSelect)
    .single();

  if (error) throw new Error(error.message);

  await logMemoryActivity(input.sourceId, input.createdBy ?? null, "relationship_added", {
    targetId: input.targetId,
    type: input.relationshipType ?? "related_to",
  });

  return mapRelationship(data as RelationshipRow);
}

export async function deleteRelationship(id: string, actorId?: string | null): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: rel } = await supabase
    .from("memory_relationships")
    .select("source_id, target_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("memory_relationships").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (rel) {
    await logMemoryActivity(rel.source_id, actorId ?? null, "relationship_removed", {
      targetId: rel.target_id,
    });
  }
}

export async function buildKnowledgeGraph(
  centerId: string,
  depth = 2,
): Promise<KnowledgeGraph> {
  if (!isSupabaseConfigured()) {
    return { centerId, nodes: [], edges: [] };
  }

  const supabase = createSupabaseAdmin();
  const visited = new Set<string>();
  const edges: KnowledgeGraph["edges"] = [];
  const nodeMap = new Map<string, KnowledgeGraph["nodes"][0]>();
  let frontier = [centerId];

  for (let level = 0; level <= depth && frontier.length; level++) {
    const nextFrontier: string[] = [];

    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);

      const { data: record } = await supabase
        .from("memory_records")
        .select("id, title, brain_domains(slug, name)")
        .eq("id", id)
        .maybeSingle();

      if (record) {
        const rawDomain = record.brain_domains as
          | { slug: string; name: string }
          | { slug: string; name: string }[]
          | null;
        const domain = Array.isArray(rawDomain) ? rawDomain[0] : rawDomain;
        nodeMap.set(id, {
          id,
          title: record.title,
          domainSlug: domain?.slug ?? "",
          domainName: domain?.name ?? "",
          level,
        });
      }
    }

    if (!frontier.length) break;

    const { data: rels } = await supabase
      .from("memory_relationships")
      .select("id, source_id, target_id, relationship_type, label")
      .or(frontier.map((id) => `source_id.eq.${id},target_id.eq.${id}`).join(","));

    for (const rel of rels ?? []) {
      edges.push({
        id: rel.id,
        sourceId: rel.source_id,
        targetId: rel.target_id,
        relationshipType: rel.relationship_type as RelationshipType,
        label: rel.label,
      });

      if (!visited.has(rel.source_id)) nextFrontier.push(rel.source_id);
      if (!visited.has(rel.target_id)) nextFrontier.push(rel.target_id);
    }

    frontier = nextFrontier;
  }

  return {
    centerId,
    nodes: [...nodeMap.values()],
    edges,
  };
}
