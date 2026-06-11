import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { searchBrainMemory } from "./search";
import type { MemoryContextPackage, MemoryRecord } from "./types";
import { getMemoryRecordsByIds } from "./records";

const LAYER_KEYWORDS: Record<string, string[]> = {
  strategic: ["mission", "vision", "values", "policy", "objective", "goal", "structure", "strategy"],
  operational: ["sop", "procedure", "decision", "workflow", "process", "knowledge", "adr"],
  intelligence: ["analytics", "metric", "risk", "compliance", "innovation", "experiment", "lesson", "learning"],
  connectivity: ["communication", "partner", "ecosystem", "customer", "segment", "feedback"],
};

function identifyRelevantLayers(query: string): string[] {
  const lower = query.toLowerCase();
  const scores = Object.entries(LAYER_KEYWORDS).map(([slug, keywords]) => {
    const score = keywords.reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0);
    return { slug, score };
  });

  const matched = scores.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  if (matched.length) return matched.map((m) => m.slug);
  return Object.keys(LAYER_KEYWORDS);
}

function classifyByLayer(records: MemoryRecord[], layerSlug: string): MemoryRecord[] {
  return records.filter((r) => r.layerSlug === layerSlug || r.domainSlug === layerSlug);
}

export async function retrieveMemoryContext(
  query: string,
  options?: { limit?: number; requestedBy?: string | null },
): Promise<MemoryContextPackage> {
  const limit = options?.limit ?? 20;

  if (!isSupabaseConfigured()) {
    return {
      query,
      domainsSearched: [],
      records: [],
      relatedDecisions: [],
      relatedMeetings: [],
      relatedTasks: [],
      relatedDocuments: [],
      relatedAgentNotes: [],
      relatedProducts: [],
      relatedCustomers: [],
      retrievedAt: new Date().toISOString(),
    };
  }

  const domainsSearched = identifyRelevantLayers(query);

  const searchResults = await Promise.all(
    domainsSearched.slice(0, 4).map((slug) =>
      searchBrainMemory({ query, domainSlug: slug, limit: Math.ceil(limit / 2) }),
    ),
  );

  const seen = new Set<string>();
  const rankedIds: string[] = [];
  for (const batch of searchResults) {
    for (const result of batch) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        rankedIds.push(result.id);
      }
    }
  }

  if (!rankedIds.length && query.trim()) {
    const global = await searchBrainMemory({ query, limit });
    for (const result of global) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        rankedIds.push(result.id);
      }
    }
  }

  const topIds = rankedIds.slice(0, limit);
  const records = topIds.length ? await getMemoryRecordsByIds(topIds) : [];

  const supabase = createSupabaseAdmin();
  await supabase.from("brain_retrieval_logs").insert({
    query,
    domains_searched: domainsSearched,
    records_returned: records.length,
    requested_by: options?.requestedBy ?? null,
  });

  return {
    query,
    domainsSearched,
    records,
    relatedDecisions: records.filter((r) => r.sectionSlug === "company-decisions"),
    relatedMeetings: records.filter(
      (r) => r.tags.includes("meeting") || r.title.toLowerCase().includes("meeting"),
    ),
    relatedTasks: records.filter(
      (r) => r.tags.includes("task") || r.title.toLowerCase().includes("task"),
    ),
    relatedDocuments: records.filter(
      (r) => r.sectionSlug === "company-knowledge" || r.tags.includes("document"),
    ),
    relatedAgentNotes: [],
    relatedProducts: classifyByLayer(records, "strategic"),
    relatedCustomers: classifyByLayer(records, "connectivity"),
    retrievedAt: new Date().toISOString(),
  };
}
