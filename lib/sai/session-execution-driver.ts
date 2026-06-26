import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { getSessionArtifacts } from "./session-artifacts";
import { getSessionHandoffs } from "./coo-routing";
import { getWorkflowRunById } from "./workflows";
import { getPrimarySdlcChain, SDLC_WORKFLOW } from "./sdlc";
import { updateSessionStatePointers } from "./session-state-view";
import { touchSessionActivity } from "./session-manager";
import { triggerStepExecution } from "./step-execution";

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

/** Backfill CEO / COO session artifacts from strategic_brief when pre-session steps were skipped. */
export async function ensureExecutiveSessionArtifacts(sessionId: string): Promise<string[]> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) return [];

  const artifacts = await getSessionArtifacts(sessionId);
  const actions: string[] = [];
  const brief = session.strategicBrief ?? {};
  const agents = await getAgents();
  const ceo =
    (session.executiveSponsorAgentId
      ? agents.find((a) => a.id === session.executiveSponsorAgentId)
      : null) ?? findAgentForRole(agents, ["CEO", "Chief Executive"]);
  const coo =
    (session.sessionOwnerAgentId
      ? agents.find((a) => a.id === session.sessionOwnerAgentId)
      : null) ?? findAgentForRole(agents, ["COO", "Chief Operating"]);

  const hasCeo = artifacts.some(
    (a) => a.stepKey === "ceo_strategy" || a.artifactName === "strategic_brief_v1",
  );
  if (!hasCeo && ceo) {
    const priority = String(brief.priority ?? "High");
    const successMetric = String(brief.successMetric ?? "Objective completion");
    const content = `# Strategic Brief

## Objective
${session.objective}

## Business Assessment
Executive sponsor review for ${session.projectName ?? "project"}.

## Priority
${priority}

## Expected Outcome
${String(brief.expectedOutcome ?? "Deliver measurable progress against the stated objective.")}

## Success Metrics
- ${successMetric}

## Recommendation
Proceed — COO owns session execution.

_Sourced from session strategic brief._`;

    await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId: session.projectId,
      agentId: ceo.id,
      stepKey: "ceo_strategy",
      artifactName: "strategic_brief_v1",
      content,
      artifactType: "strategic_brief",
    });
    actions.push("CEO strategic brief artifact created");
  }

  const hasCoo = artifacts.some(
    (a) =>
      a.stepKey === "coo_execution" ||
      a.artifactName === "coo_execution_plan_v1" ||
      a.artifactName === "execution_release_v1",
  );
  if (!hasCoo && coo) {
    const cooPlan = (brief.cooPlan as Record<string, unknown> | undefined) ?? {};
    const requiredAgents = Array.isArray(cooPlan.requiredAgents)
      ? (cooPlan.requiredAgents as string[]).join(", ")
      : "Product Manager, Architect, Engineer, QA";
    const recommendation = String(cooPlan.recommendation ?? "Execute primary SDLC chain autonomously.");
    const workflow = String(cooPlan.workflow ?? "Standard delivery workflow");

    const content = `# COO Execution Plan

## Project
${session.projectName ?? "Project"}

## Session Objective
${session.objective}

## Workflow
${workflow}

## Required Agents
${requiredAgents}

## Recommendation
${recommendation}

## Scope
${String(cooPlan.scope ?? "Full session delivery from requirements through knowledge archive.")}

_Sourced from session strategic brief / COO planning._`;

    await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId: session.projectId,
      agentId: coo.id,
      stepKey: "coo_execution",
      artifactName: "coo_execution_plan_v1",
      content,
      artifactType: "execution_plan",
    });
    actions.push("COO execution plan artifact created");
  }

  return actions;
}

