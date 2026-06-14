import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getSessionArtifacts } from "./session-artifacts";
import { createCompanyRecord } from "./company-records";
import type { SessionIntelligenceStatus } from "./session-types";

export type SessionIntelligence = {
  id: string;
  workflowRunId: string;
  outcomeSummary: string;
  lessonsLearned: string[];
  failures: string[];
  wins: string[];
  recommendations: string[];
  reusableKnowledge: string[];
  extractionStatus: SessionIntelligenceStatus;
  extractedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type IntelligenceRow = {
  id: string;
  workflow_run_id: string;
  outcome_summary: string;
  lessons_learned: string[];
  failures: string[];
  wins: string[];
  recommendations: string[];
  reusable_knowledge: string[];
  extraction_status: SessionIntelligenceStatus;
  extracted_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: IntelligenceRow): SessionIntelligence {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    outcomeSummary: row.outcome_summary,
    lessonsLearned: row.lessons_learned ?? [],
    failures: row.failures ?? [],
    wins: row.wins ?? [],
    recommendations: row.recommendations ?? [],
    reusableKnowledge: row.reusable_knowledge ?? [],
    extractionStatus: row.extraction_status,
    extractedAt: row.extracted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSessionIntelligence(workflowRunId: string): Promise<SessionIntelligence | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_intelligence")
    .select("*")
    .eq("workflow_run_id", workflowRunId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as IntelligenceRow);
}

export async function ensureSessionIntelligenceRecord(workflowRunId: string): Promise<SessionIntelligence> {
  const existing = await getSessionIntelligence(workflowRunId);
  if (existing) return existing;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_intelligence")
    .insert({ workflow_run_id: workflowRunId, extraction_status: "pending" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as IntelligenceRow);
}

/**
 * Extract session intelligence from artifacts and session state.
 * Called before session completion — knowledge capture is mandatory.
 */
export async function extractSessionIntelligence(
  workflowRunId: string,
  projectId: string,
  context: {
    objective: string;
    sessionNumber: number | null;
    deliveryOutcome?: string | null;
    sessionStatus: string;
  },
): Promise<SessionIntelligence> {
  await ensureSessionIntelligenceRecord(workflowRunId);

  const supabase = createSupabaseAdmin();
  await supabase
    .from("session_intelligence")
    .update({ extraction_status: "in_progress" })
    .eq("workflow_run_id", workflowRunId);

  const artifacts = await getSessionArtifacts(workflowRunId);
  const lessons: string[] = [];
  const wins: string[] = [];
  const failures: string[] = [];
  const recommendations: string[] = [];
  const reusable: string[] = [];
  const decisions: string[] = [];

  const [approvals, handoffs, chatMessages] = await Promise.all([
    supabase.from("workflow_approvals").select("title, approval_type, status, comments").eq("workflow_id", workflowRunId),
    supabase.from("session_handoffs").select("from_agent_id, to_agent_id, reason, status").eq("workflow_run_id", workflowRunId),
    supabase.from("session_chat").select("speaker_name, message, step_key").eq("workflow_run_id", workflowRunId).limit(50),
  ]);

  for (const approval of approvals.data ?? []) {
    if (approval.status === "approved" || approval.status === "rejected") {
      decisions.push(
        `${approval.approval_type}: ${approval.title} — ${approval.status}${approval.comments ? ` (${approval.comments})` : ""}`,
      );
    }
  }

  for (const handoff of handoffs.data ?? []) {
    recommendations.push(`Handoff: ${handoff.reason ?? "stage transition"} (${handoff.status})`);
  }

  for (const msg of chatMessages.data ?? []) {
    if (msg.message && String(msg.message).length > 20) {
      reusable.push(`${msg.speaker_name} @ ${msg.step_key}: ${String(msg.message).slice(0, 200)}`);
    }
  }

  for (const artifact of artifacts) {
    const summary = artifact.outputSummary?.slice(0, 500) ?? "";
    if (!summary) continue;
    if (artifact.stepKey === "knowledge" || artifact.artifactType === "knowledge") {
      lessons.push(summary);
      reusable.push(`${artifact.artifactName ?? artifact.stepKey}: ${summary}`);
    } else if (artifact.stepKey === "validation") {
      wins.push(`QA completed: ${artifact.artifactName ?? "validation"}`);
    } else if (artifact.stepKey === "implementation") {
      wins.push(`Implementation delivered: ${artifact.artifactName ?? "implementation"}`);
    }
  }

  if (context.deliveryOutcome) {
    wins.push(context.deliveryOutcome);
  }

  if (context.sessionStatus === "failed" || context.sessionStatus === "blocked") {
    failures.push(`Session ended in ${context.sessionStatus} state`);
    recommendations.push("Review blocked stages and re-run recovery before closing");
  }

  if (lessons.length === 0) {
    lessons.push(`Session #${context.sessionNumber ?? "—"} completed for: ${context.objective}`);
  }

  recommendations.push("Archive session file to Records Center for organizational memory");

  const outcomeSummary =
    context.deliveryOutcome ??
    `Session #${context.sessionNumber ?? "—"} — ${context.objective}. ${artifacts.length} artifacts captured.`;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_intelligence")
    .update({
      outcome_summary: outcomeSummary,
      lessons_learned: lessons,
      failures,
      wins,
      recommendations,
      reusable_knowledge: reusable,
      extraction_status: "complete",
      extracted_at: now,
      updated_at: now,
    })
    .eq("workflow_run_id", workflowRunId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const intelligence = mapRow(data as IntelligenceRow);

  await createCompanyRecord({
    recordType: "session_file",
    title: `Session #${context.sessionNumber ?? workflowRunId.slice(0, 8)} — ${context.objective}`,
    summary: outcomeSummary,
    content: {
      intelligence,
      artifactCount: artifacts.length,
      sessionStatus: context.sessionStatus,
    },
    sourceSessionId: workflowRunId,
    sourceProjectId: projectId,
    tags: ["session", "intelligence"],
  });

  for (const lesson of lessons.slice(0, 5)) {
    await createCompanyRecord({
      recordType: "lesson",
      title: `Lesson from Session #${context.sessionNumber ?? "—"}`,
      summary: lesson,
      content: { lesson },
      sourceSessionId: workflowRunId,
      sourceProjectId: projectId,
      tags: ["lesson", "knowledge"],
    });
  }

  for (const decision of decisions.slice(0, 10)) {
    await createCompanyRecord({
      recordType: "decision",
      title: `Decision — Session #${context.sessionNumber ?? "—"}`,
      summary: decision,
      content: { decision },
      sourceSessionId: workflowRunId,
      sourceProjectId: projectId,
      tags: ["decision"],
    });
  }

  for (const item of reusable.filter((r) => r.startsWith("Architecture:")).slice(0, 3)) {
    await createCompanyRecord({
      recordType: "architecture",
      title: `Architecture — Session #${context.sessionNumber ?? "—"}`,
      summary: item,
      content: { architecture: item },
      sourceSessionId: workflowRunId,
      sourceProjectId: projectId,
      tags: ["architecture"],
    });
  }

  return intelligence;
}
