import { getWorkflowApprovals } from "./governance";
import { getProjects } from "./projects";
import type { WorkflowApproval } from "./types";

const FOUNDER_ACTION_TYPES = new Set([
  "strategic_objective",
  "requirements",
  "architecture",
  "release",
  "document",
  "decision",
  "task_plan",
  "execution_readiness",
  "milestones",
  "security",
  "infrastructure",
  "database_change",
]);

export type FounderApprovalCard = {
  id: string;
  approvalType: string;
  title: string;
  description: string;
  projectName: string;
  requestedBy: string;
  artifactLabel: string;
  requestedAt: string;
  priority: string;
  workflowId: string | null;
  sessionNumber: number | null;
};

function artifactLabelForType(approval: WorkflowApproval): string {
  const map: Record<string, string> = {
    strategic_objective: "strategic_brief_v1",
    requirements: "requirements_v1",
    architecture: "architecture_v1",
    task_plan: "task_plan_v1",
    release: "release_staging",
    document: "session_final_report_v1",
    decision: "executive_decision",
    execution_readiness: "execution_readiness_v1",
    milestones: "milestones_v1",
  };
  return map[approval.approvalType] ?? approval.title;
}

export async function getFounderPendingApprovals(): Promise<FounderApprovalCard[]> {
  const [approvals, projects] = await Promise.all([
    getWorkflowApprovals({ status: "pending" }),
    getProjects(),
  ]);

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const { createSupabaseAdmin, isSupabaseConfigured } = await import("@/lib/supabase/admin");
  const sessionNumbers = new Map<string, number | null>();
  if (isSupabaseConfigured()) {
    const workflowIds = [...new Set(approvals.map((a) => a.workflowId).filter(Boolean))] as string[];
    if (workflowIds.length) {
      const supabase = createSupabaseAdmin();
      const { data } = await supabase
        .from("workflow_runs")
        .select("id, session_number")
        .in("id", workflowIds);
      for (const row of data ?? []) {
        sessionNumbers.set(row.id as string, row.session_number as number | null);
      }
    }
  }

  return approvals
    .filter((a) => FOUNDER_ACTION_TYPES.has(a.approvalType))
    .map((a) => ({
      id: a.id,
      approvalType: a.approvalType,
      title: a.title,
      description: a.description,
      projectName: a.projectName ?? projectMap.get(a.projectId) ?? "Project",
      requestedBy: a.requestedBy,
      artifactLabel: artifactLabelForType(a),
      requestedAt: a.requestedAt,
      priority: a.priority,
      workflowId: a.workflowId,
      sessionNumber: a.workflowId ? (sessionNumbers.get(a.workflowId) ?? null) : null,
    }));
}
