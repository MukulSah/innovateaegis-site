import { revalidatePath } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import { createSessionArtifact } from "./session-artifacts";
import { closeSession as closeSessionInDb } from "./session-manager";
import { haltSessionExecution } from "./session-state-engine";
import { getWorkflowRunById } from "./workflows";

export const KNOWLEDGE_ARTIFACT = "knowledge_archive_v1";
export const SESSION_FINAL_REPORT = "session_final_report_v1";
export const EXECUTIVE_REVIEW = "executive_review_v1";
export const SESSION_CLOSED_ARTIFACT = "session_closed_v1";

const DASHBOARD_PATHS = [
  "/sai/founder",
  "/sai/executive/ceo",
  "/sai/executive/coo",
  "/sai/execution",
] as const;

export type FinalizationResult = {
  finalized: boolean;
  reason: string;
  sessionStatus?: string;
  artifactsCreated: string[];
};

export async function recordFinalizationEvent(
  workflowRunId: string,
  projectId: string,
  eventType: "knowledge_archive_detected" | "steps_completed" | "session_closed" | "finalization_blocked" | "finalization_failed",
  details: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("session_finalization_events").insert({
    workflow_run_id: workflowRunId,
    project_id: projectId,
    event_type: eventType,
    details,
  }).then(({ error }) => {
    if (error && !error.message.includes("does not exist")) {
      console.warn("[session-finalization-engine] event insert:", error.message);
    }
  });
}

export async function publishCompletionArtifacts(
  workflowRunId: string,
  projectId: string,
): Promise<string[]> {
  const { getSessionArtifacts } = await import("./session-artifacts");
  const workflow = await getWorkflowRunById(workflowRunId);
  if (!workflow) return [];

  const artifacts = await getSessionArtifacts(workflowRunId);
  const created: string[] = [];

  const hasFinalReport = artifacts.some((a) => a.artifactName === SESSION_FINAL_REPORT);
  const hasExecutiveReview = artifacts.some((a) => a.artifactName === EXECUTIVE_REVIEW);

  if (!hasFinalReport) {
    const artifactList = artifacts
      .map((a) => `- ${a.artifactName ?? a.stepKey} (${a.stepKey})`)
      .join("\n");

    await createSessionArtifact({
      workflowRunId,
      projectId,
      agentId: null,
      stepKey: "knowledge",
      inputSummary: "Session finalization engine",
      outputSummary: `# Session Final Report

## Session #${workflow.sessionNumber ?? "—"}
**Project:** ${workflow.projectName}
**Objective:** ${workflow.objective}

## Delivery Summary
All primary SDLC stages processed for this session.

## Artifacts Generated
${artifactList || "None recorded"}

## Outcome
Session ready for archival and dashboard completion.`,
      artifactName: SESSION_FINAL_REPORT,
      artifactType: "report",
    });
    created.push(SESSION_FINAL_REPORT);
  }

  if (!hasExecutiveReview) {
    await createSessionArtifact({
      workflowRunId,
      projectId,
      agentId: null,
      stepKey: "knowledge",
      inputSummary: "Session finalization engine",
      outputSummary: `# Executive Review

## Session #${workflow.sessionNumber ?? "—"}
**Objective:** ${workflow.objective}

Knowledge archive complete. Session finalization approved by execution engine.

## Recommendation
Archive session timeline and retain artifacts for audit.`,
      artifactName: EXECUTIVE_REVIEW,
      artifactType: "review",
    });
    created.push(EXECUTIVE_REVIEW);
  }

  try {
    const { generateSessionCompletionArtifacts } = await import("./session-completion");
    await generateSessionCompletionArtifacts(workflowRunId, projectId);
  } catch {
    // Executive completion artifacts are best-effort
  }

  return created;
}

export async function archiveSession(workflowRunId: string, projectId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { getSessionArtifacts } = await import("./session-artifacts");
  const artifacts = await getSessionArtifacts(workflowRunId);

  const existingClosed = artifacts.find((a) => a.artifactName === SESSION_CLOSED_ARTIFACT);
  if (!existingClosed) {
    const workflow = await getWorkflowRunById(workflowRunId);
    await createSessionArtifact({
      workflowRunId,
      projectId,
      agentId: null,
      stepKey: "knowledge",
      inputSummary: "Session finalization engine",
      outputSummary: `# Session Closed

Session #${workflow?.sessionNumber ?? "—"} archived at ${now}.
Objective: ${workflow?.objective ?? ""}`,
      artifactName: SESSION_CLOSED_ARTIFACT,
      artifactType: "closure",
    });
  }

  await supabase
    .from("ai_retry_queue")
    .update({ status: "cancelled", updated_at: now })
    .eq("workflow_run_id", workflowRunId)
    .in("status", ["queued", "waiting", "processing"]);

  await supabase
    .from("workflow_runs")
    .update({
      current_agent_id: null,
      next_agent_id: null,
      current_stage: "Closed",
      workflow_stage: "completed",
      current_artifact: KNOWLEDGE_ARTIFACT,
      current_deliverable: SESSION_FINAL_REPORT,
      last_activity_at: now,
    })
    .eq("id", workflowRunId);

  const { addProjectMemory } = await import("./project-memory");
  await addProjectMemory({
    projectId,
    memoryType: "lesson",
    title: `Session #${workflowRunId.slice(0, 8)} archived`,
    summary: `Finalized with ${artifacts.length} artifacts. Knowledge archive preserved.`,
    sourceType: "session",
    sourceId: workflowRunId,
  });
}

