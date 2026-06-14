import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { SessionDependencyType } from "./session-types";

export type SessionDependency = {
  id: string;
  sessionId: string;
  dependsOnSessionId: string;
  dependencyType: SessionDependencyType;
  reason: string;
  createdAt: string;
  /** Resolved from joined workflow_runs */
  dependsOnSessionNumber?: number | null;
  dependsOnObjective?: string | null;
  dependsOnStatus?: string | null;
};

type DependencyRow = {
  id: string;
  session_id: string;
  depends_on_session_id: string;
  dependency_type: SessionDependencyType;
  reason: string;
  created_at: string;
};

export async function getSessionDependencies(sessionId: string): Promise<{
  blockedBy: SessionDependency[];
  dependsOn: SessionDependency[];
  related: SessionDependency[];
  blocks: SessionDependency[];
}> {
  const empty = { blockedBy: [], dependsOn: [], related: [], blocks: [] };
  if (!isSupabaseConfigured()) return empty;

  const supabase = createSupabaseAdmin();

  const [incoming, outgoing] = await Promise.all([
    supabase.from("session_dependencies").select("*").eq("session_id", sessionId),
    supabase.from("session_dependencies").select("*").eq("depends_on_session_id", sessionId),
  ]);

  if (incoming.error) throw new Error(incoming.error.message);

  const enrich = async (rows: DependencyRow[], direction: "incoming" | "outgoing"): Promise<SessionDependency[]> => {
    if (!rows.length) return [];
    const sessionIds = rows.map((r) =>
      direction === "incoming" ? r.depends_on_session_id : r.session_id,
    );
    const { data: sessions } = await supabase
      .from("workflow_runs")
      .select("id, session_number, objective, session_status")
      .in("id", sessionIds);
    const byId = new Map((sessions ?? []).map((s) => [s.id as string, s]));

    return rows.map((r) => {
      const refId = direction === "incoming" ? r.depends_on_session_id : r.session_id;
      const ref = byId.get(refId);
      return {
        id: r.id,
        sessionId: r.session_id,
        dependsOnSessionId: r.depends_on_session_id,
        dependencyType: r.dependency_type,
        reason: r.reason,
        createdAt: r.created_at,
        dependsOnSessionNumber: ref?.session_number as number | null,
        dependsOnObjective: ref?.objective as string | null,
        dependsOnStatus: ref?.session_status as string | null,
      };
    });
  };

  const incomingRows = (incoming.data ?? []) as DependencyRow[];
  const outgoingRows = (outgoing.data ?? []) as DependencyRow[];

  const enrichedIncoming = await enrich(incomingRows, "incoming");
  const enrichedOutgoing = await enrich(outgoingRows, "outgoing");

  return {
    blockedBy: enrichedIncoming.filter((d) => d.dependencyType === "blocks"),
    dependsOn: enrichedIncoming.filter((d) => d.dependencyType === "depends_on"),
    related: [...enrichedIncoming, ...enrichedOutgoing].filter((d) => d.dependencyType === "related"),
    blocks: enrichedOutgoing.filter((d) => d.dependencyType === "blocks"),
  };
}

export async function addSessionDependency(input: {
  sessionId: string;
  dependsOnSessionId: string;
  dependencyType: SessionDependencyType;
  reason?: string;
}): Promise<SessionDependency> {
  if (input.sessionId === input.dependsOnSessionId) {
    throw new Error("A session cannot depend on itself");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_dependencies")
    .insert({
      session_id: input.sessionId,
      depends_on_session_id: input.dependsOnSessionId,
      dependency_type: input.dependencyType,
      reason: input.reason ?? "",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const row = data as DependencyRow;
  return {
    id: row.id,
    sessionId: row.session_id,
    dependsOnSessionId: row.depends_on_session_id,
    dependencyType: row.dependency_type,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export async function removeSessionDependency(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("session_dependencies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function isSessionBlockedByDependencies(sessionId: string): Promise<boolean> {
  const deps = await getSessionDependencies(sessionId);
  if (deps.blockedBy.length > 0) return true;

  for (const dep of deps.dependsOn) {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
      .from("workflow_runs")
      .select("session_status, status")
      .eq("id", dep.dependsOnSessionId)
      .maybeSingle();
    if (data && data.status !== "completed" && data.session_status !== "completed") {
      return true;
    }
  }
  return false;
}
