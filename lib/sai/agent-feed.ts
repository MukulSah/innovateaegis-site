import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgents } from "./agents";
import { getWorkflowApprovals } from "./governance";
import { getSessionArtifacts, type SessionArtifact } from "./session-artifacts";
import { SDLC_WORKFLOW } from "./sdlc";

export type AgentFeedItem = {
  id: string;
  type: "turn" | "approval" | "handoff";
  agentName: string;
  agentRole: string;
  stepKey: string;
  headline: string;
  body: string;
  artifactName: string | null;
  artifactType: string | null;
  decision: string | null;
  approvalId: string | null;
  approvalStatus: string | null;
  projectName: string | null;
  createdAt: string;
};

const STEP_HEADLINES: Record<string, string> = {
  ceo_strategy: "Strategic Brief Generated",
  ceo_monitoring: "CEO Monitoring Review",
  ceo_escalation: "CEO Escalation Raised",
  coo_stall_review: "COO Stall Review",
  coo_execution: "COO Execution Plan Created",
  execution_readiness: "COO Execution Readiness Review",
  execution_release: "Execution Released",
  session_closure_review: "Session Closure Review",
  execution_summary: "Execution Summary Published",
  executive_review: "Executive Review Complete",
  session_final_report: "Session Final Report",
  requirements: "Requirements Created",
  design: "Architecture Submitted",
  tasks: "Task Plan Created",
  implementation: "Implementation Progress",
  validation: "QA Validation Complete",
  deployment: "Staging Deployment Report",
  documentation: "Documentation Published",
  knowledge: "Lessons Archived",
};

function stepLabel(stepKey: string): string {
  return SDLC_WORKFLOW.find((s) => s.key === stepKey)?.label.split("—")[0]?.trim() ?? stepKey;
}

function artifactToFeedItem(
  artifact: SessionArtifact,
  agentMap: Map<string, { name: string; role: string }>,
  projectName: string | null,
): AgentFeedItem {
  const agent = artifact.agentId ? agentMap.get(artifact.agentId) : null;
  return {
    id: artifact.id,
    type: "turn",
    agentName: agent?.name ?? stepLabel(artifact.stepKey),
    agentRole: agent?.role ?? "",
    stepKey: artifact.stepKey,
    headline: STEP_HEADLINES[artifact.stepKey] ?? "Work Completed",
    body: artifact.outputSummary,
    artifactName: artifact.artifactName,
    artifactType: artifact.artifactType,
    decision: artifact.decision,
    approvalId: null,
    approvalStatus: null,
    projectName,
    createdAt: artifact.createdAt,
  };
}

export async function getSessionAgentFeed(
  workflowRunId: string,
  projectName?: string | null,
): Promise<AgentFeedItem[]> {
  const { getSessionHandoffs } = await import("./coo-routing");
  const [artifacts, approvals, agents, handoffs] = await Promise.all([
    getSessionArtifacts(workflowRunId),
    getWorkflowApprovals({ workflowId: workflowRunId }),
    getAgents(),
    getSessionHandoffs(workflowRunId),
  ]);

  const agentMap = new Map(agents.map((a) => [a.id, { name: a.name, role: a.role }]));
  const feed: AgentFeedItem[] = artifacts.map((a) =>
    artifactToFeedItem(a, agentMap, projectName ?? null),
  );

  for (const handoff of handoffs) {
    const fromAgent = handoff.completedByAgentId
      ? agentMap.get(handoff.completedByAgentId)
      : null;
    const toAgent = handoff.assignedToAgentId
      ? agentMap.get(handoff.assignedToAgentId)
      : null;
    feed.push({
      id: `handoff-${handoff.id}`,
      type: "handoff",
      agentName: toAgent?.name ?? "Agent",
      agentRole: toAgent?.role ?? "",
      stepKey: handoff.toStepKey ?? handoff.fromStepKey ?? "handoff",
      headline: `COO Assigned: ${handoff.artifactName ?? "Work"}`,
      body: [
        handoff.artifactName ? `Artifact: ${handoff.artifactName}` : null,
        fromAgent ? `Completed By: ${fromAgent.name}` : null,
        toAgent ? `Assigned To: ${toAgent.name}` : null,
        `Reason: ${handoff.reason}`,
      ]
        .filter(Boolean)
        .join("\n"),
      artifactName: handoff.artifactName,
      artifactType: "handoff",
      decision: null,
      approvalId: null,
      approvalStatus: handoff.status,
      projectName: projectName ?? null,
      createdAt: handoff.createdAt,
    });
  }

  for (const approval of approvals) {
    feed.push({
      id: `approval-${approval.id}`,
      type: "approval",
      agentName: approval.requestedBy,
      agentRole: "",
      stepKey: approval.approvalType,
      headline:
        approval.status === "pending"
          ? "Approval Required"
          : `Approval ${approval.status.replace("_", " ")}`,
      body: approval.description || approval.title,
      artifactName: approval.title,
      artifactType: approval.approvalType,
      decision: null,
      approvalId: approval.id,
      approvalStatus: approval.status,
      projectName: approval.projectName ?? projectName ?? null,
      createdAt: approval.requestedAt,
    });
  }

  return feed.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function getObjectiveAgentFeed(objectiveId: string): Promise<AgentFeedItem[]> {
  const supabase = createSupabaseAdmin();
  const [artifacts, agents, objectiveRow] = await Promise.all([
    supabase
      .from("session_artifacts")
      .select("*")
      .eq("objective_id", objectiveId)
      .order("created_at", { ascending: true }),
    getAgents(),
    supabase.from("project_objectives").select("title, project_id").eq("id", objectiveId).maybeSingle(),
  ]);

  const agentMap = new Map(agents.map((a) => [a.id, { name: a.name, role: a.role }]));
  let projectName: string | null = null;
  if (objectiveRow.data?.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", objectiveRow.data.project_id)
      .maybeSingle();
    projectName = project?.name ?? null;
  }

  const { getWorkflowApprovals } = await import("./governance");
  const approvals = objectiveRow.data?.project_id
    ? await getWorkflowApprovals({
        projectId: objectiveRow.data.project_id,
        status: "pending",
      })
    : [];

  const feed: AgentFeedItem[] = (artifacts.data ?? []).map((row) =>
    artifactToFeedItem(
      {
        id: row.id,
        workflowRunId: row.workflow_run_id,
        objectiveId: row.objective_id,
        runtimeSessionId: row.runtime_session_id,
        agentId: row.agent_id,
        stepKey: row.step_key,
        turnNumber: row.turn_number,
        inputSummary: row.input_summary,
        outputSummary: row.output_summary,
        decision: row.decision,
        artifactName: row.artifact_name,
        artifactType: row.artifact_type,
        artifactRefId: row.artifact_ref_id,
        artifactRefUrl: row.artifact_ref_url,
        createdAt: row.created_at,
      },
      agentMap,
      projectName,
    ),
  );

  for (const approval of approvals.filter((a) => a.approvalType === "strategic_objective")) {
    feed.push({
      id: `approval-${approval.id}`,
      type: "approval",
      agentName: approval.requestedBy,
      agentRole: "CEO",
      stepKey: "strategic_objective",
      headline: "Approval Required — Strategy",
      body: approval.description,
      artifactName: "strategic_brief_v1",
      artifactType: "strategic_objective",
      decision: null,
      approvalId: approval.id,
      approvalStatus: approval.status,
      projectName,
      createdAt: approval.requestedAt,
    });
  }

  return feed;
}
