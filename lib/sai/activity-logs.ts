import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import type { ActivityLog } from "./types";

type ActivityLogRow = {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export type ActivityLogInput = {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string | null;
};

function mapRow(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
  };
}

export async function recordActivity(input: ActivityLogInput): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("activity_logs").insert({
    actor: input.actor.trim(),
    action: input.action.trim(),
    entity_type: input.entityType.trim(),
    entity_id: input.entityId ?? null,
  });

  if (error) throw new Error(error.message);

  await recordActivityFeed({
    actor: input.actor.trim(),
    action: input.action.trim(),
    targetType: input.entityType.trim(),
    targetId: input.entityId ?? null,
    description: input.action.trim(),
  });
}

export async function getActivityLogs(limit = 50): Promise<ActivityLog[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as ActivityLogRow[]).map(mapRow);
}

export async function getActivityLogById(id: string): Promise<ActivityLog | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as ActivityLogRow) : null;
}

export async function createActivityLog(input: ActivityLogInput): Promise<ActivityLog> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      actor: input.actor.trim(),
      action: input.action.trim(),
      entity_type: input.entityType.trim(),
      entity_id: input.entityId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as ActivityLogRow);
}

export async function deleteActivityLog(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("activity_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function validateActivityLogInput(body: unknown): ActivityLogInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const actor = typeof data.actor === "string" ? data.actor.trim() : "";
  const action = typeof data.action === "string" ? data.action.trim() : "";
  const entityType = typeof data.entityType === "string" ? data.entityType.trim() : "";

  if (!actor || !action || !entityType) return null;

  return {
    actor,
    action,
    entityType,
    entityId: typeof data.entityId === "string" ? data.entityId : null,
  };
}
