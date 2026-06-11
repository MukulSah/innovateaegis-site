import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { WorkflowEvent } from "./types";

type WorkflowEventRow = {
  id: string;
  workflow_id: string;
  event_type: string;
  actor: string;
  title: string;
  description: string;
  created_at: string;
};

export type WorkflowEventInput = {
  workflowId: string;
  eventType: string;
  actor: string;
  title: string;
  description?: string;
};

function mapRow(row: WorkflowEventRow): WorkflowEvent {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    eventType: row.event_type,
    actor: row.actor,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
  };
}

export async function recordWorkflowEvent(input: WorkflowEventInput): Promise<WorkflowEvent> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_events")
    .insert({
      workflow_id: input.workflowId,
      event_type: input.eventType,
      actor: input.actor,
      title: input.title,
      description: input.description ?? "",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as WorkflowEventRow);
}

export async function getWorkflowEvents(
  workflowId: string,
  limit = 100,
): Promise<WorkflowEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_events")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as WorkflowEventRow[]).map(mapRow);
}

export async function getRecentWorkflowEvents(limit = 50): Promise<WorkflowEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as WorkflowEventRow[]).map(mapRow);
}
