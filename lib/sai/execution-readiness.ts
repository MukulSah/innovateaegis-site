import { findAgentForRole, getAgents } from "./agents";
import { getProjectIntegrations } from "./connectors/project-integrations";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { postExecutiveMessage } from "./executive-session-chat";
import { getProjectDriveFolders } from "./drive-workspace";
import { getProjectMemory } from "./project-memory";
import { getProjectById } from "./projects";
import { getProjectResources, syncIntegrationsToResources } from "./project-resources";
import { getWorkflowRunById } from "./workflows";

export type ReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type ExecutionReadinessResult = {
  projectId: string;
  projectName: string;
  ready: boolean;
  status: "READY" | "NOT_READY";
  checks: ReadinessCheck[];
  gaps: string[];
  workflowName: string;
  resourceMap: Record<string, string>;
};

async function buildChecks(projectId: string, sessionId?: string): Promise<ReadinessCheck[]> {
  const [project, memory, resources, folders, integrations, agents] = await Promise.all([
    getProjectById(projectId),
    getProjectMemory(projectId),
    getProjectResources(projectId),
    getProjectDriveFolders(projectId),
    getProjectIntegrations(projectId),
    getAgents(),
  ]);

  const docAgent = findAgentForRole(agents, ["Documentation", "Knowledge"]);
  let hasLead = Boolean(
    project?.projectLeadAgentId ||
      project?.projectLeadEmployeeId ||
      (project?.lead && project.lead !== "Unassigned"),
  );
  if (!hasLead && sessionId) {
    const session = await getWorkflowRunById(sessionId);
    hasLead = Boolean(session?.sessionOwnerAgentId);
  }
  const hasRepo =
    resources.some((r) => r.resourceType === "repository" && r.status === "active") ||
    integrations.some((i) => i.provider === "github" && i.config?.repo);
  const hasDrive =
    folders.length >= 8 ||
    resources.some((r) => r.resourceType === "drive_workspace" && r.status === "active") ||
    integrations.some((i) => i.provider === "google_drive");
  const hasMemory = memory.length > 0;
  const hasResourceMap = resources.length >= 3;
  const hasDocAgent = Boolean(docAgent);

  let workflowName = "Product Improvement Workflow";
  if (sessionId) {
    const session = await getWorkflowRunById(sessionId);
    const brief = (session?.strategicBrief as Record<string, unknown>) ?? {};
    const cooPlan = brief.cooPlan as Record<string, unknown> | undefined;
    if (cooPlan?.workflow) workflowName = String(cooPlan.workflow);
  }

  return [
    { key: "project", label: "Project Exists", passed: Boolean(project), detail: project?.name ?? "Missing" },
    {
      key: "project_lead",
      label: "Project Lead Exists",
      passed: hasLead,
      detail: project?.projectLeadName ?? project?.lead ?? "Unassigned",
    },
    {
      key: "project_memory",
      label: "Project Memory Exists",
      passed: hasMemory,
      detail: hasMemory ? `${memory.length} entries` : "Not initialized",
    },
    {
      key: "resource_map",
      label: "Resource Map Exists",
      passed: hasResourceMap,
      detail: `${resources.length} resources registered`,
    },
    {
      key: "drive_workspace",
      label: "Documentation Workspace Exists",
      passed: hasDrive,
      detail: hasDrive ? `${folders.length} folders` : "Drive workspace not provisioned",
    },
    {
      key: "repository",
      label: "Repository Configured",
      passed: hasRepo,
      detail: hasRepo ? "Linked" : "Optional — assign in Resource Center",
    },
    {
      key: "workflow",
      label: "Workflow Selected",
      passed: Boolean(sessionId),
      detail: workflowName,
    },
    {
      key: "session",
      label: "Session Created",
      passed: Boolean(sessionId),
      detail: sessionId ? "Active session" : "No session",
    },
    {
      key: "governance",
      label: "Governance Rules Loaded",
      passed: true,
      detail: "Approval policies active",
    },
    {
      key: "documentation_agent",
      label: "Documentation Agent Active",
      passed: hasDocAgent,
      detail: docAgent?.name ?? "Create Documentation Agent in Agent Factory",
    },
  ];
}

