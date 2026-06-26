import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import {
  getProjectGovernance,
  getWorkflowApprovals,
  processApprovalDecision,
  resolveApprovalMode,
  getApprovalPolicies,
} from "./governance";
import type { Agent, ApprovalType, GovernanceProfile, WorkflowMode } from "./types";

/** Operational gates the COO may approve without founder intervention. */
const COO_OPERATIONAL_TYPES = new Set<ApprovalType>([
  "requirements",
  "architecture",
  "milestones",
  "task_plan",
  "execution_readiness",
  "release",
  "document",
]);

const FOUNDER_ONLY_TYPES = new Set<ApprovalType>([
  "strategic_objective",
  "security",
  "infrastructure",
  "database_change",
]);

export async function shouldCooAutoApprove(
  projectId: string,
  approvalType: ApprovalType,
  context: Record<string, unknown> = {},
): Promise<boolean> {
  const { governanceProfile, workflowMode } = await getProjectGovernance(projectId);
  const policies = await getApprovalPolicies();
  const policy = policies.find((p) => p.approvalType === approvalType && p.active) ?? null;
  const mode = resolveApprovalMode(
    policy,
    governanceProfile,
    workflowMode,
    approvalType,
    context,
  );

  if (mode === "auto") return true;
  if (mode === "escalated") return false;

  if (FOUNDER_ONLY_TYPES.has(approvalType)) {
    return governanceProfile === "autonomous" && workflowMode === "autonomous";
  }

  if (!COO_OPERATIONAL_TYPES.has(approvalType)) {
    return false;
  }

  if (workflowMode === "autonomous" || governanceProfile === "autonomous") {
    return true;
  }

  if (policy?.mode === "auto") return true;

  return false;
}

export async function findCooActor(): Promise<{ id: string; name: string } | null> {
  const agents = await getAgents();
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo) return null;
  return { id: coo.id, name: coo.name };
}

/**
 * COO resolves pending approvals so sessions never stall in waiting_approval.
 * Returns count of approvals processed.
 */
export async function processCooPendingApprovals(workflowId?: string): Promise<number> {
  const pending = await getWorkflowApprovals({
    status: "pending",
    workflowId,
  });

  if (pending.length === 0) return 0;

  const coo = await findCooActor();
  if (!coo) return 0;

  let processed = 0;

  for (const approval of pending) {
    const context =
      approval.approvalType === "release" ? { releaseType: "standard" as const } : {};

    const ok = await shouldCooAutoApprove(approval.projectId, approval.approvalType, context);
    if (!ok) continue;

    try {
      await processApprovalDecision(
        approval.id,
        "approved",
        coo.name,
        `COO auto-approved ${approval.approvalType} — autonomous execution continues`,
      );
      processed += 1;
    } catch (error) {
      console.warn("[coo-approval-engine] failed to approve", approval.id, error);
    }
  }

  return processed;
}

/** Resolve a single step approval gate during orchestration — returns true if execution may continue. */
export async function cooApproveStepIfEligible(
  workflowId: string,
  projectId: string,
  approvalType: ApprovalType,
  agents?: Agent[],
): Promise<boolean> {
  const pending = await getWorkflowApprovals({ workflowId, status: "pending" });
  const stepApproval = pending.find((a) => a.approvalType === approvalType);
  if (!stepApproval) return true;

  if (!(await shouldCooAutoApprove(projectId, approvalType))) {
    return false;
  }

  const agentList = agents ?? (await getAgents());
  const coo = findAgentForRole(agentList, ["COO", "Chief Operating"]);
  if (!coo) return false;

  try {
    await processApprovalDecision(
      stepApproval.id,
      "approved",
      coo.name,
      `COO approved ${approvalType} — continuing orchestration`,
    );
    await clearSessionWaitingApproval(workflowId);
    return true;
  } catch (error) {
    console.warn("[coo-approval-engine] step approval failed:", approvalType, error);
    return false;
  }
}

