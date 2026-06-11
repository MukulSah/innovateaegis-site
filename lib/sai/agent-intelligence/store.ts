import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  AgentIntelligenceRecord,
  IntelligenceInput,
  IntelligenceStatus,
  IntelligenceType,
} from "./types";
import { ACTIVE_INTELLIGENCE_STATUSES, defaultTtlDays } from "./types";
import {
  getIntelligenceSchema,
  matchesTypeFilter,
  readTypeColumn,
  toIntelligenceType,
  toLegacyCardType,
} from "./schema";

function mapRow(row: Record<string, unknown>): AgentIntelligenceRecord {
  const relatedProjectIds = Array.isArray(row.related_project_ids)
    ? (row.related_project_ids as string[])
    : [];
  const legacyProjectId = row.related_project_id as string | null;
  const projectIds = [
    ...relatedProjectIds,
    ...(legacyProjectId ? [legacyProjectId] : []),
  ];

  const metadata = (row.metadata as Record<string, unknown>) ?? {};
  const description = typeof row.description === "string" ? row.description : "";
  const summary = typeof row.summary === "string" && row.summary ? row.summary : description;
  const reasoning =
    typeof row.reasoning === "string" && row.reasoning
      ? row.reasoning
      : typeof metadata.reasoning === "string"
        ? metadata.reasoning
        : "";
  const recommendation =
    typeof row.recommendation_text === "string" && row.recommendation_text
      ? row.recommendation_text
      : typeof metadata.recommendation === "string"
        ? metadata.recommendation
        : "";

  return {
    id: row.id as string,
    agentId: (row.raised_by_agent_id as string | null) ?? null,
    agentName: (row.raised_by_name as string) ?? "",
    intelligenceType: toIntelligenceType(readTypeColumn(row)),
    title: row.title as string,
    summary,
    reasoning,
    recommendation,
    confidence: (row.confidence as number | null) ?? null,
    priority: ((row.priority as string) ?? "medium") as AgentIntelligenceRecord["priority"],
    impact: ((row.impact as string) ?? "medium") as AgentIntelligenceRecord["impact"],
    status: row.status as IntelligenceStatus,
    relatedProjectIds: [...new Set(projectIds)],
    relatedDecisionIds: Array.isArray(row.related_decision_ids)
      ? (row.related_decision_ids as string[])
      : [],
    relatedMeetingIds: Array.isArray(row.related_meeting_ids)
      ? (row.related_meeting_ids as string[])
      : [],
    relatedMemoryIds: Array.isArray(row.related_memory_ids)
      ? (row.related_memory_ids as string[])
      : [],
    metadata,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    expiresAt: (row.expires_at as string | null) ?? null,
  };
}

function computeExpiresAt(input: IntelligenceInput): string | null {
  if (input.expiresAt) return input.expiresAt;
  const days = input.ttlDays ?? defaultTtlDays(input.intelligenceType);
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires.toISOString();
}

function buildInsertPayload(input: IntelligenceInput, schema: "v3" | "legacy") {
  const primaryProjectId = input.relatedProjectIds?.[0] ?? null;
  const expiresAt = computeExpiresAt(input);
  const baseMetadata = {
    ...(input.metadata ?? {}),
    reasoning: input.reasoning.trim(),
    recommendation: input.recommendation.trim(),
    intelligenceType: input.intelligenceType,
    expiresAt,
  };

  if (schema === "v3") {
    return {
      intelligence_type: input.intelligenceType,
      raised_by_agent_id: input.agentId,
      raised_by_name: input.agentName,
      title: input.title.trim(),
      description: input.summary.trim(),
      summary: input.summary.trim(),
      reasoning: input.reasoning.trim(),
      recommendation_text: input.recommendation.trim(),
      impact: input.impact ?? "medium",
      priority: input.priority ?? "medium",
      status: input.status ?? "open",
      confidence: input.confidence ?? null,
      metadata: baseMetadata,
      related_project_id: primaryProjectId,
      related_project_ids: input.relatedProjectIds ?? [],
      related_decision_ids: input.relatedDecisionIds ?? [],
      related_meeting_ids: input.relatedMeetingIds ?? [],
      related_memory_ids: input.relatedMemoryIds ?? [],
      expires_at: expiresAt,
    };
  }

  return {
    card_type: toLegacyCardType(input.intelligenceType),
    raised_by_agent_id: input.agentId,
    raised_by_name: input.agentName,
    title: input.title.trim(),
    description: input.summary.trim(),
    impact: input.impact ?? "medium",
    status: input.status ?? "open",
    confidence: input.confidence ?? null,
    metadata: baseMetadata,
    related_project_id: primaryProjectId,
  };
}

