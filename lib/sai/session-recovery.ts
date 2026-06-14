import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { postExecutiveMessage } from "./executive-session-chat";
import { runCeoSessionMonitor } from "./ceo-monitor";
import { getSessionHandoffs } from "./coo-routing";
import { computeSessionHealth } from "./execution-health";
import { getWorkflowApprovals } from "./governance";
import { addProjectMemory } from "./project-memory";
import { getSessionArtifacts } from "./session-artifacts";
import { getActiveSession, touchSessionActivity } from "./session-manager";
import { transitionSessionState } from "./session-state";
import { SDLC_WORKFLOW } from "./sdlc";
import { getSessionState, reconcileSessionState } from "./session-state-engine";
import type { SessionCloseRequest, SessionStatus, WorkflowRun } from "./types";
import { getWorkflowRunById } from "./workflows";
import { finalizeSession, guardRecoveryFromCompletedSession, isSessionFinalizationPending } from "./session-finalization-engine";

/** Hours a session must remain stalled before founder may start a new session anyway. */
export const STALL_OVERRIDE_HOURS = 24;

const TERMINAL_SESSION_STATUSES: SessionStatus[] = ["completed", "failed", "cancelled"];

export type SessionRecoveryAnalysis = {
  sessionId: string;
  sessionNumber: number | null;
  projectId: string;
  projectName: string;
  objective: string;
  sessionStatus: SessionStatus;
  isStalled: boolean;
  stallReasons: string[];
  hasCurrentAgent: boolean;
  hasPendingApproval: boolean;
  hasPendingHandoff: boolean;
  currentAgentName: string | null;
  nextAgentName: string | null;
  currentStepKey: string | null;
  lastActivityAt: string;
  lastActivityHoursAgo: number;
  stalledAt: string | null;
  stalledHours: number;
  progress: number;
  artifactCount: number;
  recommendedAction: string;
  canResume: boolean;
  canRequestClose: boolean;
  canForceClose: boolean;
  canCreateNewSession: boolean;
  stallOverrideAllowed: boolean;
  pendingCloseRequest: SessionCloseRequest | null;
  needsFinalization: boolean;
  hasKnowledgeArchive: boolean;
  canFinalize: boolean;
  needsFounderReview: boolean;
  canFounderAcknowledge: boolean;
  validationSummary: string | null;
  validationChecks: { label: string; passed: boolean; detail: string }[];
  progressLabel: string;
  sessionBlockers: string[];
  lastExecutionError: string | null;
  missingKnowledgeArchive: boolean;
  canAcknowledgeClose: boolean;
};

type CloseRequestRow = {
  id: string;
  workflow_run_id: string;
  reason: string;
  recommendation: string;
  status: string;
  requested_by: string | null;
  created_at: string;
  resolved_at: string | null;
};

