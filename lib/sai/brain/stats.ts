import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { BrainStats } from "./types";

export async function getBrainStats(): Promise<BrainStats> {
  if (!isSupabaseConfigured()) {
    return {
      totalRecords: 0,
      activeRecords: 0,
      archivedRecords: 0,
      totalRelationships: 0,
      totalDomains: 0,
      totalCategories: 0,
      agentContainers: 0,
      founderMemories: 0,
      retrievalCount: 0,
    };
  }

  const supabase = createSupabaseAdmin();

  const [
    { count: totalRecords },
    { count: activeRecords },
    { count: archivedRecords },
    { count: totalRelationships },
    { count: totalDomains },
    { count: totalCategories },
    { count: agentContainers },
    { count: founderMemories },
    { count: retrievalCount },
  ] = await Promise.all([
    supabase.from("memory_records").select("*", { count: "exact", head: true }),
    supabase.from("memory_records").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("memory_records").select("*", { count: "exact", head: true }).eq("status", "archived"),
    supabase.from("memory_relationships").select("*", { count: "exact", head: true }),
    supabase.from("brain_domains").select("*", { count: "exact", head: true }),
    supabase.from("brain_categories").select("*", { count: "exact", head: true }),
    supabase.from("agent_memories").select("*", { count: "exact", head: true }),
    supabase.from("founder_memories").select("*", { count: "exact", head: true }),
    supabase.from("brain_retrieval_logs").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalRecords: totalRecords ?? 0,
    activeRecords: activeRecords ?? 0,
    archivedRecords: archivedRecords ?? 0,
    totalRelationships: totalRelationships ?? 0,
    totalDomains: totalDomains ?? 0,
    totalCategories: totalCategories ?? 0,
    agentContainers: agentContainers ?? 0,
    founderMemories: founderMemories ?? 0,
    retrievalCount: retrievalCount ?? 0,
  };
}
