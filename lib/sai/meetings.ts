import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { createMemoryFromMeeting } from "./organizational-memory";

export type Meeting = {
  id: string;
  topic: string;
  meetingType: string;
  status: string;
  participantNames: string[];
  agenda: string;
  summary: string | null;
  scheduledAt: string | null;
  relatedProjectId: string | null;
  relatedDiscussionId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  topic: string;
  meeting_type: string;
  status: string;
  participant_names: string[];
  agenda: string;
  summary: string | null;
  scheduled_at: string | null;
  related_project_id: string | null;
  related_discussion_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): Meeting {
  return {
    id: row.id,
    topic: row.topic,
    meetingType: row.meeting_type,
    status: row.status,
    participantNames: row.participant_names ?? [],
    agenda: row.agenda,
    summary: row.summary,
    scheduledAt: row.scheduled_at,
    relatedProjectId: row.related_project_id,
    relatedDiscussionId: row.related_discussion_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMeetings(filters?: { status?: string }): Promise<Meeting[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase.from("meetings").select("*").order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as Row[]).map(mapRow);
}

export async function createMeeting(input: {
  topic: string;
  meetingType?: string;
  participantAgentIds?: string[];
  participantNames?: string[];
  agenda?: string;
  scheduledAt?: string;
  relatedProjectId?: string;
  relatedDiscussionId?: string;
  createdBy?: string;
}): Promise<Meeting> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      topic: input.topic.trim(),
      meeting_type: input.meetingType ?? "custom",
      participant_agent_ids: input.participantAgentIds ?? [],
      participant_names: input.participantNames ?? [],
      agenda: input.agenda ?? "",
      scheduled_at: input.scheduledAt ?? null,
      related_project_id: input.relatedProjectId ?? null,
      related_discussion_id: input.relatedDiscussionId ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

export async function completeMeeting(
  id: string,
  input: { summary?: string; notes?: string; discussion?: string },
): Promise<Meeting> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("meetings")
    .update({
      status: "completed",
      summary: input.summary,
      notes: input.notes,
      discussion: input.discussion,
      ended_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await createMemoryFromMeeting(id);
  return mapRow(data as Row);
}