/** Reset AI queue, orchestration, and session status so autonomous execution can continue. */
export async function clearExecutionBlockers(sessionId: string): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const actions: string[] = [];
  const now = new Date().toISOString();

  const { data: queueRows } = await supabase
    .from("ai_retry_queue")
    .select("id, status")
    .eq("workflow_run_id", sessionId)
    .in("status", ["queued", "waiting", "processing", "template_fallback"]);

  for (const row of queueRows ?? []) {
    if (row.status === "template_fallback") {
      await supabase
        .from("ai_retry_queue")
        .update({ status: "completed", updated_at: now })
        .eq("id", row.id as string);
      actions.push("AI queue cleared — next run uses template mode");
      continue;
    }
    await supabase
      .from("ai_retry_queue")
      .update({
        status: "waiting",
        next_attempt_at: now,
        updated_at: now,
      })
      .eq("id", row.id as string);
    actions.push("AI retry queue scheduled for immediate retry");
  }

  const [{ data: orch }, { data: inProgressStep }] = await Promise.all([
    supabase.from("orchestration_runs").select("status").eq("workflow_id", sessionId).maybeSingle(),
    supabase
      .from("workflow_run_steps")
      .select("step_key")
      .eq("workflow_run_id", sessionId)
      .eq("status", "in_progress")
      .limit(1)
      .maybeSingle(),
  ]);

  const deadOrchestration =
    orch?.status === "COMPLETED" && Boolean(inProgressStep);
  const revivableOrch =
    orch?.status === "FAILED" ||
    orch?.status === "WAITING" ||
    orch?.status === "PAUSED" ||
    deadOrchestration;

  if (revivableOrch) {
    await supabase
      .from("orchestration_runs")
      .update({ status: "RUNNING", completed_at: null })
      .eq("workflow_id", sessionId);
    actions.push(
      deadOrchestration
        ? "Orchestration revived — primary step still in progress"
        : `Orchestration reset from ${orch?.status as string}`,
    );
  }

  const { data: wf } = await supabase
    .from("workflow_runs")
    .select("session_status, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (wf?.session_status === "waiting_for_ai_capacity" || wf?.session_status === "stalled") {
    await supabase
      .from("workflow_runs")
      .update({ session_status: "executing", stalled_at: null })
      .eq("id", sessionId);
    actions.push(`Session status cleared (${wf.session_status as string} → executing)`);
  }

  if (wf?.status === "blocked") {
    await supabase.from("workflow_runs").update({ status: "running" }).eq("id", sessionId);
    actions.push("Workflow status unblocked");
  }

  return actions;
}

/** Accept pending handoffs and align workflow pointers to the assigned agent step. */
export async function resolvePendingHandoffsForResume(sessionId: string): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const handoffs = await getSessionHandoffs(sessionId);
  const pending = handoffs.filter((h) => h.status === "pending");
  if (!pending.length) return [];

  const actions: string[] = [];
  const latest = pending[0];
  const toStepKey = latest.toStepKey;
  const agentId = latest.assignedToAgentId;
  if (!toStepKey || !agentId) return [];

  const now = new Date().toISOString();
  await supabase
    .from("session_handoffs")
    .update({ status: "accepted" })
    .eq("id", latest.id);

  await supabase
    .from("workflow_run_steps")
    .update({ status: "in_progress", started_at: now, assigned_agent_id: agentId })
    .eq("workflow_run_id", sessionId)
    .eq("step_key", toStepKey);

  const sdlc = SDLC_WORKFLOW.find((s) => s.key === toStepKey);
  await updateSessionStatePointers({
    sessionId,
    currentAgentId: agentId,
    workflowStage: toStepKey,
    currentStage: sdlc?.label ?? toStepKey,
    sessionStatus: "executing",
  });

  actions.push(`Pending handoff accepted → ${toStepKey}`);
  return actions;
}

/** Undo erroneous skips on primary chain steps that never produced artifacts. */
export async function repairIncorrectlySkippedSteps(sessionId: string): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const primaryKeys = new Set(getPrimarySdlcChain().map((s) => s.key));
  const artifacts = await getSessionArtifacts(sessionId);

  const { data: steps } = await supabase
    .from("workflow_run_steps")
    .select("id, step_key, status")
    .eq("workflow_run_id", sessionId);

  const actions: string[] = [];
  for (const step of steps ?? []) {
    const key = step.step_key as string;
    if (!primaryKeys.has(key) || step.status !== "skipped") continue;
    const hasArtifact = artifacts.some((a) => a.stepKey === key);
    if (hasArtifact) continue;

    await supabase
      .from("workflow_run_steps")
      .update({ status: "pending", started_at: null, completed_at: null })
      .eq("id", step.id as string);
    actions.push(`Restored skipped step: ${key}`);
  }

  return actions;
}

