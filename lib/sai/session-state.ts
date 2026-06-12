import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionStatus } from "./types";

const COO_ALLOWED_TRANSITIONS: Record<string, SessionStatus[]> = {
  pending_coo: ["planning", "stalled"],
  planning: ["executing", "stalled"],
  blocked: ["executing", "stalled"],
  executing: ["waiting_approval", "completed", "failed", "blocked", "stalled"],
  waiting_approval: ["executing", "blocked"],
  running: ["executing", "waiting_approval", "blocked", "completed", "failed", "stalled"],
  stalled: ["recovery", "executing", "blocked"],
  recovery: ["executing", "stalled", "failed"],
};

export async function transitionSessionState(
  sessionId: string,
  from: SessionStatus,
  to: SessionStatus,
  actorAgentId: string,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: session } = await supabase
    .from("workflow_runs")
    .select("session_status, session_owner_agent_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) throw new Error("Session not found");
  if (session.session_owner_agent_id !== actorAgentId) {
    throw new Error("Only the COO session owner may transition session state");
  }

  const current = session.session_status as SessionStatus;
  if (current !== from && !(from === "running" && current === "executing")) {
    throw new Error(`Session is ${current}, expected ${from} for transition to ${to}`);
  }

  const allowed = COO_ALLOWED_TRANSITIONS[from] ?? COO_ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`COO cannot transition from ${current} to ${to}`);
  }

  const { error } = await supabase
    .from("workflow_runs")
    .update({ session_status: to })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatus | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("workflow_runs")
    .select("session_status")
    .eq("id", sessionId)
    .maybeSingle();
  return (data?.session_status as SessionStatus) ?? null;
}
