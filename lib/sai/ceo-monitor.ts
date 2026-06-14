import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { createSessionEscalation } from "./coo-dashboard";
import { computeSessionHealth } from "./execution-health";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { postExecutiveMessage } from "./executive-session-chat";
import { getWorkflowApprovals } from "./governance";
import { computeStrategicHealth } from "./strategic-health";
import { getWorkflowRunById } from "./workflows";
import type { Agent } from "./types";

export type CeoEscalationTrigger =
  | "session_blocked"
  | "approval_delayed"
  | "agent_failures"
  | "low_execution_health"
  | "missed_milestone"
  | "execution_stalled"
  | "manual";

export type CeoMonitoringResult = {
  sessionId: string;
  strategicHealth: Awaited<ReturnType<typeof computeStrategicHealth>>;
  executionHealth: Awaited<ReturnType<typeof computeSessionHealth>>;
  triggers: CeoEscalationTrigger[];
  monitoringReviewId?: string;
  escalationId?: string;
};

const FAILURE_THRESHOLD = 2;
const APPROVAL_DELAY_HOURS = 24;
const BLOCKED_DELAY_HOURS = 24;
const HEALTH_THRESHOLD = 70;
const ESCALATION_GRACE_MINUTES = 30;

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function minutesSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60);
}

/** No CEO escalation noise during session bootstrap, release, or before first deliverable. */
async function isInEscalationGracePeriod(
  sessionId: string,
  workflow: {
    session_status: string | null;
    created_at: string;
    current_agent_id: string | null;
    execution_released_at: string | null;
  } | null,
): Promise<boolean> {
  if (!workflow) return true;
  if (minutesSince(workflow.created_at) < ESCALATION_GRACE_MINUTES) return true;
  if (workflow.session_status === "planning" || workflow.session_status === "execution_releasing") {
    return true;
  }

  const { isInExecutionReleaseGrace } = await import("./execution-release");
  if (await isInExecutionReleaseGrace(sessionId)) return true;

  if (!workflow.current_agent_id && !workflow.execution_released_at) return true;

  const supabase = createSupabaseAdmin();
  const { count } = await supabase
    .from("session_artifacts")
    .select("*", { count: "exact", head: true })
    .eq("workflow_run_id", sessionId)
    .not("artifact_type", "eq", "context_package")
    .in("artifact_name", ["requirements_v1", "architecture_v1", "design_v1"]);

  if (!count || count === 0) {
    const { count: anyDeliverable } = await supabase
      .from("session_artifacts")
      .select("*", { count: "exact", head: true })
      .eq("workflow_run_id", sessionId)
      .neq("artifact_type", "context_package");
    if (!anyDeliverable || anyDeliverable === 0) return true;
  }

  return false;
}

export async function evaluateCeoEscalationRules(sessionId: string): Promise<CeoEscalationTrigger[]> {
  const supabase = createSupabaseAdmin();
  const [workflow, executionHealth, strategicHealth, approvals, escalations] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("session_status, created_at, updated_at, current_agent_id, execution_released_at")
      .eq("id", sessionId)
      .maybeSingle(),
    computeSessionHealth(sessionId),
    computeStrategicHealth(sessionId),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
    supabase
      .from("session_escalations")
      .select("created_at, status")
      .eq("workflow_run_id", sessionId)
      .eq("status", "open"),
  ]);

  const triggers: CeoEscalationTrigger[] = [];
  const inGrace = await isInEscalationGracePeriod(sessionId, workflow.data);

  if (workflow.data?.session_status === "blocked") {
    const blockedSince = workflow.data.updated_at ?? workflow.data.created_at;
    if (blockedSince && hoursSince(blockedSince) >= BLOCKED_DELAY_HOURS) {
      triggers.push("session_blocked");
    }
  }

  for (const approval of approvals) {
    if (hoursSince(approval.requestedAt) >= APPROVAL_DELAY_HOURS) {
      triggers.push("approval_delayed");
      break;
    }
  }

  if (!inGrace && executionHealth.failedTurns >= FAILURE_THRESHOLD) {
    triggers.push("agent_failures");
  }

  if (!inGrace && executionHealth.score < HEALTH_THRESHOLD) {
    triggers.push("low_execution_health");
  }

  if (!inGrace && strategicHealth.behindSchedule) {
    triggers.push("missed_milestone");
  }

  if (workflow.data?.session_status === "stalled" || workflow.data?.session_status === "recovery") {
    const { isInExecutionReleaseGrace } = await import("./execution-release");
    if (!(await isInExecutionReleaseGrace(sessionId))) {
      triggers.push("execution_stalled");
    }
  }

  return [...new Set(triggers)];
}

function buildMonitoringReviewContent(
  session: NonNullable<Awaited<ReturnType<typeof getWorkflowRunById>>>,
  strategic: Awaited<ReturnType<typeof computeStrategicHealth>>,
  execution: Awaited<ReturnType<typeof computeSessionHealth>>,
  triggers: CeoEscalationTrigger[],
): string {
  const brief = session.strategicBrief as Record<string, unknown>;
  const assessment =
    triggers.length > 0
      ? `Executive attention required. ${triggers.length} risk signal(s) detected.`
      : strategic.behindSchedule
        ? "Execution is behind schedule."
        : "Session aligned with strategic objectives.";

  return `# CEO Monitoring Review

## Session #${session.sessionNumber ?? "—"}
**Project:** ${session.projectName ?? "Project"}
**Objective:** ${session.objective}

## Progress
- Current Progress: ${strategic.currentProgress}%
- Expected Progress: ${strategic.expectedProgress}%

## CEO Assessment
${assessment}

## Risk
${strategic.businessRisk.charAt(0).toUpperCase() + strategic.businessRisk.slice(1)} (timeline: ${strategic.timelineRisk})

## Strategic Health: ${strategic.score}%
## Execution Health: ${execution.score}%

## Success Metrics
${String(brief.successMetric ?? strategic.successMetricProbability + "% probability")}

## Recommendation
${
  triggers.includes("missed_milestone") || strategic.behindSchedule
    ? "COO review resource allocation and timeline."
    : triggers.includes("approval_delayed")
      ? "Follow up on pending approvals to unblock delivery."
      : "Continue monitoring. No executive intervention required."
}

## Triggers
${triggers.length ? triggers.map((t) => `- ${t.replace(/_/g, " ")}`).join("\n") : "- None"}
`;
}

