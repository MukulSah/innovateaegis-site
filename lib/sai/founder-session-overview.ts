import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAllActiveSessions } from "./session-manager";
import { getWorkflowApprovals } from "./governance";
import { getCooMonitorSnapshot, runCooSessionMonitor } from "./coo-monitor";
import { evaluateExecutionReadiness } from "./execution-readiness";
import { getProjectDriveDocuments } from "./documentation-pipeline";
import { getProjectDriveFolders } from "./drive-workspace";
import { getProjectResources } from "./project-resources";
import { analyzeSessionRecovery, STALL_OVERRIDE_HOURS } from "./session-recovery";
import type { SessionCloseRequest } from "./types";
import { getWorkflowRunById } from "./workflows";

export type FounderSessionOverview = {
  sessionId: string;
  sessionNumber: number | null;
  projectId: string;
  projectName: string;
  objective: string;
  currentAgent: string | null;
  nextAgent: string | null;
  currentArtifact: string | null;
  currentDeliverable: string | null;
  executionStatus: string;
  executionHealth: number;
  strategicHealth: number;
  ceoAlerts: string[];
  cooAlerts: string[];
  pendingApprovals: number;
  escalations: number;
  sessionStatus: string;
  isStalled: boolean;
  stallReasons: string[];
  lastActivityLabel: string;
  recommendedAction: string;
  canResume: boolean;
  canRequestClose: boolean;
  canForceClose: boolean;
  stallOverrideAllowed: boolean;
  pendingCloseRequest: SessionCloseRequest | null;
  executionReadiness: "READY" | "NOT_READY";
  readinessGaps: string[];
  projectMemoryConnected: boolean;
  driveWorkspaceConnected: boolean;
  repositoryConnected: boolean;
  documentationStatus: "healthy" | "degraded" | "missing";
  resourceStatus: "healthy" | "degraded" | "missing";
  aiReliability: import("./types").AIReliabilityStatus | null;
};

function formatHoursAgo(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export async function getFounderActiveSessionOverview(): Promise<FounderSessionOverview | null> {
  const active = await getAllActiveSessions();
  if (active.length === 0) return null;

  const primary = active[0];
  const session = await getWorkflowRunById(primary.id);
  if (!session) return null;

  await runCooSessionMonitor(primary.id);
  try {
    const { validateAndRepairIdleReadySession } = await import("./execution-release");
    await validateAndRepairIdleReadySession(primary.id);
  } catch {
    // Idle READY repair is best-effort
  }
  const [sessionState, monitor, approvals, recovery, readiness, resources, folders, driveDocs, aiReliability] =
    await Promise.all([
      (await import("./session-state-view")).getSessionStateView(primary.id),
      getCooMonitorSnapshot(primary.id),
      getWorkflowApprovals({ workflowId: primary.id, status: "pending" }),
      analyzeSessionRecovery(primary.id),
      evaluateExecutionReadiness(session.projectId, primary.id),
      getProjectResources(session.projectId),
      getProjectDriveFolders(session.projectId),
      getProjectDriveDocuments(session.projectId, 1),
      (await import("./ai-reliability")).getSessionAIReliability(primary.id),
    ]);

  const supabase = createSupabaseAdmin();
  const { count: escalationCount } = await supabase
    .from("session_escalations")
    .select("*", { count: "exact", head: true })
    .eq("workflow_run_id", primary.id)
    .eq("status", "open");

  const ceoAlerts: string[] = [];
  const cooAlerts: string[] = [];

  if (recovery?.isStalled) {
    ceoAlerts.push("Strategic risk: execution stalled — objective delayed");
    cooAlerts.push("Session appears stalled — recovery recommended");
  }
  if ((sessionState?.strategicHealth ?? 100) < 70) {
    ceoAlerts.push(`Strategic health below target: ${sessionState?.strategicHealth ?? 0}%`);
  }
  if ((sessionState?.executionHealth ?? 0) < 70) {
    cooAlerts.push(`Execution health low: ${sessionState?.executionHealth ?? 0}%`);
  }
  if (monitor && monitor.blockedTasks > 0) {
    cooAlerts.push(`${monitor.blockedTasks} blocked task(s)`);
  }
  if (approvals.length > 0) {
    ceoAlerts.push(`${approvals.length} approval(s) pending`);
  }

  return {
    sessionId: primary.id,
    sessionNumber: session.sessionNumber,
    projectId: session.projectId,
    projectName: session.projectName ?? "Project",
    objective: session.objective,
    currentAgent: sessionState?.currentAgentName ?? null,
    nextAgent: sessionState?.nextAgentName ?? null,
    currentArtifact: sessionState?.currentArtifact ?? null,
    currentDeliverable: sessionState?.currentDeliverable ?? null,
    executionStatus: sessionState?.executionReleasedAt ? "Active" : readiness.status,
    executionHealth: sessionState?.executionHealth ?? 0,
    strategicHealth: sessionState?.strategicHealth ?? 0,
    ceoAlerts,
    cooAlerts,
    pendingApprovals: approvals.length,
    escalations: escalationCount ?? 0,
    sessionStatus: session.sessionStatus,
    isStalled: recovery?.isStalled ?? false,
    stallReasons: recovery?.stallReasons ?? [],
    lastActivityLabel: recovery ? formatHoursAgo(recovery.lastActivityHoursAgo) : "—",
    recommendedAction: recovery?.recommendedAction ?? "Continue monitoring",
    canResume: recovery?.canResume ?? false,
    canRequestClose: recovery?.canRequestClose ?? false,
    canForceClose: recovery?.canForceClose ?? false,
    stallOverrideAllowed: recovery?.stallOverrideAllowed ?? false,
    pendingCloseRequest: recovery?.pendingCloseRequest ?? null,
    executionReadiness: readiness.status,
    readinessGaps: readiness.gaps,
    projectMemoryConnected: readiness.checks.find((c) => c.key === "project_memory")?.passed ?? false,
    driveWorkspaceConnected: folders.length >= 8,
    repositoryConnected: resources.some((r) => r.resourceType === "repository" && r.status === "active"),
    documentationStatus: !readiness.checks.find((c) => c.key === "documentation_agent")?.passed
      ? "missing"
      : driveDocs.length > 0
        ? "healthy"
        : "degraded",
    resourceStatus:
      resources.length >= 3 ? "healthy" : resources.length > 0 ? "degraded" : "missing",
    aiReliability,
  };
}

export { STALL_OVERRIDE_HOURS };
