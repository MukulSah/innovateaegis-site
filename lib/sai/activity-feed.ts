import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ActivityFeedEntry } from "./types";

type ActivityFeedRow = {
  id: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string | null;
  description: string;
  created_at: string;
};

export type ActivityFeedInput = {
  actor: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  description?: string;
};

function mapRow(row: ActivityFeedRow): ActivityFeedEntry {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    description: row.description,
    createdAt: row.created_at,
  };
}

export async function recordActivityFeed(input: ActivityFeedInput): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("activity_feed").insert({
    actor: input.actor.trim(),
    action: input.action.trim(),
    target_type: input.targetType.trim(),
    target_id: input.targetId ?? null,
    description: input.description?.trim() ?? "",
  });

  if (error) throw new Error(error.message);
}

export async function getActivityFeed(limit = 50): Promise<ActivityFeedEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as ActivityFeedRow[]).map(mapRow);
}

export async function getActivityFeedByTarget(
  targetType: string,
  targetId: string,
  limit = 30,
): Promise<ActivityFeedEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_feed")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as ActivityFeedRow[]).map(mapRow);
}

export async function getActivityFeedByActor(actor: string, limit = 30): Promise<ActivityFeedEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_feed")
    .select("*")
    .eq("actor", actor)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as ActivityFeedRow[]).map(mapRow);
}
