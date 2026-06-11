import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { MemoryActivity } from "./types";

type ActivityRow = {
  id: string;
  record_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

function mapActivity(row: ActivityRow): MemoryActivity {
  return {
    id: row.id,
    recordId: row.record_id,
    actorId: row.actor_id,
    action: row.action,
    details: row.details ?? {},
    createdAt: row.created_at,
  };
}

export async function logMemoryActivity(
  recordId: string,
  actorId: string | null,
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("memory_activities").insert({
    record_id: recordId,
    actor_id: actorId,
    action,
    details,
  });
}

export async function getMemoryActivities(recordId: string): Promise<MemoryActivity[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_activities")
    .select("*")
    .eq("record_id", recordId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ActivityRow[]).map(mapActivity);
}