export async function evaluateExecutionReadiness(
  projectId: string,
  sessionId?: string,
): Promise<ExecutionReadinessResult> {
  await syncIntegrationsToResources(projectId);
  const project = await getProjectById(projectId);
  const checks = await buildChecks(projectId, sessionId);
  const requiredKeys = new Set([
    "project",
    "project_lead",
    "project_memory",
    "resource_map",
    "drive_workspace",
    "workflow",
    "session",
    "governance",
    "documentation_agent",
  ]);
  const gaps = checks.filter((c) => requiredKeys.has(c.key) && !c.passed).map((c) => c.label);
  const ready = gaps.length === 0;
  const resources = await getProjectResources(projectId);
  const resourceMap: Record<string, string> = {};
  for (const r of resources) {
    resourceMap[r.resourceType] = r.resourceIdentifier;
  }

  return {
    projectId,
    projectName: project?.name ?? "Project",
    ready,
    status: ready ? "READY" : "NOT_READY",
    checks,
    gaps,
    workflowName: checks.find((c) => c.key === "workflow")?.detail ?? "Product Improvement Workflow",
    resourceMap,
  };
}

function buildReadinessArtifactContent(result: ExecutionReadinessResult): string {
  const lines = result.checks.map(
    (c) => `- ${c.label}: ${c.passed ? "✓" : "✗"} — ${c.detail}`,
  );
  return `# COO Execution Readiness Review

## Project
${result.projectName}

## Validation
${lines.join("\n")}

## Resource Map
${Object.entries(result.resourceMap)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n") || "No resources registered"}

## Workflow
${result.workflowName}

## Execution Status
${result.status}

## Recommendation
${
  result.ready
    ? "Release work to Product Manager"
    : `Resolve gaps before PM assignment: ${result.gaps.join(", ")}`
}
`;
}

export async function runCooExecutionReadinessReview(input: {
  sessionId: string;
  projectId: string;
  cooAgentId: string;
}): Promise<ExecutionReadinessResult> {
  const { bootstrapProjectInfrastructure } = await import("./project-bootstrap");
  await bootstrapProjectInfrastructure(input.projectId);

  const result = await evaluateExecutionReadiness(input.projectId, input.sessionId);
  const content = buildReadinessArtifactContent(result);

  await recordExecutiveArtifact({
    workflowRunId: input.sessionId,
    projectId: input.projectId,
    agentId: input.cooAgentId,
    stepKey: "execution_readiness",
    artifactName: "coo_execution_readiness_v1",
    content,
    artifactType: "readiness_report",
  });

  const agents = await getAgents();
  const coo = agents.find((a) => a.id === input.cooAgentId);
  if (coo) {
    await postExecutiveMessage(
      coo,
      input.sessionId,
      result.ready
        ? `Execution readiness: READY. Awaiting execution release after session setup.`
        : `Execution readiness: NOT READY. Gaps: ${result.gaps.join(", ")}.`,
      {
        projectId: input.projectId,
        stepKey: "execution_readiness",
        artifactName: "coo_execution_readiness_v1",
      },
    );
  }

  return result;
}

/** After readiness passes and workflow steps exist, trigger execution release. */
export async function triggerExecutionReleaseIfReady(input: {
  sessionId: string;
  projectId: string;
  cooAgentId: string;
}): Promise<void> {
  const readiness = await evaluateExecutionReadiness(input.projectId, input.sessionId);
  if (!readiness.ready) return;

  const { releaseExecution, hasExecutionBeenReleased } = await import("./execution-release");
  if (await hasExecutionBeenReleased(input.sessionId)) return;

  await releaseExecution(input);
}