function buildEscalationContent(
  issue: string,
  strategic: Awaited<ReturnType<typeof computeStrategicHealth>>,
  triggers: CeoEscalationTrigger[],
): string {
  const priority =
    triggers.includes("session_blocked") || strategic.businessRisk === "critical"
      ? "critical"
      : triggers.includes("low_execution_health")
        ? "high"
        : "medium";

  return `# CEO Escalation

## Issue
${issue}

## Impact
${strategic.customerImpact}

## Business Risk
${strategic.businessRisk} — ${strategic.revenueImpact}

## Recommended Action
COO to review execution plan, reallocate agents, and resolve blockers within 24 hours.

## Assigned To
COO (Session Owner)

## Priority
${priority}
`;
}

export async function runCeoSessionMonitor(
  sessionId: string,
  opts?: { event?: string; forceEscalation?: boolean },
): Promise<CeoMonitoringResult | null> {
  const agents = await getAgents();
  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  if (!ceo) return null;

  const session = await getWorkflowRunById(sessionId);
  if (!session || session.status !== "running") return null;

  const [strategicHealth, executionHealth, triggers] = await Promise.all([
    computeStrategicHealth(sessionId),
    computeSessionHealth(sessionId),
    evaluateCeoEscalationRules(sessionId),
  ]);

  const reviewContent = buildMonitoringReviewContent(
    session,
    strategicHealth,
    executionHealth,
    triggers,
  );

  const monitoringReviewId = await recordExecutiveArtifact({
    workflowRunId: sessionId,
    projectId: session.projectId,
    agentId: ceo.id,
    stepKey: "ceo_monitoring",
    artifactName: "ceo_monitoring_review_v1",
    content: reviewContent,
  });

  const chatSummary =
    triggers.length > 0
      ? `Risk detected (${strategicHealth.businessRisk}). ${strategicHealth.behindSchedule ? "Execution is behind schedule." : "Monitoring escalation signals."}`
      : `Strategic monitoring: ${strategicHealth.currentProgress}% complete. Alignment ${strategicHealth.goalAlignment}%.`;

  await postExecutiveMessage(ceo, sessionId, chatSummary, {
    projectId: session.projectId,
    stepKey: "ceo_monitoring",
    artifactName: "ceo_monitoring_review_v1",
  });

  let escalationId: string | undefined;
  if (triggers.length > 0 || opts?.forceEscalation) {
    const issue =
      triggers[0] === "approval_delayed"
        ? "Approval pending beyond 24 hours"
        : triggers[0] === "session_blocked"
          ? "Session blocked beyond 24 hours"
          : triggers[0] === "missed_milestone"
            ? "Execution behind expected milestone"
            : triggers[0] === "low_execution_health"
              ? `Execution health below ${HEALTH_THRESHOLD}%`
              : triggers[0] === "execution_stalled"
                ? "Execution stalled — no active agent, approval, or handoff"
                : opts?.event ?? "Executive review triggered";

    const escContent = buildEscalationContent(issue, strategicHealth, triggers);
    escalationId = await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId: session.projectId,
      agentId: ceo.id,
      stepKey: "ceo_escalation",
      artifactName: "ceo_escalation_v1",
      content: escContent,
    });

    const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
    if (coo) {
      await createSessionEscalation({
        sessionId,
        issue,
        owner: "COO",
        priority: strategicHealth.businessRisk === "critical" ? "critical" : "high",
        createdByAgentId: ceo.id,
      });
    }

    await postExecutiveMessage(ceo, sessionId, `Escalation: ${issue}. COO action required.`, {
      projectId: session.projectId,
      stepKey: "ceo_escalation",
      artifactName: "ceo_escalation_v1",
    });

    try {
      const { fireAgentAutomation, fireAutomationEvent } = await import("./session-automation");
      if (triggers.includes("missed_milestone") || strategicHealth.behindSchedule) {
        await fireAgentAutomation("CEO", "growth_opportunity", {
          sessionId,
          objective: session.objective,
          opportunityTitle: session.objective.slice(0, 80),
        });
      }
      if (triggers.includes("session_blocked") || triggers.includes("execution_stalled")) {
        await fireAutomationEvent("critical_incident", {
          sessionId,
          objective: session.objective,
          incidentTitle: issue.slice(0, 80),
        });
      }
    } catch {
      // Automation triggers are best-effort
    }
  }

  return {
    sessionId,
    strategicHealth,
    executionHealth,
    triggers,
    monitoringReviewId,
    escalationId,
  };
}

export async function getCeoAgent(): Promise<Agent | null> {
  const agents = await getAgents();
  return findAgentForRole(agents, ["CEO", "Chief Executive"]);
}
