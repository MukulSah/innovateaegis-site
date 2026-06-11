import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { ProjectTimelineEvent } from "./types";

type TimelineRow = {
  id: string;
  project_id: string;
  event_type: string;
  title: string;
  description: string;
  actor_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function mapRow(row: TimelineRow): ProjectTimelineEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    actorName: row.actor_name,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function addTimelineEvent(event: {
  projectId: string;
  eventType: string;
  title: string;
  description?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("project_timeline").insert({
    project_id: event.projectId,
    event_type: event.eventType,
    title: event.title,
    description: event.description ?? "",
    actor_name: event.actorName ?? "SAI",
    metadata: event.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function getProjectTimeline(projectId: string): Promise<ProjectTimelineEvent[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_timeline")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TimelineRow[]).map(mapRow);
}