export async function storeIntelligenceRecord(
  input: IntelligenceInput,
): Promise<AgentIntelligenceRecord> {
  const supabase = createSupabaseAdmin();
  const schema = await getIntelligenceSchema(supabase);

  const { data, error } = await supabase
    .from("agent_intelligence")
    .insert(buildInsertPayload(input, schema) as Record<string, unknown>)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function storeIntelligenceBatch(
  inputs: IntelligenceInput[],
): Promise<AgentIntelligenceRecord[]> {
  const results: AgentIntelligenceRecord[] = [];
  for (const input of inputs) {
    results.push(await storeIntelligenceRecord(input));
  }
  return results;
}

export async function clearAgentOpenIntelligence(agentId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseAdmin();
  const schema = await getIntelligenceSchema(supabase);

  let query = supabase
    .from("agent_intelligence")
    .update({ status: "archived" })
    .eq("raised_by_agent_id", agentId)
    .in("status", ACTIVE_INTELLIGENCE_STATUSES);

  if (schema === "v3") {
    query = query.neq("intelligence_type", "executive_briefing");
  }

  await query;
}

export async function getActiveIntelligence(filters?: {
  types?: IntelligenceType[];
  agentId?: string;
  limit?: number;
}): Promise<AgentIntelligenceRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const now = Date.now();

  let query = supabase
    .from("agent_intelligence")
    .select("*")
    .in("status", ACTIVE_INTELLIGENCE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 100);

  if (filters?.agentId) query = query.eq("raised_by_agent_id", filters.agentId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as Record<string, unknown>[];

  if (filters?.types?.length) {
    rows = rows.filter((row) => matchesTypeFilter(readTypeColumn(row), filters.types!));
  }

  return rows
    .filter((row) => {
      const expiresAt = row.expires_at as string | null | undefined;
      const metaExpires = (row.metadata as Record<string, unknown>)?.expiresAt as
        | string
        | undefined;
      const expiry = expiresAt ?? metaExpires;
      return !expiry || new Date(expiry).getTime() > now;
    })
    .slice(0, filters?.limit ?? 50)
    .map(mapRow);
}

export async function getLatestExecutiveBriefing(): Promise<AgentIntelligenceRecord | null> {
  const records = await getActiveIntelligence({
    types: ["executive_briefing"],
    limit: 1,
  });
  return records[0] ?? null;
}

export async function archiveExpiredIntelligence(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createSupabaseAdmin();
  const schema = await getIntelligenceSchema(supabase);

  if (schema === "legacy") {
    return 0;
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("agent_intelligence")
    .update({ status: "expired" })
    .in("status", ACTIVE_INTELLIGENCE_STATUSES)
    .not("expires_at", "is", null)
    .lt("expires_at", now)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function archiveExecutiveBriefings(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseAdmin();
  const schema = await getIntelligenceSchema(supabase);

  if (schema === "v3") {
    await supabase
      .from("agent_intelligence")
      .update({ status: "archived" })
      .eq("intelligence_type", "executive_briefing")
      .in("status", ACTIVE_INTELLIGENCE_STATUSES);
    return;
  }

  const { data } = await supabase
    .from("agent_intelligence")
    .select("*")
    .eq("card_type", "recommendation")
    .in("status", ACTIVE_INTELLIGENCE_STATUSES);

  const briefingIds = (data ?? [])
    .filter((row) => {
      const meta = row.metadata as Record<string, unknown> | null;
      return meta?.intelligenceType === "executive_briefing" || meta?.briefing;
    })
    .map((row) => row.id as string);

  if (briefingIds.length > 0) {
    await supabase
      .from("agent_intelligence")
      .update({ status: "archived" })
      .in("id", briefingIds);
  }
}