function mapCloseRequest(row: CloseRequestRow): SessionCloseRequest {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    reason: row.reason,
    recommendation: row.recommendation,
    status: row.status as SessionCloseRequest["status"],
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function formatHoursAgo(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

async function getLastActivityAt(sessionId: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const [wf, artifact, chat, handoff] = await Promise.all([
    supabase.from("workflow_runs").select("updated_at, last_activity_at").eq("id", sessionId).maybeSingle(),
    supabase
      .from("session_artifacts")
      .select("created_at")
      .eq("workflow_run_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("session_chat_messages")
      .select("created_at")
      .eq("workflow_run_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("session_handoffs")
      .select("created_at")
      .eq("workflow_run_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const timestamps = [
    wf.data?.last_activity_at,
    wf.data?.updated_at,
    artifact.data?.created_at,
    chat.data?.created_at,
    handoff.data?.created_at,
  ].filter((t): t is string => Boolean(t));

  if (timestamps.length === 0) return new Date().toISOString();
  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

async function getPendingCloseRequest(sessionId: string): Promise<SessionCloseRequest | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("session_close_requests")
    .select("*")
    .eq("workflow_run_id", sessionId)
    .in("status", ["pending_ceo", "pending_coo", "pending_founder"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapCloseRequest(data as CloseRequestRow) : null;
}

export async function analyzeSessionRecovery(sessionId: string): Promise<SessionRecoveryAnalysis | null> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) return null;

  const supabase = createSupabaseAdmin();
  const agents = await getAgents();

  const [stepsRes, approvals, handoffs, artifacts, health, pendingClose, wfRow, queueRes, failedEventRes] =
    await Promise.all([
    supabase
      .from("workflow_run_steps")
      .select("step_key, status, assigned_agent_id, step_label")
      .eq("workflow_run_id", sessionId)
      .order("step_order"),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
    getSessionHandoffs(sessionId),
    getSessionArtifacts(sessionId),
    computeSessionHealth(sessionId),
    getPendingCloseRequest(sessionId),
    supabase
      .from("workflow_runs")
      .select("stalled_at, last_activity_at, completion_validation, session_status")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("ai_retry_queue")
      .select("last_error, status")
      .eq("workflow_run_id", sessionId)
      .order("created_at", { ascending: false })
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

  const steps = stepsRes.data ?? [];
  const agentName = (id: string | null) =>
    id ? agents.find((a) => a.id === id)?.name ?? null : null;

  const canonical = await getSessionState(sessionId);
  const hasCurrentAgent = Boolean(canonical?.currentAgentId);
  const hasPendingApproval = approvals.length > 0 || session.sessionStatus === "waiting_approval";
  const hasPendingHandoff = handoffs.some((h) => h.status === "pending");

  const activeStepKey = canonical?.workflowStage ?? null;

  const lastActivityAt = wfRow.data?.last_activity_at ?? (await getLastActivityAt(sessionId));
  const lastActivityHoursAgo = hoursSince(lastActivityAt);
  const stalledAt = (wfRow.data?.stalled_at as string | null) ?? null;
  const stalledHours = stalledAt ? hoursSince(stalledAt) : 0;

  const stallReasons: string[] = [];
  if (!hasCurrentAgent) stallReasons.push("No active agent assigned");
  if (!hasPendingApproval && !hasPendingHandoff && !hasCurrentAgent) {
    stallReasons.push("No pending approval or handoff");
  }
  if (lastActivityHoursAgo >= 3 && !hasCurrentAgent) {
    stallReasons.push(`No activity for ${formatHoursAgo(lastActivityHoursAgo)}`);
  }

  const isTerminal = TERMINAL_SESSION_STATUSES.includes(session.sessionStatus);
  const hasKnowledgeArchive = artifacts.some((a) => a.artifactName === "knowledge_archive_v1");
  const needsFinalization = hasKnowledgeArchive && !isTerminal;

  const inReleaseGrace = await (async () => {
    const { isInExecutionReleaseGrace } = await import("./execution-release");
    return isInExecutionReleaseGrace(sessionId);
  })();

  const isStalled =
    !needsFinalization &&
    !inReleaseGrace &&
    (session.sessionStatus === "stalled" ||
      (!isTerminal &&
        !hasCurrentAgent &&
        !hasPendingApproval &&
        !hasPendingHandoff &&
        !["pending_ceo", "pending_founder", "pending_coo", "waiting_approval", "planning", "execution_releasing", "waiting_for_ai_capacity"].includes(
          session.sessionStatus,
        )));

  const stallOverrideAllowed = isStalled && stalledHours >= STALL_OVERRIDE_HOURS;

  let recommendedAction = "Continue monitoring";
  if (isTerminal) {
    if (session.sessionStatus === "cancelled") recommendedAction = "Session stopped — no further execution";
    else if (session.sessionStatus === "completed") recommendedAction = "Session completed";
    else recommendedAction = "Session in terminal state";
  } else if (session.sessionStatus === "needs_founder_review") {
    recommendedAction = "Founder review required — acknowledge outcome to close session";
  } else if (needsFinalization) {
    recommendedAction = "Run Session Finalization Engine — knowledge archive exists";
  } else if (session.sessionStatus === "waiting_for_ai_capacity") {
    recommendedAction = "Waiting for AI capacity — retry queue active";
  } else if (isStalled) {
    recommendedAction = "Recover session — assign missing agent";
  } else if (hasPendingApproval) {
    recommendedAction = "Await founder or governance approval";
  } else if (hasPendingHandoff) {
    recommendedAction = "Complete pending agent handoff";
  }

  const stepProgress = health.completedSteps
    ? Math.round((health.completedSteps / Math.max(health.totalSteps, 1)) * 100)
    : 0;

  const completionValidation = wfRow.data?.completion_validation as
    | { passed?: boolean; summary?: string; checks?: { label: string; passed: boolean; detail: string }[] }
    | null
    | undefined;

  const needsFounderReview =
    session.sessionStatus === "needs_founder_review" ||
    (completionValidation?.passed === false && !isTerminal);

  const validationChecks = (completionValidation?.checks ?? []).map((c) => ({
    label: c.label,
    passed: c.passed,
    detail: c.detail,
  }));

  const validationSummary = completionValidation?.summary ?? null;

  let progressLabel = `${stepProgress}% workflow steps`;
  if (needsFounderReview) {
    progressLabel = `${stepProgress}% steps · closure blocked — founder review required`;
  } else if (needsFinalization) {
    progressLabel = `${stepProgress}% steps · finalization pending`;
  } else if (!hasKnowledgeArchive && stepProgress >= 60) {
    progressLabel = `${stepProgress}% steps · knowledge archive missing`;
  }

  const lastExecutionError =
    (failedEventRes.data?.failure_reason as string) ??
    (failedEventRes.data?.error_message as string) ??
    (queueRes.data?.last_error as string) ??
    null;

  const missingKnowledgeArchive = !hasKnowledgeArchive && !isTerminal;

  const sessionBlockers: string[] = [];
  if (missingKnowledgeArchive && stepProgress >= 50) {
    sessionBlockers.push("knowledge_archive_v1 not present — cannot finalize");
  }
  if (needsFinalization) {
    sessionBlockers.push("Knowledge archive exists — run finalization to close");
  }
  if (needsFounderReview) {
    sessionBlockers.push("Founder review required before session can close");
    if (validationSummary) sessionBlockers.push(validationSummary);
  }
  if (lastExecutionError) sessionBlockers.push(lastExecutionError);
  if (hasPendingApproval) sessionBlockers.push("Pending workflow approval blocks progress");
  if (isStalled && stallReasons.length) sessionBlockers.push(...stallReasons);

  const canAcknowledgeClose =
    !isTerminal &&
    (needsFounderReview ||
      (missingKnowledgeArchive && stepProgress >= 50) ||
      Boolean(lastExecutionError?.includes("Tool access denied")) ||
      (isStalled && stepProgress >= 40));

  return {
    sessionId,
    sessionNumber: session.sessionNumber,
    projectId: session.projectId,
    projectName: session.projectName ?? "Project",
    objective: session.objective,
    sessionStatus: session.sessionStatus,
    isStalled,
    stallReasons,
    hasCurrentAgent,
    hasPendingApproval,
    hasPendingHandoff,
    currentAgentName: canonical?.currentAgentName ?? null,
    nextAgentName: canonical?.nextAgentName ?? null,
    currentStepKey: activeStepKey,
    lastActivityAt,
    lastActivityHoursAgo,
    stalledAt,
    stalledHours,
    progress: stepProgress,
    artifactCount: artifacts.length,
    recommendedAction,
    canResume: (isStalled || session.sessionStatus === "recovery") && !needsFinalization && !needsFounderReview,
    canRequestClose: false,
    canForceClose: !isTerminal,
    canCreateNewSession: isTerminal || stallOverrideAllowed,
    stallOverrideAllowed,
    pendingCloseRequest: pendingClose,
    needsFinalization,
    hasKnowledgeArchive,
    canFinalize: needsFinalization || hasKnowledgeArchive,
    needsFounderReview,
    canFounderAcknowledge: needsFounderReview && !isTerminal,
    validationSummary,
    validationChecks,
    progressLabel,
    sessionBlockers,
    lastExecutionError,
    missingKnowledgeArchive,
    canAcknowledgeClose,
  };
}

export async function canStartNewSession(projectId: string): Promise<{
  allowed: boolean;
  message: string;
  activeSession: WorkflowRun | null;
  recovery: SessionRecoveryAnalysis | null;
  overrideAllowed: boolean;
}> {
  const active = await getActiveSession(projectId);
  if (!active) {
    return {
      allowed: true,
      message: "",
      activeSession: null,
      recovery: null,
      overrideAllowed: false,
    };
  }

  const recovery = await analyzeSessionRecovery(active.id);
  if (!recovery) {
    return {
      allowed: false,
      message: "Active session exists but could not be analyzed.",
      activeSession: active,
      recovery: null,
      overrideAllowed: false,
    };
  }

  if (recovery.canCreateNewSession) {
    return {
      allowed: true,
      message: recovery.stallOverrideAllowed
        ? `Stalled Session #${recovery.sessionNumber} may be superseded after ${STALL_OVERRIDE_HOURS}h.`
        : "",
      activeSession: active,
      recovery,
      overrideAllowed: recovery.stallOverrideAllowed,
    };
  }

  const statusLabel = recovery.isStalled ? "Stalled" : recovery.sessionStatus.replace("_", " ");
  return {
    allowed: false,
    message: `Project already has active Session #${recovery.sessionNumber} (${statusLabel}). Use recovery actions to resume or close.`,
    activeSession: active,
    recovery,
    overrideAllowed: false,
  };
}

export async function assertCanStartNewSession(
  projectId: string,
  opts?: { supersedeStalled?: boolean },
): Promise<void> {
  const check = await canStartNewSession(projectId);
  if (check.allowed) return;
  if (opts?.supersedeStalled && check.recovery?.stallOverrideAllowed && check.activeSession) {
    await forceCloseSession(check.activeSession.id, "Superseded by new session", {
      userId: null,
      name: "Founder",
    });
    return;
  }
  throw new Error(check.message);
}

export async function detectAndMarkStalled(sessionId: string): Promise<SessionRecoveryAnalysis | null> {
  const { isInExecutionReleaseGrace } = await import("./execution-release");
  if (await isInExecutionReleaseGrace(sessionId)) return analyzeSessionRecovery(sessionId);

  const analysis = await analyzeSessionRecovery(sessionId);
  if (!analysis || !analysis.isStalled) return analysis;
  if (analysis.sessionStatus === "stalled") return analysis;

  const session = await getWorkflowRunById(sessionId);
  if (!session) return analysis;

  const agents = await getAgents();
  const coo =
    (session.sessionOwnerAgentId
      ? agents.find((a) => a.id === session.sessionOwnerAgentId)
      : null) ?? findAgentForRole(agents, ["COO", "Chief Operating"]);
  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  if (!coo) return analysis;

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  await supabase
    .from("workflow_runs")
    .update({ session_status: "stalled", stalled_at: now })
    .eq("id", sessionId);

  const reviewContent = `# COO Stall Review

## Session #${analysis.sessionNumber}
**Project:** ${analysis.projectName}
**Objective:** ${analysis.objective}

## Execution Alert
Session appears stalled.

## Reasons
${analysis.stallReasons.map((r) => `- ${r}`).join("\n")}

## State
- Current Agent: ${analysis.currentAgentName ?? "None"}
- Next Agent: ${analysis.nextAgentName ?? "None"}
- Last Activity: ${formatHoursAgo(analysis.lastActivityHoursAgo)}
- Progress: ${analysis.progress}%

## Recommended Action
${analysis.recommendedAction}
`;

  await recordExecutiveArtifact({
    workflowRunId: sessionId,
    projectId: analysis.projectId,
    agentId: coo.id,
    stepKey: "coo_stall_review",
    artifactName: "coo_stall_review_v1",
    content: reviewContent,
  });

  await postExecutiveMessage(
    coo,
    sessionId,
    `Execution alert: session appears stalled. ${analysis.stallReasons[0] ?? "No active agent"}. Recommended: recover session.`,
    { projectId: analysis.projectId, stepKey: "coo_stall_review", artifactName: "coo_stall_review_v1" },
  );

  if (ceo) {
    try {
      await runCeoSessionMonitor(sessionId, { event: "execution_stalled", forceEscalation: true });
    } catch {
      // CEO monitoring is best-effort
    }
  }

  await touchSessionActivity(sessionId);
  return analyzeSessionRecovery(sessionId);
}

async function resolveMissingAgentForStep(
  sessionId: string,
  stepKey: string,
): Promise<{ agentId: string; stepKey: string } | null> {
  const supabase = createSupabaseAdmin();
  const agents = await getAgents();

  const { data: step } = await supabase
    .from("workflow_run_steps")
    .select("assigned_agent_id")
    .eq("workflow_run_id", sessionId)
    .eq("step_key", stepKey)
    .maybeSingle();

  if (step?.assigned_agent_id) {
    return { agentId: step.assigned_agent_id as string, stepKey };
  }

  const sdlcStep = SDLC_WORKFLOW.find((s) => s.key === stepKey);
  if (!sdlcStep) return null;

  const agent = findAgentForRole(agents, sdlcStep.matchRoles);
  if (!agent) return null;

  await supabase
    .from("workflow_run_steps")
    .update({ assigned_agent_id: agent.id, status: "in_progress", started_at: new Date().toISOString() })
    .eq("workflow_run_id", sessionId)
    .eq("step_key", stepKey);

  await supabase
    .from("tasks")
    .update({ assigned_agent_id: agent.id, status: "assigned" })
    .eq("workflow_run_id", sessionId)
    .eq("workflow_step_key", stepKey);

  return { agentId: agent.id, stepKey };
}

export async function recoverSession(sessionId: string): Promise<SessionRecoveryAnalysis> {
  const guard = await guardRecoveryFromCompletedSession(sessionId);
  if (!guard.allowRecovery) {
    const updated = await analyzeSessionRecovery(sessionId);
    if (!updated) throw new Error(guard.reason || "Recovery blocked — session finalized");
    return updated;
  }

  const session = await getWorkflowRunById(sessionId);
  if (!session) throw new Error("Session not found");

  const agents = await getAgents();
  const coo =
    (session.sessionOwnerAgentId
      ? agents.find((a) => a.id === session.sessionOwnerAgentId)
      : null) ?? findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo) throw new Error("COO not found — cannot recover session");

  let analysis = await analyzeSessionRecovery(sessionId);
  if (!analysis) throw new Error("Could not analyze session");

  if (analysis.isStalled && analysis.sessionStatus !== "stalled") {
    analysis = (await detectAndMarkStalled(sessionId)) ?? analysis;
  }

  const supabase = createSupabaseAdmin();
  const fromStatus = analysis.sessionStatus;

  if (fromStatus === "stalled") {
    await transitionSessionState(sessionId, "stalled", "recovery", coo.id);
  } else if (fromStatus !== "recovery") {
    await supabase.from("workflow_runs").update({ session_status: "recovery" }).eq("id", sessionId);
  }

  const targetStepKey =
    analysis.currentStepKey ??
    SDLC_WORKFLOW.find((s) => s.key !== "ceo_strategy" && s.key !== "coo_execution")?.key ??
    "requirements";

  const resolved = await resolveMissingAgentForStep(sessionId, targetStepKey);
  if (!resolved) {
    throw new Error(`No agent available for step ${targetStepKey}`);
  }

  const targetAgent = agents.find((a) => a.id === resolved.agentId);

  const { healAgentToolForStep } = await import("./tool-permissions");
  await healAgentToolForStep(resolved.agentId, targetStepKey).catch(() => {});

  await supabase
    .from("workflow_runs")
    .update({
      stalled_at: null,
      session_status: "executing",
      current_stage: SDLC_WORKFLOW.find((s) => s.key === targetStepKey)?.label ?? targetStepKey,
    })
    .eq("id", sessionId);

  await postExecutiveMessage(
    coo,
    sessionId,
    `Session recovered. Assigned ${targetAgent?.name ?? "agent"} to resume ${targetStepKey}.`,
    { projectId: session.projectId, stepKey: "coo_execution", artifactName: "coo_stall_review_v1" },
  );

  await touchSessionActivity(sessionId);

  const { reconcileSessionState } = await import("./session-state-engine");
  await reconcileSessionState(sessionId);

  const { triggerStepExecution } = await import("./step-execution");
  const { resolveStaleEscalations } = await import("./escalation-resolver");
  await triggerStepExecution(sessionId).catch(() => {});
  await resolveStaleEscalations(sessionId).catch(() => {});

  const updated = await analyzeSessionRecovery(sessionId);
  if (!updated) throw new Error("Recovery completed but analysis failed");
  return updated;
}

export async function requestCooStallReview(sessionId: string): Promise<SessionRecoveryAnalysis | null> {
  return detectAndMarkStalled(sessionId);
}

export async function requestSessionClose(
  sessionId: string,
  reason: string,
  actor: { userId?: string | null; name: string },
): Promise<SessionCloseRequest> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) throw new Error("Session not found");

  const analysis = await analyzeSessionRecovery(sessionId);
  if (!analysis) throw new Error("Could not analyze session");

  const agents = await getAgents();
  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  const coo =
    (session.sessionOwnerAgentId
      ? agents.find((a) => a.id === session.sessionOwnerAgentId)
      : null) ?? findAgentForRole(agents, ["COO", "Chief Operating"]);

  const supabase = createSupabaseAdmin();
  const recommendation = `Close Session — ${analysis.isStalled ? "workflow stalled" : "founder requested closure"}. Progress ${analysis.progress}%. Artifacts: ${analysis.artifactCount}.`;

  const { data, error } = await supabase
    .from("session_close_requests")
    .insert({
      workflow_run_id: sessionId,
      reason,
      recommendation,
      status: "pending_founder",
      requested_by: actor.userId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const reviewBody = `# Session Closure Review

**Reason:** ${reason}
**Current Progress:** ${analysis.progress}%
**Artifacts:** ${analysis.artifactCount}
**Status:** ${analysis.sessionStatus}

## CEO Assessment
Strategic review complete. Closure requested by ${actor.name}.

## COO Recommendation
${recommendation}
`;

  if (ceo) {
    await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId: session.projectId,
      agentId: ceo.id,
      stepKey: "executive_review",
      artifactName: "session_closure_review_v1",
      content: reviewBody,
    });
    await postExecutiveMessage(ceo, sessionId, `Closure review initiated. ${reason}`, {
      projectId: session.projectId,
      artifactName: "session_closure_review_v1",
    });
  }

  if (coo) {
    await postExecutiveMessage(coo, sessionId, `Closure recommendation: ${recommendation}`, {
      projectId: session.projectId,
      stepKey: "execution_summary",
      artifactName: "session_closure_review_v1",
    });
  }

  await touchSessionActivity(sessionId);
  return mapCloseRequest(data as CloseRequestRow);
}

export async function approveSessionClose(
  closeRequestId: string,
  actor: { userId?: string | null; name: string },
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: request } = await supabase
    .from("session_close_requests")
    .select("*")
    .eq("id", closeRequestId)
    .maybeSingle();

  if (!request) throw new Error("Close request not found");
  if (request.status !== "pending_founder") {
    throw new Error("Close request is not awaiting founder approval");
  }

  const session = await getWorkflowRunById(request.workflow_run_id);
  if (!session) throw new Error("Session not found");

  await supabase
    .from("session_close_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("id", closeRequestId);

  const { finalizeSession, isSessionFinalizationPending } = await import("./session-finalization-engine");
  const pendingFinalization = await isSessionFinalizationPending(session.id);

  if (pendingFinalization) {
    await finalizeSession(session.id);
  } else {
    const { closeSession } = await import("./session-manager");
    await closeSession(session.id, session.projectId);
  }

  await addProjectMemory({
    projectId: session.projectId,
    memoryType: "decision",
    title: `Session #${session.sessionNumber} closed by founder approval`,
    summary: `${actor.name} approved closure: ${request.reason}`,
    sourceType: "session",
    sourceId: session.id,
  });
}

export async function forceCloseSession(
  sessionId: string,
  reason: string,
  actor: { userId?: string | null; name: string },
): Promise<void> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) throw new Error("Session not found");

  const pendingFinalization = await isSessionFinalizationPending(sessionId);
  if (pendingFinalization || session.status === "completed" || session.sessionStatus === "completed") {
    await finalizeSession(sessionId);
    return;
  }

  const analysis = await analyzeSessionRecovery(sessionId);
  const artifacts = await getSessionArtifacts(sessionId);
  const agents = await getAgents();
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);

  const content = `# Session Force Close

**Reason:** ${reason}
**Closed By:** ${actor.name}
**When:** ${new Date().toISOString()}
**Progress Lost:** ${analysis?.progress ?? 0}%
**Artifacts Preserved:** ${artifacts.length}

${artifacts.map((a) => `- ${a.artifactName ?? a.stepKey}`).join("\n")}
`;

  if (coo) {
    await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId: session.projectId,
      agentId: coo.id,
      stepKey: "execution_summary",
      artifactName: "session_force_close_v1",
      content,
    });
  }

  const { haltSessionExecution } = await import("./session-state-engine");
  await haltSessionExecution(sessionId, reason, actor.name);

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  await supabase
    .from("workflow_runs")
    .update({
      status: "completed",
      session_status: "cancelled",
      completed_at: now,
      current_stage: "Force Closed",
      stalled_at: null,
    })
    .eq("id", sessionId);

  await supabase
    .from("session_close_requests")
    .update({ status: "rejected", resolved_at: now })
    .eq("workflow_run_id", sessionId)
    .in("status", ["pending_ceo", "pending_coo", "pending_founder"]);

  await addProjectMemory({
    projectId: session.projectId,
    memoryType: "lesson",
    title: `Session #${session.sessionNumber} force closed`,
    summary: reason,
    sourceType: "session",
    sourceId: sessionId,
  });

  const { recordFinalizationEvent } = await import("./session-finalization-engine");
  await recordFinalizationEvent(sessionId, session.projectId, "session_closed", {
    forceClosed: true,
    closedBy: actor.name,
    reason,
    sessionStatus: "cancelled",
  });

  const { notifyFounder } = await import("./notifications");
  await notifyFounder(
    `Session #${session.sessionNumber} stopped`,
    `${actor.name} force-closed this session. Reason: ${reason}. Status updated across COS.`,
    "WORKFLOW",
    { severity: "HIGH", entityType: "workflow", entityId: sessionId },
  );

  const { recordActivityFeed } = await import("./activity-feed");
  await recordActivityFeed({
    actor: actor.name,
    action: "session_force_closed",
    targetType: "workflow",
    targetId: sessionId,
    description: `Session #${session.sessionNumber} force closed: ${reason}`,
  });
}

export async function getProjectSessionRecovery(
  projectId: string,
): Promise<SessionRecoveryAnalysis | null> {
  const active = await getActiveSession(projectId);
  if (!active) return null;
  return analyzeSessionRecovery(active.id);
}
