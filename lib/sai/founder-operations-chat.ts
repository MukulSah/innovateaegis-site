import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { recordActivityFeed } from "./activity-feed";
import {
  answerFounderIntelligenceQuestion,
  collectFounderIntelligenceSnapshot,
  type FounderIntelligenceSnapshot,
} from "./founder-intelligence";
import { getAIInfrastructureStatus } from "./recovery-queue";
import { forceFinalizeSession } from "./session-finalization-engine";
import { getSessionTruth } from "./session-truth-engine";
import { recoverSession } from "./session-recovery";
import { retryExecution } from "./recovery-queue";
import type { FounderChatActionType } from "./types";

export type FounderChatResponse = {
  answer: string;
  snapshot: FounderIntelligenceSnapshot;
  pendingAction?: FounderPendingAction | null;
  infrastructure?: Awaited<ReturnType<typeof getAIInfrastructureStatus>>;
};

export type FounderPendingAction = {
  id: string;
  actionType: FounderChatActionType;
  summary: string;
  sessionId: string | null;
  approveLabel: string;
};

const ACTION_PATTERNS: { pattern: RegExp; action: FounderChatActionType; label: string }[] = [
  { pattern: /\bresume\s+session\b/i, action: "resume_session", label: "Resume Session" },
  { pattern: /\bretry\b/i, action: "retry_step", label: "Retry Step" },
  { pattern: /\breconcile\b/i, action: "reconcile_state", label: "Reconcile State" },
  { pattern: /\b(run\s+)?finali[sz]e/i, action: "force_finalize", label: "Run Finalization" },
  { pattern: /\bpause\s+session\b/i, action: "pause_session", label: "Pause Session" },
  { pattern: /\bclose\s+session\b/i, action: "close_session", label: "Close Session" },
  { pattern: /\bescalate\s+to\s+coo\b/i, action: "escalate_coo", label: "Escalate to COO" },
  { pattern: /\bescalate\s+to\s+ceo\b/i, action: "escalate_ceo", label: "Escalate to CEO" },
];

function detectActionIntent(question: string): FounderChatActionType | null {
  for (const { pattern, action } of ACTION_PATTERNS) {
    if (pattern.test(question)) return action;
  }
  return null;
}

