import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgents } from "./agents";
import { getWorkflowApprovals } from "./governance";
import { getSessionArtifacts } from "./session-artifacts";
import { getSessionHandoffs } from "./coo-routing";
import { getAllActiveSessions, getSessionsByLifecycle } from "./session-manager";
import { getApprovalHistory } from "./approval-history";
import { getCompanyExecutiveTimeline } from "./executive-timeline";
import { getSessionState } from "./session-state-engine";
import { getPrimarySdlcChain } from "./sdlc";
import { analyzeSessionRecovery } from "./session-recovery";
import { getWorkflowRunById } from "./workflows";
import { getAIInfrastructureStatus } from "./recovery-queue";

export type FounderIntelligenceSnapshot = {
  generatedAt: string;
  activeSessions: Awaited<ReturnType<typeof buildSessionSnapshot>>[];
  completedSessions: Awaited<ReturnType<typeof buildSessionSnapshot>>[];
  pendingApprovals: Awaited<ReturnType<typeof getWorkflowApprovals>>;
  approvalHistory: Awaited<ReturnType<typeof getApprovalHistory>>;
  executiveTimeline: Awaited<ReturnType<typeof getCompanyExecutiveTimeline>>;
  aiInfrastructure: Awaited<ReturnType<typeof getAIInfrastructureStatus>>;
  recentExecutionEvents: {
    agentName: string;
    stepKey: string | null;
    artifact: string | null;
    success: boolean;
    failureReason: string | null;
    promptLength: number | null;
    estimatedInputTokens: number | null;
    responseTimeMs: number | null;
    timeoutMs: number | null;
    provider: string;
    model: string;
    createdAt: string;
  }[];
  primaryChain: string[];
};

async function buildSessionSnapshot(sessionId: string) {
  const [state, workflow, recovery, handoffs, artifacts] = await Promise.all([
    getSessionState(sessionId),
    getWorkflowRunById(sessionId),
    analyzeSessionRecovery(sessionId),
    getSessionHandoffs(sessionId),
    getSessionArtifacts(sessionId),
  ]);

  return {
    sessionId,
    sessionNumber: state?.sessionNumber ?? null,
    objective: state?.objective ?? workflow?.objective ?? "",
    projectName: state?.projectName ?? workflow?.projectName ?? "Project",
    sessionStatus: state?.sessionStatus ?? null,
    currentAgent: state?.currentAgentName ?? null,
    nextAgent: state?.nextAgentName ?? null,
    workflowStage: state?.workflowStage ?? null,
    currentDeliverable: state?.currentDeliverable ?? null,
    currentArtifact: state?.currentArtifact ?? null,
    executionHealth: state?.executionHealth ?? 0,
    isStalled: recovery?.isStalled ?? false,
    stallReasons: recovery?.stallReasons ?? [],
    recommendedAction: recovery?.recommendedAction ?? null,
    recentHandoffs: handoffs.slice(0, 5).map((h) => ({
      from: h.fromStepKey,
      to: h.toStepKey,
      artifact: h.artifactName,
      createdAt: h.createdAt,
    })),
    recentArtifacts: artifacts.slice(0, 8).map((a) => ({
      name: a.artifactName ?? a.stepKey,
      stepKey: a.stepKey,
      createdAt: a.createdAt,
    })),
    inProgressSteps:
      workflow?.steps.filter((s) => s.status === "in_progress").map((s) => s.stepKey) ?? [],
  };
}