/** Unstick sessions stuck in waiting_approval after COO processed queue. */
export async function clearSessionWaitingApproval(sessionId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const remaining = await getWorkflowApprovals({ workflowId: sessionId, status: "pending" });
  if (remaining.length > 0) return;

  const { data: wf } = await supabase
    .from("workflow_runs")
    .select("session_status, status, project_id, objective")
    .eq("id", sessionId)
    .maybeSingle();

  if (!wf || wf.session_status !== "waiting_approval") return;

  await supabase
    .from("workflow_runs")
    .update({
      session_status: "executing",
      status: "running",
      governance_status: "normal",
    })
    .eq("id", sessionId);

  const { data: orch } = await supabase
    .from("orchestration_runs")
    .select("status")
    .eq("workflow_id", sessionId)
    .maybeSingle();

  if (orch?.status === "WAITING") {
    await supabase.from("orchestration_runs").update({ status: "RUNNING" }).eq("workflow_id", sessionId);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", wf.project_id)
    .maybeSingle();

  try {
    const { resumeOrchestration } = await import("./orchestration");
    await resumeOrchestration(
      sessionId,
      wf.project_id as string,
      wf.objective as string,
      (project?.name as string) ?? "Project",
    );
  } catch {
    // resume is best-effort
  }
}

export async function processAllStuckApprovalSessions(): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const { data: stuck } = await supabase
    .from("workflow_runs")
    .select("id")
    .in("status", ["running", "paused"])
    .in("session_status", ["waiting_approval", "blocked"])
    .limit(30);

  const resumed: string[] = [];

  for (const row of stuck ?? []) {
    const sessionId = row.id as string;
    await processCooPendingApprovals(sessionId);
    const stillPending = await getWorkflowApprovals({ workflowId: sessionId, status: "pending" });
    if (stillPending.length === 0) {
      await clearSessionWaitingApproval(sessionId);
      resumed.push(sessionId);
    }
  }

  return resumed;
}

/** Auto-close sessions with knowledge archive or COO-accepted completion in hands-off mode. */
export async function processAutoFinalizationSessions(): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const finalized: string[] = [];

  const { data: needsClose } = await supabase
    .from("workflow_runs")
    .select("id, project_id, session_status, status")
    .in("status", ["running", "paused"])
    .in("session_status", ["executing", "running", "needs_founder_review", "waiting_approval"])
    .limit(20);

  const { finalizeSession, isSessionFinalizationPending } = await import(
    "./session-finalization-engine"
  );

  for (const row of needsClose ?? []) {
    const sessionId = row.id as string;
    const projectId = row.project_id as string;

    if (!(await isProjectHandsOff(projectId))) continue;

    await processCooPendingApprovals(sessionId);

    if (row.session_status === "needs_founder_review") {
      try {
        const result = await finalizeSession(sessionId);
        if (result.finalized) finalized.push(sessionId);
      } catch {
        // best-effort
      }
      continue;
    }

    const pending = await isSessionFinalizationPending(sessionId);
    if (!pending) continue;

    try {
      const result = await finalizeSession(sessionId);
      if (result.finalized) finalized.push(sessionId);
    } catch {
      // best-effort
    }
  }

  const { data: orchComplete } = await supabase
    .from("orchestration_runs")
    .select("workflow_id")
    .eq("status", "COMPLETED")
    .limit(15);

  for (const row of orchComplete ?? []) {
    const sessionId = row.workflow_id as string;
    if (finalized.includes(sessionId)) continue;

    const { data: wf } = await supabase
      .from("workflow_runs")
      .select("project_id, session_status, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (!wf || wf.status === "completed") continue;

    if (!(await isProjectHandsOff(wf.project_id as string))) continue;

    try {
      const result = await finalizeSession(sessionId);
      if (result.finalized) finalized.push(sessionId);
    } catch {
      // best-effort
    }
  }

  return finalized;
}

/** Full hands-off tick — COO approvals + auto finalization. */
export async function runCooAutonomousTick(): Promise<{
  approvalsProcessed: number;
  sessionsResumed: string[];
  sessionsFinalized: string[];
}> {
  const sessionsResumed = await processAllStuckApprovalSessions();
  const sessionsFinalized = await processAutoFinalizationSessions();

  let approvalsProcessed = 0;
  for (const id of sessionsResumed) {
    approvalsProcessed += await processCooPendingApprovals(id);
  }
  approvalsProcessed += await processCooPendingApprovals();

  return { approvalsProcessed, sessionsResumed, sessionsFinalized };
}

export function isHandsOffGovernance(
  governanceProfile: GovernanceProfile,
  workflowMode: WorkflowMode,
): boolean {
  return governanceProfile === "autonomous" || workflowMode === "autonomous";
}

/** True when project uses hands-off execution (autonomous profile/mode OR all policies set to auto). */
export async function isProjectHandsOff(projectId: string): Promise<boolean> {
  const { governanceProfile, workflowMode } = await getProjectGovernance(projectId);
  if (isHandsOffGovernance(governanceProfile, workflowMode)) return true;

  const policies = await getApprovalPolicies().catch(() => []);
  const active = policies.filter((p) => p.active);
  if (active.length === 0) return false;
  return active.every((p) => p.mode === "auto");
}
