import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getAgents } from "./agents";
import { getWorkflowApprovals } from "./governance";
import { getSessionArtifacts } from "./session-artifacts";
import {
  EXECUTIVE_REVIEW,
  KNOWLEDGE_ARTIFACT,
  SESSION_FINAL_REPORT,
  isSessionFinalizationPending,
} from "./session-finalization-engine";
import { SDLC_WORKFLOW } from "./sdlc";
import type { SessionStatus } from "./types";

export type SessionTimelineEvent = {
  stepKey: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedAt: string | null;
  artifactName: string | null;
};

export type SessionTruth = {
  sessionId: string;
  sessionNumber: number | null;
  projectId: string;
  projectName: string;
  objective: string;
  workflowStatus: string;
  sessionStatus: SessionStatus;
  isComplete: boolean;
  isExecutable: boolean;
  knowledgeComplete: boolean;
  knowledgeArchiveExists: boolean;
  finalReportExists: boolean;
  executiveReviewExists: boolean;
  currentAgentId: string | null;
  currentAgentName: string | null;
  nextAgentId: string | null;
  nextAgentName: string | null;
  currentDeliverable: string | null;
  currentArtifact: string | null;
  currentArtifactId: string | null;
  workflowStage: string | null;
  currentStage: string | null;
  executionHealth: number;
  strategicHealth: number;
  executionReleasedAt: string | null;
  executiveSponsorAgentId: string | null;
  executiveSponsorName: string | null;
  sessionOwnerAgentId: string | null;
  sessionOwnerName: string | null;
  createdAt: string | null;
  steps: SessionTimelineEvent[];
  timeline: SessionTimelineEvent[];
  artifactNames: string[];
  lastError: string | null;
  queueActive: boolean;
  queueMessage: string | null;
  pendingApprovalCount: number;
  finalizationBlockedReason: string | null;
  generatedAt: string;
};

type WorkflowRow = {
  id: string;
  project_id: string;
  session_number: number | null;
  objective: string;
  status: string;
  session_status: string | null;
  workflow_stage: string | null;
  current_stage: string | null;
  current_agent_id: string | null;
  next_agent_id: string | null;
  current_artifact_id: string | null;
  current_artifact: string | null;
  current_deliverable: string | null;
  execution_health: number | null;
  strategic_health: number | null;
  execution_released_at: string | null;
  executive_sponsor_agent_id: string | null;
  session_owner_agent_id: string | null;
  created_at: string | null;
  completed_at: string | null;
  projects?: { name: string } | { name: string }[] | null;
};

function projectName(row: WorkflowRow): string {
  if (Array.isArray(row.projects)) return row.projects[0]?.name ?? "Project";
  return row.projects?.name ?? "Project";
}

function buildTimelineFromSteps(
  stepRows: { step_key: string; status: string; completed_at: string | null }[],
  artifacts: { stepKey: string; artifactName: string | null }[],
): SessionTimelineEvent[] {
  const chain = SDLC_WORKFLOW.filter((s) =>
    [
      "ceo_strategy",
      "coo_execution",
      "requirements",
      "execution_readiness",
      "design",
      "tasks",
      "implementation",
      "validation",
      "deployment",
      "documentation",
      "knowledge",
    ].includes(s.key),
  );

  return chain.map((sdlc) => {
    const row = stepRows.find((s) => s.step_key === sdlc.key);
    const artifact = artifacts.find((a) => a.stepKey === sdlc.key);
    const status = (row?.status ?? "pending") as SessionTimelineEvent["status"];
    return {
      stepKey: sdlc.key,
      label: sdlc.label,
      status: status === "completed" ? "completed" : status === "in_progress" ? "in_progress" : status === "skipped" ? "skipped" : "pending",
      completedAt: row?.completed_at ?? null,
      artifactName: artifact?.artifactName ?? null,
    };
  });
}