function extractSessionNumber(question: string): number | null {
  const match = question.match(/session\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function resolveSessionFromQuestion(
  question: string,
  snapshot: FounderIntelligenceSnapshot,
): (typeof snapshot.activeSessions)[0] | null {
  const num = extractSessionNumber(question);
  if (num) {
    return (
      snapshot.activeSessions.find((s) => s.sessionNumber === num) ??
      snapshot.completedSessions.find((s) => s.sessionNumber === num) ??
      null
    );
  }
  return snapshot.activeSessions[0] ?? null;
}

function resolveSessionId(
  question: string,
  snapshot: FounderIntelligenceSnapshot,
): string | null {
  const session = resolveSessionFromQuestion(question, snapshot);
  return session?.sessionId ?? null;
}

async function buildLiveStateAnswer(
  question: string,
  sessionId: string | null,
): Promise<string | null> {
  if (!sessionId) return null;

  const truth = await getSessionTruth(sessionId);
  if (!truth) return null;

  const q = question.toLowerCase();
  const completedSteps = truth.timeline.filter((t) => t.status === "completed").map((t) => t.label);
  const pendingSteps = truth.timeline.filter((t) => t.status === "pending").map((t) => t.label);

  if (q.includes("waiting") || q.includes("why") || q.includes("stuck") || q.includes("fail")) {
    const lines = [
      `**Session #${truth.sessionNumber}** — ${truth.objective.slice(0, 120)}`,
      "",
      `Status: ${truth.sessionStatus} | Workflow: ${truth.workflowStatus}`,
      `Current Agent: ${truth.currentAgentName ?? "none"}`,
      `Current Deliverable: ${truth.currentDeliverable ?? "—"}`,
      `Stage: ${truth.workflowStage ?? "—"}`,
      "",
      `Completed: ${completedSteps.join(" → ") || "none"}`,
    ];

    if (truth.knowledgeArchiveExists && !truth.isComplete) {
      lines.push(
        "",
        "Documentation Agent completed.",
        "Knowledge archive generated.",
        "",
        "**Session finalization pending.**",
        truth.finalizationBlockedReason ?? "Run Finalization Engine.",
      );
      if (truth.lastError) {
        lines.push("", `Last error: ${truth.lastError}`);
      }
      lines.push("", "Recommended action: **Run Finalization Engine**. Approve?");
    } else if (truth.queueActive) {
      lines.push("", `**AI Queue Active** — ${truth.queueMessage ?? "waiting for capacity"}`);
    } else if (truth.lastError) {
      lines.push("", `Last execution error: ${truth.lastError}`);
    } else if (pendingSteps.length) {
      lines.push("", `Pending: ${pendingSteps.join(", ")}`);
    }

    return lines.join("\n");
  }

  return null;
}

async function proposeFounderAction(input: {
  question: string;
  actionType: FounderChatActionType;
  snapshot: FounderIntelligenceSnapshot;
  projectId?: string | null;
}): Promise<{ answer: string; pendingAction: FounderPendingAction | null }> {
  const session = resolveSessionFromQuestion(input.question, input.snapshot);
  const { getActiveQueueForSession } = await import("./recovery-queue");

  let summary = "";
  let approveLabel = "Approve";

  switch (input.actionType) {
    case "retry_step": {
      const queue = session ? await getActiveQueueForSession(session.sessionId) : null;
      summary = queue
        ? `Session #${session?.sessionNumber} is waiting in retry queue. Retry available ${queue.nextAttemptAt ? `at ${new Date(queue.nextAttemptAt).toLocaleTimeString()}` : "now"}.`
        : session
          ? `Retry execution for Session #${session.sessionNumber} at stage ${session.workflowStage}.`
          : "No active session found for retry.";
      approveLabel = "Approve Retry";
      break;
    }
    case "resume_session":
      summary = session
        ? `Session #${session.sessionNumber} — status ${session.sessionStatus}, agent ${session.currentAgent ?? "none"}. ${session.recommendedAction ?? ""}`
        : "No active session to resume.";
      approveLabel = "Approve Resume";
      break;
    case "force_finalize": {
      const hasKnowledge = session?.recentArtifacts.some((a) => a.name === "knowledge_archive_v1");
      summary = hasKnowledge
        ? `Session #${session?.sessionNumber}: Knowledge archive exists. Finalization pending.`
        : `Session #${session?.sessionNumber ?? "—"}: force finalize may bypass validation.`;
      approveLabel = "Approve Finalization";
      break;
    }
    case "reconcile_state":
      summary = session
        ? `Reconcile workflow pointers for Session #${session.sessionNumber}.`
        : "Select an active session to reconcile.";
      approveLabel = "Approve Reconcile";
      break;
    case "pause_session":
      summary = session
        ? `Pause orchestration for Session #${session.sessionNumber}.`
        : "No session to pause.";
      approveLabel = "Approve Pause";
      break;
    case "close_session":
      summary = session
        ? `Request close for Session #${session.sessionNumber}: ${session.objective.slice(0, 80)}`
        : "No session selected.";
      approveLabel = "Approve Close";
      break;
    case "escalate_coo":
      summary = session
        ? `Escalate Session #${session.sessionNumber} to COO for operational review.`
        : "Escalate current blocker to COO.";
      approveLabel = "Approve Escalation";
      break;
    case "escalate_ceo":
      summary = session
        ? `Escalate Session #${session.sessionNumber} to CEO for strategic review.`
        : "Escalate to CEO.";
      approveLabel = "Approve Escalation";
      break;
    default:
      summary = "Operational action requested.";
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("founder_chat_actions")
    .insert({
      workflow_run_id: session?.sessionId ?? null,
      project_id: input.projectId ?? null,
      action_type: input.actionType,
      action_payload: { sessionNumber: session?.sessionNumber ?? null },
      status: "pending_approval",
      founder_question: input.question,
      system_summary: summary,
    })
    .select("id")
    .single();

  if (error) {
    return { answer: `${summary}\n\n(Could not register action: ${error.message})`, pendingAction: null };
  }

  return {
    answer: `${summary}\n\n**${approveLabel}?** Reply with "Approve" to execute.`,
    pendingAction: {
      id: data.id as string,
      actionType: input.actionType,
      summary,
      sessionId: session?.sessionId ?? null,
      approveLabel,
    },
  };
}

export async function handleFounderOperationsMessage(
  question: string,
  projectId?: string | null,
  approveActionId?: string | null,
): Promise<FounderChatResponse> {
  const infrastructure = await getAIInfrastructureStatus();
  const snapshot = await collectFounderIntelligenceSnapshot(projectId);

  if (approveActionId || /^\s*approve\s*$/i.test(question)) {
    const actionId = approveActionId;
    if (!actionId) {
      const supabase = createSupabaseAdmin();
      const { data: pending } = await supabase
        .from("founder_chat_actions")
        .select("id")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pending?.id) {
        const base = await answerFounderIntelligenceQuestion(question, projectId);
        return { ...base, infrastructure };
      }
      return executeApprovedFounderAction(pending.id as string, "founder");
    }
    return executeApprovedFounderAction(actionId, "founder");
  }

  const actionIntent = detectActionIntent(question);
  if (actionIntent) {
    const { answer, pendingAction } = await proposeFounderAction({
      question,
      actionType: actionIntent,
      snapshot,
      projectId,
    });
    return { answer, snapshot, pendingAction, infrastructure };
  }

  const sessionId = resolveSessionId(question, snapshot);
  const liveAnswer = await buildLiveStateAnswer(question, sessionId);
  if (liveAnswer) {
    return { answer: liveAnswer, snapshot, infrastructure, pendingAction: null };
  }

  const base = await answerFounderIntelligenceQuestion(question, projectId);
  return {
    ...base,
    infrastructure,
    answer: infrastructure.queueStatus !== "idle"
      ? `${base.answer}\n\n**AI Queue Active** — ${infrastructure.queueMessage ?? "Waiting for retry."}`
      : base.answer,
  };
}

export async function executeApprovedFounderAction(
  actionId: string,
  approvedBy: string,
): Promise<FounderChatResponse> {
  const supabase = createSupabaseAdmin();
  const { data: action, error } = await supabase
    .from("founder_chat_actions")
    .select("*")
    .eq("id", actionId)
    .maybeSingle();

  if (error || !action) throw new Error("Action not found");
  if (action.status !== "pending_approval") {
    throw new Error(`Action already ${action.status}`);
  }

  const sessionId = action.workflow_run_id as string | null;
  const actionType = action.action_type as FounderChatActionType;
  let resultMessage = "";

  try {
    switch (actionType) {
      case "retry_step": {
        const { data: queue } = await supabase
          .from("ai_retry_queue")
          .select("id")
          .eq("workflow_run_id", sessionId)
          .in("status", ["queued", "waiting"])
          .limit(1)
          .maybeSingle();
        if (queue?.id) {
          await retryExecution(queue.id as string);
          resultMessage = "Retry execution initiated.";
        } else if (sessionId) {
          const { triggerStepExecution } = await import("./step-execution");
          await triggerStepExecution(sessionId);
          resultMessage = "Step execution triggered.";
        }
        break;
      }
      case "resume_session":
        if (sessionId) {
          await recoverSession(sessionId);
          resultMessage = "Session resume initiated.";
        }
        break;
      case "reconcile_state":
        if (sessionId) {
          const { reconcileSessionState } = await import("./session-state-engine");
          const { triggerStepExecution } = await import("./step-execution");
          const result = await reconcileSessionState(sessionId);
          if (result.repaired) await triggerStepExecution(sessionId).catch(() => {});
          resultMessage = result.repaired ? "State reconciled and execution triggered." : "No drift detected.";
        }
        break;
      case "force_finalize":
        if (sessionId) {
          const result = await forceFinalizeSession(sessionId, approvedBy);
          resultMessage = result.reason;
        }
        break;
      case "pause_session":
        if (sessionId) {
          await supabase
            .from("orchestration_runs")
            .update({ status: "PAUSED" })
            .eq("workflow_id", sessionId);
          resultMessage = "Session orchestration paused.";
        }
        break;
      case "close_session":
        if (sessionId) {
          const { requestSessionClose } = await import("./session-recovery");
          await requestSessionClose(sessionId, "Founder chat close request", {
            userId: approvedBy,
            name: approvedBy,
          });
          resultMessage = "Close request submitted.";
        }
        break;
      case "escalate_coo":
      case "escalate_ceo": {
        if (sessionId) {
          await supabase.from("session_escalations").insert({
            workflow_run_id: sessionId,
            issue: action.system_summary ?? "Founder chat escalation",
            owner: actionType === "escalate_ceo" ? "CEO" : "COO",
            priority: "high",
            status: "open",
          });
          resultMessage = `Escalated to ${actionType === "escalate_ceo" ? "CEO" : "COO"}.`;
        }
        break;
      }
      default:
        resultMessage = "Unknown action type.";
    }

    await supabase
      .from("founder_chat_actions")
      .update({
        status: "executed",
        approved_by: approvedBy,
        executed_at: new Date().toISOString(),
      })
      .eq("id", actionId);

    await supabase.from("founder_chat_action_logs").insert({
      action_id: actionId,
      message: resultMessage,
      metadata: { actionType },
    });

    await recordActivityFeed({
      actor: approvedBy,
      action: "founder_action_executed",
      targetType: "workflow",
      targetId: sessionId,
      description: `${actionType}: ${resultMessage}`,
    });
  } catch (execError) {
    await supabase
      .from("founder_chat_actions")
      .update({ status: "failed" })
      .eq("id", actionId);
    throw execError;
  }

  const snapshot = await collectFounderIntelligenceSnapshot(action.project_id as string | null);
  const infrastructure = await getAIInfrastructureStatus();

  return {
    answer: resultMessage || "Action executed.",
    snapshot,
    infrastructure,
    pendingAction: null,
  };
}
