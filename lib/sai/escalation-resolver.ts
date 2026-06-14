import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionStateView } from "./session-state-view";
import { updateSessionFields } from "./session-manager";
import type { SessionEscalation } from "./types";

type EscalationRow = {
  id: string;
  workflow_run_id: string;
  issue: string;
  owner: string;
  priority: string;
  status: string;
  created_by_agent_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

function mapEscalation(row: EscalationRow): SessionEscalation {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    issue: row.issue,
    owner: row.owner,
    priority: row.priority as SessionEscalation["priority"],
    status: row.status as SessionEscalation["status"],
    createdByAgentId: row.created_by_agent_id,
    createdAt: row.created_at,
  };
}

/** Close open escalations when session has active agents and is progressing. */
export async function resolveStaleEscalations(sessionId: string): Promise<number> {
  const state = await getSessionStateView(sessionId);
  if (!state) return 0;

  const progressing =
    Boolean(state.currentAgentId || state.nextAgentId) &&
    ["executing", "running", "waiting_approval", "planning"].includes(state.sessionStatus);

  if (!progressing) return 0;

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: openRows } = await supabase
    .from("session_escalations")
    .select("id")
    .eq("workflow_run_id", sessionId)
    .eq("status", "open");

  if (!openRows?.length) return 0;

  await supabase
    .from("session_escalations")
    .update({ status: "resolved", resolved_at: now })
    .eq("workflow_run_id", sessionId)
    .eq("status", "open");

  if (state.sessionStatus === "stalled" && state.currentAgentId) {
    await updateSessionFields(sessionId, { sessionStatus: "executing" });
  }

  return openRows.length;
}

export async function getSessionEscalations(
  sessionIds: string[],
  status: "open" | "resolved" | "dismissed" = "open",
  limit = 20,
): Promise<SessionEscalation[]> {
  if (sessionIds.length === 0) return [];

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("session_escalations")
    .select("*")
    .in("workflow_run_id", sessionIds)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as EscalationRow[] | null)?.map(mapEscalation) ?? [];
}