export async function prepareSessionForExecution(sessionId: string): Promise<string[]> {
  const actions: string[] = [];
  actions.push(...(await ensureExecutiveSessionArtifacts(sessionId)));
  actions.push(...(await clearExecutionBlockers(sessionId)));
  actions.push(...(await repairIncorrectlySkippedSteps(sessionId)));
  actions.push(...(await resolvePendingHandoffsForResume(sessionId)));
  await touchSessionActivity(sessionId);
  return actions;
}

export async function driveSessionExecution(sessionId: string): Promise<{
  triggered: boolean;
  preparation: string[];
  message: string;
}> {
  const preparation = await prepareSessionForExecution(sessionId);
  const triggered = await triggerStepExecution(sessionId, { forceResume: true });

  const supabase = createSupabaseAdmin();
  const { data: orch } = await supabase
    .from("orchestration_runs")
    .select("status")
    .eq("workflow_id", sessionId)
    .maybeSingle();

  const running = triggered && (orch?.status === "RUNNING" || orch?.status === "WAITING");
  const message = running
    ? "Autonomous execution resumed"
    : triggered
      ? "Execution triggered — monitor timeline for agent progress"
      : "Session prepared but orchestration did not start — check session status or approvals";

  return { triggered: running || triggered, preparation, message };
}

/** Background tick — COO approvals, auto-finalize, AI queue, stuck orchestration. */
export async function tickAutonomousSessions(): Promise<{
  queueProcessed: number;
  sessionsResumed: string[];
  cooApprovals: number;
  sessionsFinalized: string[];
}> {
  const { runCooAutonomousTick } = await import("./coo-approval-engine");
  const cooTick = await runCooAutonomousTick();

  const { processDueQueueEntries } = await import("./recovery-queue");
  const queueProcessed = await processDueQueueEntries();
  const supabase = createSupabaseAdmin();
  const sessionsResumed: string[] = [...cooTick.sessionsResumed];

  const { data: waitingSessions } = await supabase
    .from("workflow_runs")
    .select("id")
    .eq("status", "running")
    .eq("session_status", "waiting_for_ai_capacity")
    .limit(5);

  for (const row of waitingSessions ?? []) {
    try {
      const result = await driveSessionExecution(row.id as string);
      if (result.triggered) sessionsResumed.push(row.id as string);
    } catch {
      // best-effort per session
    }
  }

  const { data: stuckOrch } = await supabase
    .from("orchestration_runs")
    .select("workflow_id, status")
    .in("status", ["FAILED", "WAITING", "COMPLETED"])
    .limit(10);

  for (const row of stuckOrch ?? []) {
    const sessionId = row.workflow_id as string;
    if (sessionsResumed.includes(sessionId)) continue;

    const { data: wf } = await supabase
      .from("workflow_runs")
      .select("status, session_status")
      .eq("id", sessionId)
      .maybeSingle();

    const terminal = new Set(["completed", "cancelled", "failed"]);
    if (wf?.status !== "running" || terminal.has((wf.session_status as string) ?? "")) continue;

    if (row.status === "COMPLETED") {
      const { data: activeStep } = await supabase
        .from("workflow_run_steps")
        .select("step_key")
        .eq("workflow_run_id", sessionId)
        .eq("status", "in_progress")
        .limit(1)
        .maybeSingle();
      if (!activeStep) continue;
    }

    try {
      const result = await driveSessionExecution(sessionId);
      if (result.triggered) sessionsResumed.push(sessionId);
    } catch {
      // best-effort
    }
  }

  return {
    queueProcessed,
    sessionsResumed,
    cooApprovals: cooTick.approvalsProcessed,
    sessionsFinalized: cooTick.sessionsFinalized,
  };
}

export { formatDuration };
