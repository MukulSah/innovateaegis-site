"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./api-auth";
import { answerSessionCosQuestion, getSessionExecutiveBrief } from "./session-brief";
import { loadSessionWorkspacePayload } from "./session-workspace-data";
import { analyzeSessionRecovery, forceCloseSession, recoverSession } from "./session-recovery";
import { founderAcknowledgeAndCompleteSession, finalizeSession } from "./session-finalization-engine";
import { reconcileSessionState } from "./session-state-engine";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function requireSessionUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

function revalidateSessionPaths() {
  for (const path of [
    "/sai/founder",
    "/sai/sessions",
    "/sai/executive/ceo",
    "/sai/executive/coo",
    "/sai/execution",
  ]) {
    revalidatePath(path);
  }
}

export async function loadSessionBriefAction(sessionId: string) {
  await requireSessionUser();
  return getSessionExecutiveBrief(sessionId);
}

export async function askSessionCosAction(
  sessionId: string,
  question: string,
  tabContext?: string,
) {
  await requireSessionUser();
  const contextualQuestion = tabContext
    ? `[Workspace tab: ${tabContext}] ${question}`
    : question;
  return answerSessionCosQuestion(sessionId, contextualQuestion, tabContext);
}

export async function loadSessionWorkspaceAction(sessionId: string) {
  await requireSessionUser();
  return loadSessionWorkspacePayload(sessionId);
}

export async function loadSessionRecoveryAction(sessionId: string) {
  await requireSessionUser();
  return analyzeSessionRecovery(sessionId);
}

export async function loadSessionAlertsAction(sessionId: string) {
  await requireSessionUser();
  const supabase = createSupabaseAdmin();

  const [eventsRes, activityRes, workflowEventsRes, queueRes] = await Promise.all([
    supabase
      .from("session_finalization_events")
      .select("id, event_type, details, created_at")
      .eq("workflow_run_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("activity_feed")
      .select("id, actor, action, description, created_at")
      .eq("target_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("workflow_events")
      .select("id, event_type, title, description, created_at")
      .eq("workflow_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("ai_retry_queue")
      .select("id, last_error, status, created_at")
      .eq("workflow_run_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const finalizationEvents = (eventsRes.data ?? []).map((e) => ({
    id: e.id as string,
    type: "finalization" as const,
    eventType: e.event_type as string,
    message: formatFinalizationEvent(e.event_type as string, e.details as Record<string, unknown>),
    createdAt: e.created_at as string,
  }));

  const activityEvents = (activityRes.data ?? []).map((e) => ({
    id: e.id as string,
    type: "activity" as const,
    eventType: e.action as string,
    message: `${e.actor}: ${e.description ?? e.action}`,
    createdAt: e.created_at as string,
  }));

  const workflowEvents = (workflowEventsRes.data ?? []).map((e) => ({
    id: e.id as string,
    type: "execution" as const,
    eventType: e.event_type as string,
    message: e.description ?? (e.title as string),
    createdAt: e.created_at as string,
  }));

  const queueEvents = (queueRes.data ?? [])
    .filter((q) => q.last_error)
    .map((q) => ({
      id: q.id as string,
      type: "execution" as const,
      eventType: `queue_${q.status as string}`,
      message: String(q.last_error),
      createdAt: q.created_at as string,
    }));

  return [...finalizationEvents, ...workflowEvents, ...queueEvents, ...activityEvents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 25);
}

function formatFinalizationEvent(
  eventType: string,
  details: Record<string, unknown>,
): string {
  switch (eventType) {
    case "finalization_blocked":
      return `Finalization blocked: ${String(details.reason ?? details.error ?? "validation failed")}`;
    case "session_closed":
      return details.founderAcknowledged
        ? `Session closed — founder acknowledged (${String(details.approvedBy ?? "CEO")})`
        : details.forceClosed
          ? `Session force closed by ${String(details.closedBy ?? "founder")}`
          : "Session closed and archived";
    case "knowledge_archive_detected":
      return "Knowledge archive detected — finalization recommended";
    case "steps_completed":
      return "All workflow steps completed";
    default:
      return eventType.replace(/_/g, " ");
  }
}

export async function runSessionControlAction(
  sessionId: string,
  action: string,
  options?: { reason?: string; note?: string },
) {
  const user = await requireSessionUser();
  const actorName = user.name || user.username;

  let result: unknown;

  switch (action) {
      case "reconcile_state":
        result = await reconcileSessionState(sessionId);
        if ((result as { resumeExecution?: boolean }).resumeExecution) {
          const { driveSessionExecution } = await import("./session-execution-driver");
          await driveSessionExecution(sessionId);
        }
        break;
    case "resume":
      result = await recoverSession(sessionId);
      break;
    case "resolve_blockers":
      result = await recoverSession(sessionId);
      break;
    case "finalize_session":
      result = await finalizeSession(sessionId);
      break;
    case "founder_acknowledge":
      result = await founderAcknowledgeAndCompleteSession(
        sessionId,
        actorName,
        options?.note?.trim() || "Founder acknowledged session outcome",
      );
      break;
    case "force_close":
      await forceCloseSession(
        sessionId,
        options?.reason?.trim() || "Founder force closed session",
        { userId: user.id, name: actorName },
      );
      result = { forceClosed: true };
      break;
    default:
      throw new Error("Invalid session control action");
  }

  revalidateSessionPaths();
  revalidatePath(`/sai/sessions/${sessionId}`);

  return result;
}
