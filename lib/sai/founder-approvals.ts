import { getWorkflowApprovals } from "./governance";
import { getProjects } from "./projects";
import type { WorkflowApproval } from "./types";

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
};

function artifactLabelForType(approval: WorkflowApproval): string {
  const map: Record<string, string> = {
    strategic_objective: "strategic_brief_v1",
    requirements: "requirements_v1",
    architecture: "architecture_v1",
    task_plan: "task_plan_v1",
    release: "release_staging",
  };
  return map[approval.approvalType] ?? approval.title;
}

export async function getFounderPendingApprovals(): Promise<FounderApprovalCard[]> {
  const [approvals, projects] = await Promise.all([
    getWorkflowApprovals({ status: "pending" }),
    getProjects(),
  ]);

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  return approvals
    .filter((a) =>
      ["strategic_objective", "requirements", "architecture", "release"].includes(
        a.approvalType,
      ),
    )
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
    }));
}
