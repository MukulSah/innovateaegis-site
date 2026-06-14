import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { addProjectMemory } from "./project-memory";
import { getSessionArtifacts } from "./session-artifacts";
import type { SessionStatus, WorkflowRun } from "./types";
import { getWorkflowRunById } from "./workflows";

type SessionRow = {
  id: string;
  project_id: string;
  session_number: number | null;
  executive_sponsor_agent_id: string | null;
  session_owner_agent_id: string | null;
  current_stage: string | null;
  session_status: SessionStatus;
  status: string;
  objective: string;
  completed_at?: string | null;
  updated_at?: string | null;
};

export async function getNextSessionNumber(projectId: string): Promise<number> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("workflow_runs")
    .select("session_number")
    .eq("project_id", projectId)
    .order("session_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.session_number ?? 0) + 1;
}

export async function getActiveSession(projectId: string): Promise<WorkflowRun | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "running")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return getWorkflowRunById(data.id);
}

export async function assertNoActiveSession(projectId: string): Promise<void> {
  const { assertCanStartNewSession } = await import("./session-recovery");
  await assertCanStartNewSession(projectId);
}

export async function touchSessionActivity(workflowRunId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("workflow_runs")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", workflowRunId);
}

export async function resolveExecutiveAgents(): Promise<{
  ceo: { id: string; name: string } | null;
  coo: { id: string; name: string } | null;
}> {
  const agents = await getAgents();
  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  return {
    ceo: ceo ? { id: ceo.id, name: ceo.name } : null,
    coo: coo ? { id: coo.id, name: coo.name } : null,
  };
}

export async function updateSessionFields(
  workflowRunId: string,
  fields: Partial<{
    sessionStatus: SessionStatus;
    currentStage: string;
    strategicBrief: Record<string, unknown>;
    sessionNumber: number;
    executiveSponsorAgentId: string;
    sessionOwnerAgentId: string;
  }>,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const payload: Record<string, unknown> = {};

  if (fields.sessionStatus) payload.session_status = fields.sessionStatus;
  if (fields.currentStage) payload.current_stage = fields.currentStage;
  if (fields.strategicBrief) payload.strategic_brief = fields.strategicBrief;
  if (fields.sessionNumber) payload.session_number = fields.sessionNumber;
  if (fields.executiveSponsorAgentId) payload.executive_sponsor_agent_id = fields.executiveSponsorAgentId;
  if (fields.sessionOwnerAgentId) payload.session_owner_agent_id = fields.sessionOwnerAgentId;

  const { error } = await supabase.from("workflow_runs").update(payload).eq("id", workflowRunId);
  if (error) throw new Error(error.message);
}

export async function closeSession(
  workflowRunId: string,
  projectId: string,
): Promise<{ closed: boolean; sessionStatus: SessionStatus }> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const artifacts = await getSessionArtifacts(workflowRunId);

  const { applySessionCompletionValidation } = await import("./session-completion-validation");
  const validationResult = await applySessionCompletionValidation(workflowRunId);

  if (!validationResult.closed) {
    await supabase
      .from("orchestration_runs")
      .update({ status: "PAUSED", completed_at: null })
      .eq("workflow_id", workflowRunId);

    await addProjectMemory({
      projectId,
      memoryType: "lesson",
      title: `Session #${workflowRunId.slice(0, 8)} requires founder review`,
      summary: validationResult.validation.summary,
      sourceType: "session",
      sourceId: workflowRunId,
    });

    return { closed: false, sessionStatus: "needs_founder_review" };
  }

  try {
    const { generateSessionCompletionArtifacts } = await import("./session-completion");
    await generateSessionCompletionArtifacts(workflowRunId, projectId);
  } catch {
    // Executive completion artifacts are best-effort
  }

  try {
    const { data: sessionRow } = await supabase
      .from("workflow_runs")
      .select("objective, session_number, delivery_outcome, session_status")
      .eq("id", workflowRunId)
      .maybeSingle();

    const { getSessionIntelligence, extractSessionIntelligence } = await import("./session-intelligence");
    const existing = await getSessionIntelligence(workflowRunId);
    if (!existing || existing.extractionStatus !== "complete") {
      await extractSessionIntelligence(workflowRunId, projectId, {
        objective: sessionRow?.objective ?? "",
        sessionNumber: sessionRow?.session_number ?? null,
        deliveryOutcome: validationResult.validation.deliveryOutcome,
        sessionStatus: sessionRow?.session_status ?? "completed",
      });
    }
  } catch {
    // Intelligence extraction handled in finalization engine when available
  }

  await supabase
    .from("orchestration_runs")
    .update({ status: "COMPLETED", completed_at: now })
    .eq("workflow_id", workflowRunId);

  await supabase
    .from("workflow_runs")
    .update({
      status: "completed",
      session_status: "completed",
      completed_at: now,
      current_stage: "Closed",
      last_activity_at: now,
    })
    .eq("id", workflowRunId);

  // Phase 3 columns — optional until migration 030 is applied
  await supabase
    .from("workflow_runs")
    .update({ delivery_outcome: validationResult.validation.deliveryOutcome })
    .eq("id", workflowRunId)
    .then(({ error }) => {
      if (error && !error.message.includes("does not exist")) {
        console.warn("[session-manager] delivery_outcome update skipped:", error.message);
      }
    });

  await addProjectMemory({
    projectId,
    memoryType: "lesson",
    title: `Session archived (${artifacts.length} artifacts)`,
    summary: `${validationResult.validation.deliveryOutcome}. Session closed with ${artifacts.length} recorded agent turns.`,
    sourceType: "session",
    sourceId: workflowRunId,
  });

  return { closed: true, sessionStatus: "completed" };
}

export async function getAllActiveSessions(): Promise<SessionRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("id, project_id, session_number, executive_sponsor_agent_id, session_owner_agent_id, current_stage, session_status, status, objective")
    .eq("status", "running")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SessionRow[];
}

export async function getSessionsByLifecycle(filters?: {
  projectId?: string;
  includeCompleted?: boolean;
  includeCancelled?: boolean;
  limit?: number;
}): Promise<SessionRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("workflow_runs")
    .select("id, project_id, session_number, executive_sponsor_agent_id, session_owner_agent_id, current_stage, session_status, status, objective, completed_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);

  const statuses: string[] = ["running"];
  if (filters?.includeCompleted) statuses.push("completed");
  if (statuses.length === 1) {
    query = query.eq("status", "running");
  } else {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as SessionRow[];
  if (filters?.includeCancelled) {
    rows = rows.filter(
      (r) => r.status === "running" || r.status === "completed" || r.session_status === "cancelled",
    );
  } else {
    rows = rows.filter((r) => r.session_status !== "cancelled");
  }

  return rows;
}