export function refreshDashboards(): void {
  for (const path of DASHBOARD_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/sai/workflows/[id]", "page");
}

/** Close workflow run in DB — delegates to session-manager. */
export async function closeSession(
  workflowRunId: string,
  projectId: string,
): Promise<{ closed: boolean; sessionStatus: string }> {
  return closeSessionInDb(workflowRunId, projectId);
}

export async function finalizeSession(workflowRunId: string): Promise<FinalizationResult> {
  const workflow = await getWorkflowRunById(workflowRunId);
  if (!workflow) {
    return { finalized: false, reason: "Session not found", artifactsCreated: [] };
  }

  if (workflow.status === "completed" || workflow.sessionStatus === "completed") {
    return {
      finalized: true,
      reason: "Already completed",
      sessionStatus: "completed",
      artifactsCreated: [],
    };
  }

  const { getSessionArtifacts } = await import("./session-artifacts");
  const artifacts = await getSessionArtifacts(workflowRunId);
  const hasKnowledgeArchive = artifacts.some((a) => a.artifactName === KNOWLEDGE_ARTIFACT);

  if (!hasKnowledgeArchive) {
    await recordFinalizationEvent(workflowRunId, workflow.projectId, "finalization_blocked", {
      reason: "knowledge_archive_v1 not present — cannot finalize",
    });
    await notifyFounder(
      `Session #${workflow.sessionNumber ?? "—"} cannot finalize`,
      "Knowledge archive (knowledge_archive_v1) is missing. Run knowledge step or acknowledge & close from Session Control.",
      "WORKFLOW",
      { severity: "HIGH", entityType: "workflow", entityId: workflowRunId },
    );
    return {
      finalized: false,
      reason: "knowledge_archive_v1 not present — cannot finalize",
      artifactsCreated: [],
    };
  }

  await recordFinalizationEvent(workflowRunId, workflow.projectId, "knowledge_archive_detected", {
    artifactCount: artifacts.length,
  });

  const steps = workflow.steps ?? [];
  const incomplete = steps.filter((s) => s.status !== "completed" && s.status !== "skipped");
  if (incomplete.length > 0) {
    const supabase = createSupabaseAdmin();
    await supabase
      .from("workflow_run_steps")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("workflow_run_id", workflowRunId)
      .in(
        "step_key",
        incomplete.map((s) => s.stepKey),
      );
  }

  await recordFinalizationEvent(workflowRunId, workflow.projectId, "steps_completed");

  const artifactsCreated = await publishCompletionArtifacts(workflowRunId, workflow.projectId);
  await archiveSession(workflowRunId, workflow.projectId);
  await haltSessionExecution(workflowRunId, "Session finalized — no further agent execution");

  try {
    const { extractSessionIntelligence, getSessionIntelligence } = await import("./session-intelligence");
    const existing = await getSessionIntelligence(workflowRunId);
    if (!existing || existing.extractionStatus !== "complete") {
      await extractSessionIntelligence(workflowRunId, workflow.projectId, {
        objective: workflow.objective,
        sessionNumber: workflow.sessionNumber,
        deliveryOutcome: null,
        sessionStatus: "completed",
      });
    }
    const intel = await getSessionIntelligence(workflowRunId);
    if (!intel || intel.extractionStatus !== "complete") {
      return {
        finalized: false,
        reason: "Knowledge extraction incomplete — mandatory before session closure",
        artifactsCreated,
      };
    }
  } catch (extractError) {
    const message = extractError instanceof Error ? extractError.message : "extraction failed";
    if (!message.includes("does not exist")) {
      await recordFinalizationEvent(workflowRunId, workflow.projectId, "finalization_blocked", {
        error: message,
      });
      return {
        finalized: false,
        reason: `Knowledge extraction failed: ${message}`,
        artifactsCreated,
      };
    }
  }

  let closeResult: { closed: boolean; sessionStatus: string };
  try {
    closeResult = await closeSession(workflowRunId, workflow.projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "closeSession failed";
    await recordFinalizationEvent(workflowRunId, workflow.projectId, "finalization_failed", {
      error: message,
    });
    throw error;
  }

  if (closeResult.closed) {
    await recordFinalizationEvent(workflowRunId, workflow.projectId, "session_closed", {
      sessionStatus: closeResult.sessionStatus,
    });

    await recordActivityFeed({
      actor: "Session Finalization Engine",
      action: "session_completed",
      targetType: "workflow",
      targetId: workflowRunId,
      description: `Session #${workflow.sessionNumber ?? "—"} finalized — ${SESSION_FINAL_REPORT} published`,
    });

    await notifyFounder(
      `Session #${workflow.sessionNumber ?? "—"} completed`,
      `Final artifact: ${SESSION_FINAL_REPORT}. Session archived and removed from active execution.`,
      "WORKFLOW",
      { severity: "MEDIUM", entityType: "workflow", entityId: workflowRunId },
    );
  } else {
    await recordFinalizationEvent(workflowRunId, workflow.projectId, "finalization_blocked", {
      reason: closeResult.sessionStatus,
    });
    await notifyFounder(
      `Session #${workflow.sessionNumber ?? "—"} needs your review`,
      `Finalization blocked (${closeResult.sessionStatus}). Open Session Control to review validation and acknowledge.`,
      "WORKFLOW",
      { severity: "HIGH", entityType: "workflow", entityId: workflowRunId },
    );
  }

  refreshDashboards();

  return {
    finalized: closeResult.closed,
    reason: closeResult.closed
      ? "Session finalized and archived"
      : `Close blocked: ${closeResult.sessionStatus}`,
    sessionStatus: closeResult.sessionStatus,
    artifactsCreated,
  };
}

export async function evaluateSessionFinalization(workflowRunId: string): Promise<FinalizationResult> {
  return finalizeSession(workflowRunId);
}

export async function forceFinalizeSession(
  workflowRunId: string,
  approvedBy: string,
): Promise<FinalizationResult> {
  const workflow = await getWorkflowRunById(workflowRunId);
  if (!workflow) {
    return { finalized: false, reason: "Session not found", artifactsCreated: [] };
  }

  const { getSessionArtifacts } = await import("./session-artifacts");
  const artifacts = await getSessionArtifacts(workflowRunId);
  const hasKnowledge = artifacts.some((a) => a.artifactName === KNOWLEDGE_ARTIFACT);

  if (!hasKnowledge) {
    const artifactList = artifacts
      .map((a) => `- ${a.artifactName ?? a.stepKey}`)
      .join("\n");
    await createSessionArtifact({
      workflowRunId,
      projectId: workflow.projectId,
      agentId: null,
      stepKey: "knowledge",
      inputSummary: `Force finalization by ${approvedBy}`,
      outputSummary: `# Knowledge Archive (Founder Force)

## Session #${workflow.sessionNumber ?? "—"}
**Objective:** ${workflow.objective}

## Artifacts
${artifactList || "No artifacts recorded"}

## Outcome
Founder-approved force finalization.`,
      artifactName: KNOWLEDGE_ARTIFACT,
      artifactType: "knowledge",
    });

    try {
      const { extractSessionIntelligence } = await import("./session-intelligence");
      await extractSessionIntelligence(workflowRunId, workflow.projectId, {
        objective: workflow.objective,
        sessionNumber: workflow.sessionNumber,
        deliveryOutcome: "Founder force finalization",
        sessionStatus: workflow.sessionStatus,
      });
    } catch {
      // Intelligence extraction is best-effort before close
    }
  }

  await recordFinalizationEvent(workflowRunId, workflow.projectId, "steps_completed", {
    forced: true,
    approvedBy,
  });
  return finalizeSession(workflowRunId);
}

/** Founder acknowledges validation gaps and completes the session (CEO sign-off). */
export async function founderAcknowledgeAndCompleteSession(
  workflowRunId: string,
  approvedBy: string,
  note = "Founder acknowledged session outcome",
): Promise<FinalizationResult> {
  const workflow = await getWorkflowRunById(workflowRunId);
  if (!workflow) {
    return { finalized: false, reason: "Session not found", artifactsCreated: [] };
  }

  if (workflow.status === "completed" || workflow.sessionStatus === "completed") {
    return {
      finalized: true,
      reason: "Already completed",
      sessionStatus: "completed",
      artifactsCreated: [],
    };
  }

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const artifactsCreated: string[] = [];

  await createSessionArtifact({
    workflowRunId,
    projectId: workflow.projectId,
    agentId: null,
    stepKey: "ceo_monitoring",
    inputSummary: `Founder acknowledgment by ${approvedBy}`,
    outputSummary: `# Founder & CEO Acknowledgment

Session #${workflow.sessionNumber ?? "—"} acknowledged by ${approvedBy}.
**Note:** ${note}

CEO confirms session outcome is accepted for organizational records despite validation flags.`,
    artifactName: "founder_acknowledgment_v1",
    artifactType: "decision",
  });
  artifactsCreated.push("founder_acknowledgment_v1");

  await createSessionArtifact({
    workflowRunId,
    projectId: workflow.projectId,
    agentId: null,
    stepKey: "knowledge",
    inputSummary: "Founder completion acknowledgment",
    outputSummary: `# CEO Session Outcome Acknowledgment

Session #${workflow.sessionNumber ?? "—"} — ${workflow.objective}

Founder reviewed completion validation and acknowledged the session for closure.
${note}`,
    artifactName: EXECUTIVE_REVIEW,
    artifactType: "review",
  });
  artifactsCreated.push(EXECUTIVE_REVIEW);

  await publishCompletionArtifacts(workflowRunId, workflow.projectId);
  await archiveSession(workflowRunId, workflow.projectId);
  await haltSessionExecution(workflowRunId, "Founder acknowledged — session closed");

  try {
    const { extractSessionIntelligence } = await import("./session-intelligence");
    await extractSessionIntelligence(workflowRunId, workflow.projectId, {
      objective: workflow.objective,
      sessionNumber: workflow.sessionNumber,
      deliveryOutcome: note,
      sessionStatus: "completed",
    });
  } catch {
    // best-effort
  }

  await supabase
    .from("workflow_runs")
    .update({
      status: "completed",
      session_status: "completed",
      completed_at: now,
      delivery_outcome: note,
      current_stage: "Closed",
      governance_status: "normal",
      last_activity_at: now,
    })
    .eq("id", workflowRunId);

  await supabase
    .from("orchestration_runs")
    .update({ status: "COMPLETED", completed_at: now })
    .eq("workflow_id", workflowRunId);

  await recordFinalizationEvent(workflowRunId, workflow.projectId, "session_closed", {
    founderAcknowledged: true,
    approvedBy,
    note,
  });

  await recordActivityFeed({
    actor: approvedBy,
    action: "founder_session_acknowledged",
    targetType: "workflow",
    targetId: workflowRunId,
    description: `Session #${workflow.sessionNumber ?? "—"} acknowledged and closed`,
  });

  await notifyFounder(
    `Session #${workflow.sessionNumber ?? "—"} acknowledged`,
    `You acknowledged and closed this session. Outcome recorded for CEO/organizational intelligence.`,
    "WORKFLOW",
    { severity: "MEDIUM", entityType: "workflow", entityId: workflowRunId },
  );

  refreshDashboards();

  return {
    finalized: true,
    reason: "Founder acknowledged — session completed and archived",
    sessionStatus: "completed",
    artifactsCreated,
  };
}

/** Returns true when knowledge is complete and session should not accept recovery/execution. */
export async function isSessionFinalizationPending(workflowRunId: string): Promise<boolean> {
  const workflow = await getWorkflowRunById(workflowRunId);
  if (!workflow) return false;
  if (workflow.status === "completed" || workflow.sessionStatus === "completed") return true;

  const { getSessionArtifacts } = await import("./session-artifacts");
  const artifacts = await getSessionArtifacts(workflowRunId);
  return artifacts.some((a) => a.artifactName === KNOWLEDGE_ARTIFACT);
}

/**
 * Before recovery or re-execution: finalize if knowledge archive exists.
 * Prevents reopening deployment/documentation after completion.
 */
export async function guardRecoveryFromCompletedSession(
  workflowRunId: string,
): Promise<{ allowRecovery: boolean; finalized: boolean; reason: string }> {
  const workflow = await getWorkflowRunById(workflowRunId);
  if (!workflow) {
    return { allowRecovery: false, finalized: false, reason: "Session not found" };
  }

  if (workflow.status === "completed" || workflow.sessionStatus === "completed") {
    return { allowRecovery: false, finalized: true, reason: "Session already completed" };
  }

  const pending = await isSessionFinalizationPending(workflowRunId);
  if (!pending) {
    return { allowRecovery: true, finalized: false, reason: "" };
  }

  const result = await finalizeSession(workflowRunId);
  return {
    allowRecovery: false,
    finalized: result.finalized,
    reason: result.finalized
      ? "Session finalized — recovery blocked"
      : `Finalization required before recovery: ${result.reason}`,
  };
}
