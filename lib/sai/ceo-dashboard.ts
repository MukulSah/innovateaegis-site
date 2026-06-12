import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { computeSessionHealth } from "./execution-health";
import { getWorkflowApprovals } from "./governance";
import { getAllActiveSessions } from "./session-manager";
import { computeStrategicHealth } from "./strategic-health";
import { getWorkflowRunById } from "./workflows";
import type { SessionEscalation, SessionStatus } from "./types";

export type CeoSponsoredSession = {
  id: string;
  sessionNumber: number | null;
  projectName: string;
  objective: string;
  sessionStatus: SessionStatus;
  currentProgress: number;
  expectedProgress: number;
  strategicHealth: number;
  executionHealth: number;
  businessRisk: string;
  behindSchedule: boolean;
};

export type CeoDashboardData = {
  sponsoredSessions: CeoSponsoredSession[];
  strategicRisks: { sessionId: string; label: string; risk: string }[];
  blockedObjectives: CeoSponsoredSession[];
  delayedSessions: CeoSponsoredSession[];
  successMetrics: { sessionId: string; objective: string; metrics: string }[];
  escalations: SessionEscalation[];
  recentDecisions: { title: string; createdAt: string }[];
  pendingApprovals: Awaited<ReturnType<typeof getWorkflowApprovals>>;
  aiReliability: import("./types").AIReliabilityStatus;
};

type EscalationRow = {
  id: string;
  workflow_run_id: string;
  issue: string;
  owner: string;
  priority: string;
  status: string;
  created_by_agent_id: string | null;
  created_at: string;
};

async function buildSponsoredSession(
  sessionId: string,
  agents: Awaited<ReturnType<typeof getAgents>>,
): Promise<CeoSponsoredSession | null> {
  const workflow = await getWorkflowRunById(sessionId);
  if (!workflow) return null;

  const [strategic, execution] = await Promise.all([
    computeStrategicHealth(sessionId),
    computeSessionHealth(sessionId),
  ]);

  return {
    id: sessionId,
    sessionNumber: workflow.sessionNumber,
    projectName: workflow.projectName ?? "Project",
    objective: workflow.objective,
    sessionStatus: workflow.sessionStatus,
    currentProgress: strategic.currentProgress,
    expectedProgress: strategic.expectedProgress,
    strategicHealth: strategic.score,
    executionHealth: execution.score,
    businessRisk: strategic.businessRisk,
    behindSchedule: strategic.behindSchedule,
  };
}

export async function getCeoDashboard(ceoAgentId: string): Promise<CeoDashboardData> {
  const agents = await getAgents();
  const active = await getAllActiveSessions();
  const sponsored = active.filter((s) => s.executive_sponsor_agent_id === ceoAgentId);

  const sessions = (
    await Promise.all(sponsored.map((s) => buildSponsoredSession(s.id, agents)))
  ).filter((s): s is CeoSponsoredSession => s !== null);

  const strategicRisks = sessions
    .filter((s) => s.businessRisk === "high" || s.businessRisk === "critical" || s.behindSchedule)
    .map((s) => ({
      sessionId: s.id,
      label: `Session #${s.sessionNumber} — ${s.objective}`,
      risk: s.behindSchedule
        ? `Behind schedule (${s.currentProgress}% vs ${s.expectedProgress}% expected)`
        : `${s.businessRisk} business risk`,
    }));

  const blockedObjectives = sessions.filter((s) => s.sessionStatus === "blocked");
  const delayedSessions = sessions.filter((s) => s.behindSchedule);

  const successMetrics = await Promise.all(
    sessions.slice(0, 10).map(async (s) => {
      const wf = await getWorkflowRunById(s.id);
      const brief = (wf?.strategicBrief as Record<string, unknown>) ?? {};
      return {
        sessionId: s.id,
        objective: s.objective,
        metrics: String(brief.successMetric ?? "No metrics defined"),
      };
    }),
  );

  const supabase = createSupabaseAdmin();
  const { data: escalationRows } = await supabase
    .from("session_escalations")
    .select("*")
    .in(
      "workflow_run_id",
      sponsored.length ? sponsored.map((s) => s.id) : ["00000000-0000-0000-0000-000000000000"],
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: timeline } = await supabase
    .from("company_timeline")
    .select("title, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const pendingApprovals = (
    await Promise.all(
      sponsored.map((s) => getWorkflowApprovals({ workflowId: s.id, status: "pending" })),
    )
  ).flat();

  const { getSessionAIReliability, getGlobalAIReliability } = await import("./ai-reliability");
  const aiReliability = sessions[0]
    ? await getSessionAIReliability(sessions[0].id)
    : await getGlobalAIReliability();

  return {
    sponsoredSessions: sessions,
    strategicRisks,
    blockedObjectives,
    delayedSessions,
    successMetrics,
    aiReliability,
    escalations: (escalationRows ?? []).map((row) => ({
      id: row.id,
      workflowRunId: row.workflow_run_id,
      issue: row.issue,
      owner: row.owner,
      priority: row.priority as SessionEscalation["priority"],
      status: row.status as SessionEscalation["status"],
      createdByAgentId: row.created_by_agent_id,
      createdAt: row.created_at,
    })),
    recentDecisions: (timeline ?? []).map((t) => ({
      title: t.title,
      createdAt: t.created_at,
    })),
    pendingApprovals,
  };
}

export async function getCeoAgentId(): Promise<string | null> {
  const agents = await getAgents();
  return findAgentForRole(agents, ["CEO", "Chief Executive"])?.id ?? null;
}