export async function collectFounderIntelligenceSnapshot(
  projectId?: string | null,
): Promise<FounderIntelligenceSnapshot> {
  const supabase = createSupabaseAdmin();
  const active = await getAllActiveSessions();
  const filtered = projectId
    ? active.filter((s) => s.project_id === projectId)
    : active;

  const sessions = await Promise.all(
    filtered.slice(0, 5).map((s) => buildSessionSnapshot(s.id)),
  );

  const completedRows = await getSessionsByLifecycle({ includeCompleted: true, limit: 10 });
  const completedFiltered = projectId
    ? completedRows.filter((s) => s.project_id === projectId)
    : completedRows;
  const completedSessions = await Promise.all(
    completedFiltered.slice(0, 5).map((s) => buildSessionSnapshot(s.id)),
  );

  const pendingApprovals = (
    await getWorkflowApprovals({ status: "pending" })
  ).filter((a) => !projectId || a.projectId === projectId);

  const [approvalHistory, executiveTimeline, aiInfrastructure] = await Promise.all([
    getApprovalHistory({ projectId: projectId ?? undefined, limit: 20 }),
    getCompanyExecutiveTimeline(25),
    getAIInfrastructureStatus(),
  ]);

  const sessionIds = filtered.map((s) => s.id);
  const { data: events } = await supabase
    .from("ai_execution_events")
    .select(
      "agent_name, step_key, artifact_requested, success, failure_reason, prompt_length, estimated_input_tokens, response_time_ms, timeout_ms, provider, model, created_at",
    )
    .in("workflow_run_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(15);

  return {
    generatedAt: new Date().toISOString(),
    activeSessions: sessions,
    completedSessions,
    pendingApprovals,
    approvalHistory,
    executiveTimeline,
    aiInfrastructure,
    recentExecutionEvents: (events ?? []).map((e) => ({
      agentName: e.agent_name as string,
      stepKey: e.step_key as string | null,
      artifact: e.artifact_requested as string | null,
      success: e.success as boolean,
      failureReason: e.failure_reason as string | null,
      promptLength: e.prompt_length as number | null,
      estimatedInputTokens: e.estimated_input_tokens as number | null,
      responseTimeMs: e.response_time_ms as number | null,
      timeoutMs: e.timeout_ms as number | null,
      provider: e.provider as string,
      model: e.model as string,
      createdAt: e.created_at as string,
    })),
    primaryChain: getPrimarySdlcChain().map((s) => s.label),
  };
}

function formatSnapshotForPrompt(snapshot: FounderIntelligenceSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export async function answerFounderIntelligenceQuestion(
  question: string,
  projectId?: string | null,
): Promise<{ answer: string; snapshot: FounderIntelligenceSnapshot }> {
  const snapshot = await collectFounderIntelligenceSnapshot(projectId);
  const contextBlock = formatSnapshotForPrompt(snapshot);

  const { resolveDefaultProviderConfig } = await import("./ai-provider-resolver");
  const { generateAICompletion } = await import("./ai-client");
  const provider = await resolveDefaultProviderConfig();

  const systemPrompt = `You are the Founder Intelligence assistant for InnovateAegis SAI.
Answer ONLY using the LIVE SYSTEM DATA provided below.
If data is missing, say "Not available in current system state" — never invent agents, artifacts, or statuses.
Reference specific session numbers, agent names, artifacts, and approval types from the data.
Primary SDLC chain (Team Orchestrator is NOT in this chain): ${snapshot.primaryChain.join(" → ")}`;

  const userPrompt = `LIVE SYSTEM DATA:\n${contextBlock}\n\nFOUNDER QUESTION:\n${question}`;

  if (!provider?.apiKey) {
    return {
      answer: buildDeterministicAnswer(question, snapshot),
      snapshot,
    };
  }

  try {
    const result = await generateAICompletion({
      providerName: provider.providerName,
      apiKey: provider.apiKey,
      endpoint: provider.endpoint,
      model: provider.model,
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      temperature: 0.2,
      timeoutMs: 60_000,
    });
    return { answer: result.content, snapshot };
  } catch {
    return {
      answer: buildDeterministicAnswer(question, snapshot),
      snapshot,
    };
  }
}

function buildDeterministicAnswer(question: string, snapshot: FounderIntelligenceSnapshot): string {
  const q = question.toLowerCase();
  const primary = snapshot.activeSessions[0];

  if (!primary) {
    if (q.includes("session #") || q.includes("timeline")) {
      const match = question.match(/session\s*#?\s*(\d+)/i);
      const completed = snapshot.completedSessions.find((s) => s.sessionNumber === Number(match?.[1]));
      if (completed) {
        return `Session #${completed.sessionNumber} (${completed.projectName}): ${completed.objective}. Status: ${completed.sessionStatus}. Stage: ${completed.workflowStage}. Artifacts: ${completed.recentArtifacts.length}.`;
      }
    }
    if (snapshot.completedSessions.length) {
      return `No active sessions. ${snapshot.completedSessions.length} recent completed session(s). Latest: Session #${snapshot.completedSessions[0].sessionNumber} — ${snapshot.completedSessions[0].objective}.`;
    }
    return "No active or recently completed sessions found in the current system state.";
  }

  if (q.includes("today") || q.includes("happened")) {
    const events = snapshot.executiveTimeline.slice(0, 8);
    if (!events.length) return "No company timeline events recorded today.";
    return events.map((e) => `- ${e.title} (${e.actor}, ${e.eventType})`).join("\n");
  }
  if (q.includes("fix") || q.includes("deliver") || q.includes("verified")) {
    const target = snapshot.activeSessions[0] ?? snapshot.completedSessions[0];
    if (!target) return "No session data available for delivery verification.";
    return `Session #${target.sessionNumber}: ${target.objective}. Recent artifacts: ${target.recentArtifacts.map((a) => a.name).join(", ") || "none"}. Check completion validation in session detail for implementation proof.`;
  }
  if (q.includes("delay") || q.includes("hygyr")) {
    const hygyr = [...snapshot.activeSessions, ...snapshot.completedSessions].find((s) =>
      s.projectName.toLowerCase().includes("hygyr"),
    );
    if (hygyr) {
      return `HYGYR Session #${hygyr.sessionNumber}: status ${hygyr.sessionStatus}, stage ${hygyr.workflowStage}, agent ${hygyr.currentAgent ?? "—"}. Stalled: ${hygyr.isStalled}. ${hygyr.recommendedAction ?? ""}`;
    }
  }

  if (q.includes("waiting") || q.includes("queue") || q.includes("why is session")) {
    const infra = snapshot.aiInfrastructure;
    if (infra.queueStatus !== "idle") {
      return `AI Queue Active. ${infra.queueMessage ?? "Waiting for retry."} Next attempt: ${infra.nextAttemptAt ? new Date(infra.nextAttemptAt).toLocaleTimeString() : "—"}. Provider: ${infra.provider ?? "—"}, health: ${infra.providerHealth}.`;
    }
    const waitMatch = question.match(/session\s*#?\s*(\d+)/i);
    const waitNum = waitMatch ? Number(waitMatch[1]) : null;
    const target = waitNum
      ? snapshot.activeSessions.find((s) => s.sessionNumber === waitNum)
      : primary;
    if (target) {
      return `Session #${target.sessionNumber}: status ${target.sessionStatus}, stage ${target.workflowStage}, agent ${target.currentAgent ?? "—"}. Stalled: ${target.isStalled}. ${target.recommendedAction ?? ""}`;
    }
  }

  if (q.includes("working on") || q.includes("everyone")) {
    return `Session #${primary.sessionNumber}: ${primary.currentAgent ?? "No agent"} is current. Next: ${primary.nextAgent ?? "None"}. Stage: ${primary.workflowStage ?? "unknown"}. Deliverable: ${primary.currentDeliverable ?? "—"}.`;
  }
  if (q.includes("stuck") || q.includes("block")) {
    return primary.isStalled
      ? `Session #${primary.sessionNumber} appears stalled. Reasons: ${primary.stallReasons.join("; ") || "unknown"}. Recommended: ${primary.recommendedAction}.`
      : `Session #${primary.sessionNumber} is not flagged stalled. Status: ${primary.sessionStatus}. Current agent: ${primary.currentAgent}.`;
  }
  if (q.includes("fail")) {
    const failures = snapshot.recentExecutionEvents.filter((e) => !e.success);
    if (!failures.length) return "No recent AI execution failures in active sessions.";
    const f = failures[0];
    return `Latest failure: ${f.agentName} on ${f.stepKey ?? "unknown"} (${f.artifact ?? "—"}). Reason: ${f.failureReason ?? "unknown"}. Provider: ${f.provider}, model: ${f.model}, prompt: ${f.promptLength ?? "—"} chars, timeout: ${f.timeoutMs ?? "—"}ms.`;
  }
  if (q.includes("approval")) {
    if (!snapshot.pendingApprovals.length) return "No pending approvals in active sessions.";
    return snapshot.pendingApprovals
      .map((a) => `- ${a.title} (${a.approvalType}, ${a.projectName})`)
      .join("\n");
  }
  if (q.includes("architecture")) {
    const arch = primary.recentArtifacts.find((a) => a.name.includes("architecture"));
    return arch
      ? `Architecture artifact present: ${arch.name} (step ${arch.stepKey}). Current deliverable: ${primary.currentDeliverable}.`
      : `No architecture_v1 artifact in recent session history. Current stage: ${primary.workflowStage}.`;
  }
  if (q.includes("last hour") || q.includes("recent")) {
    const events = snapshot.recentExecutionEvents.slice(0, 5);
    if (!events.length) return "No recent AI execution events recorded.";
    return events
      .map(
        (e) =>
          `- ${e.agentName} / ${e.stepKey}: ${e.success ? "success" : "failed"} (${e.provider}/${e.model})`,
      )
      .join("\n");
  }

  return `Session #${primary.sessionNumber} — Agent: ${primary.currentAgent}, Next: ${primary.nextAgent}, Stage: ${primary.workflowStage}, Deliverable: ${primary.currentDeliverable}, Health: ${primary.executionHealth}%. Pending approvals: ${snapshot.pendingApprovals.length}.`;
}
