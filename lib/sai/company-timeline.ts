import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { CompanyTimelineEvent, TimelineSeverity } from "./types";

type TimelineRow = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  project_id: string | null;
  workflow_id: string | null;
  title: string;
  description: string;
  actor: string;
  severity: TimelineSeverity;
  created_at: string;
};

export type TimelineInput = {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  workflowId?: string | null;
  title: string;
  description?: string;
  actor?: string;
  severity?: TimelineSeverity;
};

function mapRow(row: TimelineRow): CompanyTimelineEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    projectId: row.project_id,
    workflowId: row.workflow_id,
    title: row.title,
    description: row.description,
    actor: row.actor,
    severity: row.severity,
    createdAt: row.created_at,
  };
}

export async function recordCompanyTimeline(input: TimelineInput): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("company_timeline").insert({
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    project_id: input.projectId ?? null,
    workflow_id: input.workflowId ?? null,
    title: input.title,
    description: input.description ?? "",
    actor: input.actor ?? "SAI",
    severity: input.severity ?? "info",
  });

  if (error) throw new Error(error.message);
}

export type TimelineFilters = {
  projectId?: string;
  workflowId?: string;
  eventType?: string;
  severity?: TimelineSeverity;
  search?: string;
  limit?: number;
};

export async function getCompanyTimeline(filters: TimelineFilters = {}): Promise<CompanyTimelineEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("company_timeline")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.workflowId) query = query.eq("workflow_id", filters.workflowId);
  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},actor.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as TimelineRow[]).map(mapRow);
}
