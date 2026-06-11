import type { IntelligenceType } from "./types";

/** Pre-migration 015 column name and card_type values */
export const LEGACY_TYPE_COLUMN = "card_type";

export const LEGACY_TO_NEW: Record<string, IntelligenceType> = {
  priority: "current_priority",
  decision: "pending_decision",
  opportunity: "strategic_opportunity",
  recommendation: "executive_recommendation",
  health_signal: "health_signal",
};

export const NEW_TO_LEGACY: Partial<Record<IntelligenceType, string>> = {
  current_priority: "priority",
  pending_decision: "decision",
  strategic_opportunity: "opportunity",
  innovation_opportunity: "opportunity",
  market_insight: "opportunity",
  customer_insight: "opportunity",
  executive_recommendation: "recommendation",
  executive_briefing: "recommendation",
  risk_alert: "health_signal",
  project_alert: "health_signal",
  operational_alert: "health_signal",
  escalation: "health_signal",
  health_signal: "health_signal",
};

export function toIntelligenceType(raw: string): IntelligenceType {
  return (LEGACY_TO_NEW[raw] ?? raw) as IntelligenceType;
}

export function toLegacyCardType(type: IntelligenceType): string {
  return NEW_TO_LEGACY[type] ?? "recommendation";
}

export function matchesTypeFilter(rowType: string, filters: IntelligenceType[]): boolean {
  const normalized = toIntelligenceType(rowType);
  return filters.includes(normalized);
}

type RawRow = Record<string, unknown>;

export function readTypeColumn(row: RawRow): string {
  if (typeof row.intelligence_type === "string") return row.intelligence_type;
  if (typeof row.card_type === "string") return row.card_type;
  return "executive_recommendation";
}

let schemaCache: "v3" | "legacy" | null = null;

export async function getIntelligenceSchema(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdmin>,
): Promise<"v3" | "legacy"> {
  if (schemaCache) return schemaCache;

  const { error: v3Error } = await supabase
    .from("agent_intelligence")
    .select("intelligence_type")
    .limit(1);

  if (!v3Error) {
    schemaCache = "v3";
    return "v3";
  }

  const { error: legacyError } = await supabase
    .from("agent_intelligence")
    .select("card_type")
    .limit(1);

  if (!legacyError) {
    schemaCache = "legacy";
    return "legacy";
  }

  throw new Error(v3Error.message);
}

export function resetSchemaCache(): void {
  schemaCache = null;
}
