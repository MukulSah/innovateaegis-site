import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export type FounderRealtimeEventType =
  | "approval_granted"
  | "approval_rejected"
  | "handoff_created"
  | "agent_assigned"
  | "artifact_generated"
  | "task_completed"
  | "session_closed"
  | "session_reopened"
  | "escalation_created"
  | "session_status_changed";

export type FounderRealtimeEvent = {
  id: string;
  type: FounderRealtimeEventType;
  title: string;
  description: string;
  sessionId: string | null;
  projectId: string | null;
  actor: string | null;
  timestamp: string;
  entityType: string | null;
  entityId: string | null;
};

const EVENT_TYPE_MAP: Record<string, FounderRealtimeEventType> = {
  approval_approved: "approval_granted",
  approval_rejected: "approval_rejected",
  approval_requested: "approval_granted",
  auto_approved: "approval_granted",
  escalation_triggered: "escalation_created",
  session_state_reconciled: "session_status_changed",
  session_execution_halted: "session_closed",
  handoff: "handoff_created",
  artifact: "artifact_generated",
};

function mapActivityRow(row: {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  description: string | null;
  actor: string | null;
  created_at: string;
}): FounderRealtimeEvent {
  const type = EVENT_TYPE_MAP[row.action] ?? "session_status_changed";
  return {
    id: row.id,
    type,
    title: row.action.replace(/_/g, " "),
    description: row.description ?? "",
    sessionId: row.target_type === "workflow" ? row.target_id : null,
    projectId: null,
    actor: row.actor,
    timestamp: row.created_at,
    entityType: row.target_type,
    entityId: row.target_id,
  };
}

/** Poll-based sync for founder workspace — returns events since cursor timestamp. */
export async function getFounderRealtimeEvents(since?: string | null): Promise<{
  events: FounderRealtimeEvent[];
  cursor: string;
}> {
  if (!isSupabaseConfigured()) {
    return { events: [], cursor: new Date().toISOString() };
  }

  const supabase = createSupabaseAdmin();
  const cursor = new Date().toISOString();

  let query = supabase
    .from("activity_feed")
    .select("id, action, target_type, target_id, description, actor, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const events = (data ?? []).map(mapActivityRow);
  return { events, cursor };
}

/** Lightweight snapshot version for change detection during polling. */
export async function getFounderSyncVersion(): Promise<{
  version: string;
  pendingApprovals: number;
  activeSessions: number;
  lastActivityAt: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { version: "0", pendingApprovals: 0, activeSessions: 0, lastActivityAt: null };
  }

  const supabase = createSupabaseAdmin();
  const [approvals, sessions, lastActivity, queue] = await Promise.all([
    supabase.from("workflow_approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("workflow_runs").select("id", { count: "exact", head: true }).eq("status", "running"),
    supabase
      .from("activity_feed")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_retry_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "waiting", "processing"]),
  ]);

  const version = [
    approvals.count ?? 0,
    sessions.count ?? 0,
    queue.count ?? 0,
    lastActivity.data?.created_at ?? "none",
  ].join(":");

  return {
    version,
    pendingApprovals: approvals.count ?? 0,
    activeSessions: sessions.count ?? 0,
    lastActivityAt: (lastActivity.data?.created_at as string) ?? null,
  };
}