/** Single source of truth — reads workflow_runs and related execution state only. */
export async function getSessionTruth(sessionId: string): Promise<SessionTruth | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("workflow_runs")
    .select(
      "id, project_id, session_number, objective, status, session_status, workflow_stage, current_stage, current_agent_id, next_agent_id, current_artifact_id, current_artifact, current_deliverable, execution_health, strategic_health, execution_released_at, executive_sponsor_agent_id, session_owner_agent_id, created_at, completed_at, projects(name)",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const wf = row as WorkflowRow;
  const agents = await getAgents();
  const agentName = (id: string | null) =>
    id ? agents.find((a) => a.id === id)?.name ?? null : null;

  const [stepsRes, artifacts, approvals, queueEntry, lastFailedEvent] = await Promise.all([
    supabase
      .from("workflow_run_steps")
      .select("step_key, status, completed_at")
      .eq("workflow_run_id", sessionId)
      .order("step_order"),
    getSessionArtifacts(sessionId),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
    supabase
      .from("ai_retry_queue")
      .select("status, last_error")
      .eq("workflow_run_id", sessionId)
      .in("status", ["queued", "waiting", "processing"])
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_execution_events")
      .select("failure_reason, error_message")
      .eq("workflow_run_id", sessionId)
      .eq("success", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const stepRows = stepsRes.data ?? [];
  const artifactNames = artifacts.map((a) => a.artifactName ?? a.stepKey);
  const timeline = buildTimelineFromSteps(stepRows, artifacts);

  let executionHealth = wf.execution_health ?? 0;
  let strategicHealth = wf.strategic_health ?? 0;
  if (!wf.execution_health || !wf.strategic_health) {
    const { computeSessionHealth } = await import("./execution-health");
    const { computeStrategicHealth } = await import("./strategic-health");
    const [exec, strat] = await Promise.all([
      computeSessionHealth(sessionId),
      computeStrategicHealth(sessionId),
    ]);
    executionHealth = exec.score;
    strategicHealth = strat.score;
  }

  const sessionStatus = (wf.session_status as SessionStatus) ?? "running";
  const isComplete = wf.status === "completed" || sessionStatus === "completed";
  const knowledgeArchiveExists = artifactNames.includes(KNOWLEDGE_ARTIFACT);
  const finalReportExists = artifactNames.includes(SESSION_FINAL_REPORT);
  const executiveReviewExists = artifactNames.includes(EXECUTIVE_REVIEW);
  const knowledgeComplete = knowledgeArchiveExists;

  const terminal = new Set<SessionStatus>(["completed", "cancelled", "failed"]);
  const isExecutable = wf.status === "running" && !terminal.has(sessionStatus) && !isComplete;

  let finalizationBlockedReason: string | null = null;
  if (knowledgeArchiveExists && !isComplete) {
    finalizationBlockedReason = "knowledge_archive_v1 exists but session not closed — run finalization";
  } else if (!knowledgeArchiveExists && !isComplete) {
    const completedSteps = stepRows.filter((s) => s.status === "completed").length;
    const progress =
      stepRows.length > 0 ? Math.round((completedSteps / stepRows.length) * 100) : 0;
    if (progress >= 60 || sessionStatus === "needs_founder_review") {
      finalizationBlockedReason = "knowledge_archive_v1 not present — cannot finalize";
    }
  }

  const lastError =
    (lastFailedEvent.data?.failure_reason as string) ??
    (lastFailedEvent.data?.error_message as string) ??
    (queueEntry.data?.last_error as string) ??
    null;

  return {
    sessionId: wf.id,
    sessionNumber: wf.session_number,
    projectId: wf.project_id,
    projectName: projectName(wf),
    objective: wf.objective,
    workflowStatus: wf.status,
    sessionStatus,
    isComplete,
    isExecutable,
    knowledgeComplete,
    knowledgeArchiveExists,
    finalReportExists,
    executiveReviewExists,
    currentAgentId: wf.current_agent_id,
    currentAgentName: agentName(wf.current_agent_id),
    nextAgentId: wf.next_agent_id,
    nextAgentName: agentName(wf.next_agent_id),
    currentDeliverable: wf.current_deliverable,
    currentArtifact: wf.current_artifact,
    currentArtifactId: wf.current_artifact_id,
    workflowStage: wf.workflow_stage,
    currentStage: wf.current_stage,
    executionHealth,
    strategicHealth,
    executionReleasedAt: wf.execution_released_at,
    executiveSponsorAgentId: wf.executive_sponsor_agent_id,
    executiveSponsorName: agentName(wf.executive_sponsor_agent_id),
    sessionOwnerAgentId: wf.session_owner_agent_id,
    sessionOwnerName: agentName(wf.session_owner_agent_id),
    createdAt: wf.created_at,
    steps: timeline,
    timeline,
    artifactNames,
    lastError,
    queueActive: Boolean(queueEntry.data),
    queueMessage: queueEntry.data
      ? `AI queue active (${queueEntry.data.status as string})`
      : null,
    pendingApprovalCount: approvals.length,
    finalizationBlockedReason,
    generatedAt: new Date().toISOString(),
  };
}

export async function getSessionTruthList(filters?: {
  projectId?: string;
  activeOnly?: boolean;
  completedOnly?: boolean;
  limit?: number;
}): Promise<SessionTruth[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("workflow_runs")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.activeOnly) query = query.eq("status", "running");
  if (filters?.completedOnly) query = query.eq("status", "completed");

  const { data } = await query;
  const truths = await Promise.all((data ?? []).map((r) => getSessionTruth(r.id as string)));
  return truths.filter((t): t is SessionTruth => t !== null);
}

export { isSessionFinalizationPending };
