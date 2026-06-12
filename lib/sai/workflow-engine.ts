import type { Agent, ApprovalType } from "./types";
import { createDecision } from "./decisions";
import { requestWorkflowApproval } from "./governance";
import { createDocument } from "./documents";
import { createMemory } from "./memories";
import { recordWorkflowEvent } from "./workflow-events";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createTask } from "./tasks";
import { assignAgentsToTask } from "./task-assignments";
import { SDLC_WORKFLOW } from "./sdlc";
import { addAgentMemory, findAgentForRole } from "./agents";

function requirementItems(objective: string, projectName: string): string[] {
  const base = objective.replace(/\.$/, "");
  return [
    `Define scope and success criteria for: ${base}`,
    `Identify target users and deployment environments for ${projectName}`,
    `Specify functional requirements with measurable acceptance criteria`,
    `Document non-functional requirements (latency, availability, security)`,
    `Define rollback and recovery requirements for production deployments`,
    `Capture compliance and audit logging requirements`,
    `List integration points with existing ${projectName} services`,
    `Establish release validation checklist before go-live`,
  ];
}

export function generateRequirementsContent(objective: string, projectName: string): string {
  const items = requirementItems(objective, projectName);
  return [
    `# Product Requirements: ${objective}`,
    "",
    `Project: ${projectName}`,
    "",
    "## Requirements",
    ...items.map((item, i) => `${i + 1}. ${item}`),
    "",
    "## Acceptance Criteria",
    "- All requirements traced to tasks and test cases",
    "- Stakeholder sign-off recorded before implementation",
  ].join("\n");
}

export function generateArchitectureContent(objective: string, projectName: string): string {
  return [
    `# Architecture: ${objective}`,
    "",
    `## System Overview`,
    `${projectName} module uses a service-oriented design with event-driven deployment orchestration.`,
    "",
    "## Components",
    "- Deployment API Gateway",
    "- Agent Communication Service (gRPC)",
    "- Deployment Queue & Scheduler",
    "- Rollback Controller",
    "- Audit & Telemetry Pipeline",
    "",
    "## Communication",
    "gRPC selected for agent-to-service communication due to low latency and bidirectional streaming.",
    "",
    "## Data Model",
    "- deployments, deployment_targets, deployment_events, rollback_snapshots",
    "",
    "## Security",
    "- mTLS between agents and control plane",
    "- Role-based deployment permissions",
    "- Immutable audit trail for every release action",
  ].join("\n");
}

export function generateMilestonesContent(objective: string): string {
  return [
    `# Milestones: ${objective}`,
    "",
    "## Phase 1 — Foundation (Week 1-2)",
    "- API contracts and deployment data model",
    "- Queue infrastructure and agent heartbeat",
    "",
    "## Phase 2 — Core Delivery (Week 3-4)",
    "- Deployment scheduling and execution engine",
    "- Rollback mechanism with SLA validation",
    "",
    "## Phase 3 — Validation (Week 5)",
    "- QA regression suite and load testing",
    "- Documentation and release notes",
    "",
    "## Phase 4 — Release (Week 6)",
    "- Staged rollout and production monitoring",
    "- Knowledge archival and retrospective",
  ].join("\n");
}

export function generateExecutionTasks(objective: string, projectName: string) {
  const base = objective.replace(/\.$/, "");
  return [
    { title: "Define deployment API contracts", description: `OpenAPI/gRPC contracts for ${base}` },
    { title: "Implement deployment queue", description: "Priority queue with retry and dead-letter handling" },
    { title: "Build agent heartbeat service", description: "Real-time endpoint health and version tracking" },
    { title: "Create rollback controller", description: "One-click rollback within enterprise SLA" },
    { title: "Add deployment scheduling", description: "Off-hours deployment windows per customer policy" },
    { title: "Implement audit logging", description: "Immutable deployment event trail" },
    { title: "Build deployment dashboard widgets", description: `${projectName} operator visibility` },
    { title: "Write integration tests", description: "End-to-end deployment scenarios" },
    { title: "Load test deployment pipeline", description: "Validate under 2,400+ endpoint scale" },
    { title: "Security review", description: "mTLS, RBAC, and secrets management audit" },
    { title: "Create operator runbook", description: "Incident response and escalation paths" },
    { title: "Draft release notes", description: `Customer-facing ${projectName} release summary` },
    { title: "Configure CI/CD pipelines", description: "Automated build, test, deploy stages" },
    { title: "Production dry-run", description: "Staged rollout validation before GA" },
  ];
}

export function generateImplementationGuide(objective: string): string {
  return [
    `# Implementation Guide: ${objective}`,
    "",
    "## Getting Started",
    "1. Clone deployment service repository",
    "2. Configure environment variables for queue and gRPC endpoints",
    "3. Run local agent simulator for integration testing",
    "",
    "## Key Modules",
    "- `deployment-queue/` — scheduling and execution",
    "- `rollback/` — snapshot and restore logic",
    "- `agent-bridge/` — gRPC communication layer",
    "",
    "## Testing",
    "- Unit tests: `npm test`",
    "- Integration: `npm run test:integration`",
    "- Load: `npm run test:load`",
  ].join("\n");
}

export function generateTestPlan(objective: string): string {
  return [
    `# Test Plan: ${objective}`,
    "",
    "## Test Scope",
    "- Deployment scheduling accuracy",
    "- Rollback under network failure",
    "- Agent heartbeat timeout handling",
    "- Multi-endpoint concurrent deployments",
    "",
    "## Regression Suite",
    "14 automated scenarios covering happy path, failure, and recovery flows.",
  ].join("\n");
}

type BootstrapContext = {
  workflowId: string;
  projectId: string;
  projectName: string;
  objective: string;
  agents: Agent[];
  objectiveId: string;
};

const STEP_APPROVAL_TYPE: Record<string, ApprovalType> = {
  requirements: "requirements",
  execution_readiness: "execution_readiness",
  design: "architecture",
  tasks: "task_plan",
  deployment: "release",
};

async function completeBootstrapStep(
  ctx: BootstrapContext,
  stepKey: string,
  actorName: string,
  eventTitle: string,
  eventDescription: string,
  documentType: Parameters<typeof createDocument>[0]["type"],
  documentTitle: string,
  documentContent: string,
  delayMinutes: number,
): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const step = SDLC_WORKFLOW.find((s) => s.key === stepKey);
  if (!step) return true;

  const createdAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();

  await createDocument({
    workflowId: ctx.workflowId,
    projectId: ctx.projectId,
    createdBy: actorName,
    title: documentTitle,
    type: documentType,
    content: documentContent,
  });

  await supabase
    .from("workflow_run_steps")
    .update({
      status: "completed",
      output: documentContent.slice(0, 500),
      completed_at: createdAt,
    })
    .eq("workflow_run_id", ctx.workflowId)
    .eq("step_key", stepKey);

  await supabase
    .from("project_deliverables")
    .update({ content: documentContent })
    .eq("workflow_run_id", ctx.workflowId)
    .eq("workflow_step_key", stepKey);

  const { data: taskRow } = await supabase
    .from("tasks")
    .select("id")
    .eq("workflow_run_id", ctx.workflowId)
    .eq("workflow_step_key", stepKey)
    .maybeSingle();

  if (taskRow?.id) {
    await supabase
      .from("tasks")
      .update({ status: step.taskStatus, completed_at: createdAt })
      .eq("id", taskRow.id);
    await assignAgentsToTask(taskRow.id, stepKey, ctx.agents);
  }

  await recordWorkflowEvent({
    workflowId: ctx.workflowId,
    eventType: `${stepKey}_completed`,
    actor: actorName,
    title: eventTitle,
    description: eventDescription,
  });

  const agent = findAgentForRole(ctx.agents, step.matchRoles);
  if (agent?.memoryEnabled) {
    await addAgentMemory(agent.id, {
      memoryType: stepKey === "requirements" ? "project" : stepKey === "design" ? "decision" : "knowledge",
      title: documentTitle,
      summary: eventDescription,
      projectId: ctx.projectId,
      taskId: taskRow?.id ?? null,
      workflowId: ctx.workflowId,
      content: documentContent.slice(0, 1000),
    });
  }

  const approvalType = STEP_APPROVAL_TYPE[stepKey];
  if (approvalType) {
    const { canProceed } = await requestWorkflowApproval({
      workflowId: ctx.workflowId,
      projectId: ctx.projectId,
      approvalType,
      title: documentTitle,
      description: eventDescription,
      requestedBy: actorName,
      artifactContent: documentContent,
      context: stepKey === "deployment" ? { releaseType: "major" } : {},
    });
    return canProceed;
  }

  return true;
}

export async function executeWorkflowBootstrap(ctx: BootstrapContext): Promise<number> {
  const requirements = generateRequirementsContent(ctx.objective, ctx.projectName);
  const architecture = generateArchitectureContent(ctx.objective, ctx.projectName);
  const milestones = generateMilestonesContent(ctx.objective);
  const executionTasks = generateExecutionTasks(ctx.objective, ctx.projectName);

  const pmAgent = findAgentForRole(ctx.agents, ["Product Management", "Product Manager"]);
  const architectAgent = findAgentForRole(ctx.agents, ["Architecture", "Architect"]);
  const pmManager = findAgentForRole(ctx.agents, ["Project Management", "Project Manager"]);
  const orchestrator = findAgentForRole(ctx.agents, ["Work Routing", "Orchestrator"]);

  await recordWorkflowEvent({
    workflowId: ctx.workflowId,
    eventType: "workflow_created",
    actor: "SAI",
    title: "Workflow Created",
    description: `Objective: ${ctx.objective}`,
  });

  const reqOk = await completeBootstrapStep(
    ctx,
    "requirements",
    pmAgent?.name ?? "Product Manager Agent",
    "Product Manager generated requirements",
    `Generated ${requirementItems(ctx.objective, ctx.projectName).length} requirements`,
    "requirement",
    "Product Requirements Document",
    requirements,
    1,
  );
  if (!reqOk) return 0;

  await createDecision({
    workflowId: ctx.workflowId,
    projectId: ctx.projectId,
    title: "Communication protocol for deployment module",
    decision: "Use gRPC for agent communication",
    rationale: "Lower latency and bidirectional streaming required for real-time endpoint updates.",
    alternativesConsidered: "REST API\nWebSockets",
    createdBy: architectAgent?.name ?? "Solution Architect Agent",
  });

  const designOk = await completeBootstrapStep(
    ctx,
    "design",
    architectAgent?.name ?? "Solution Architect Agent",
    "Architect generated deployment architecture",
    "Architecture document with gRPC, queue, and rollback components",
    "architecture",
    "Architecture Document",
    architecture,
    4,
  );
  if (!designOk) return 0;

  const milestonesOk = await completeBootstrapStep(
    ctx,
    "tasks",
    pmManager?.name ?? "Project Manager Agent",
    "Project Manager generated milestones",
    "Execution plan with phased milestones",
    "technical_spec",
    "Execution Plan & Milestones",
    milestones,
    7,
  );
  if (!milestonesOk) return 0;

  const supabase = createSupabaseAdmin();
  let createdTaskCount = 0;

  for (const item of executionTasks) {
    const engineer = findAgentForRole(ctx.agents, ["Engineering", "Software Engineer"]);
    const task = await createTask(
      {
        projectId: ctx.projectId,
        title: item.title,
        description: `${item.description}\n\nObjective: ${ctx.objective}`,
        priority: "medium",
        dependencies: [],
        acceptanceCriteria: [`Complete ${item.title}`],
        objectiveId: ctx.objectiveId,
        assignedAgentId: engineer?.id ?? null,
        assignedEmployeeId: null,
        status: "backlog",
        evidence: "",
        comments: ["Generated by Team Orchestrator during workflow bootstrap"],
        approvalStatus: "none",
        workflowRunId: ctx.workflowId,
        workflowStepKey: "assignment",
      },
      "Workflow Task Generated",
    );
    await assignAgentsToTask(task.id, "implementation", ctx.agents);
    createdTaskCount += 1;
  }

  await recordWorkflowEvent({
    workflowId: ctx.workflowId,
    eventType: "tasks_generated",
    actor: orchestrator?.name ?? "Team Orchestrator Agent",
    title: `Orchestrator created ${createdTaskCount} tasks`,
    description: `Execution backlog generated for ${ctx.objective}`,
  });

  const assignOk = await completeBootstrapStep(
    ctx,
    "assignment",
    orchestrator?.name ?? "Team Orchestrator Agent",
    "Orchestrator assigned work",
    `Assigned ${createdTaskCount} tasks across engineering, DevOps, and QA roles`,
    "sop",
    "Assignment Plan",
    `# Assignment Plan\n\n${createdTaskCount} tasks distributed with owner, contributor, reviewer, and approver roles.`,
    9,
  );
  if (!assignOk) return createdTaskCount;

  const implementationStep = SDLC_WORKFLOW.find((s) => s.key === "implementation");
  const implAgent = findAgentForRole(ctx.agents, implementationStep?.matchRoles ?? ["Engineering"]);

  await supabase
    .from("workflow_run_steps")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("workflow_run_id", ctx.workflowId)
    .eq("step_key", "implementation");

  await supabase
    .from("workflow_runs")
    .update({ current_step_index: 4, status: "running" })
    .eq("id", ctx.workflowId);

  if (implAgent) {
    await recordWorkflowEvent({
      workflowId: ctx.workflowId,
      eventType: "task_started",
      actor: implAgent.name,
      title: `${implAgent.name} started implementation`,
      description: `Active on: ${implementationStep?.taskTitle ?? "Implement Solution"}`,
    });
  }

  await createMemory({
    title: `Workflow knowledge: ${ctx.objective}`,
    content: `Requirements, architecture, milestones, and ${createdTaskCount} tasks generated for ${ctx.projectName}.`,
    type: "process",
    projectId: ctx.projectId,
    createdBy: "SAI Knowledge Engine",
  });

  return createdTaskCount;
}

export function computeWorkflowProgress(steps: { status: string }[]): number {
  if (steps.length === 0) return 0;
  const completed = steps.filter((s) => s.status === "completed").length;
  return Math.round((completed / steps.length) * 100);
}

export function getActiveAgentName(
  steps: { status: string; assignedAgentName?: string | null }[],
): string | null {
  const active = steps.find((s) => s.status === "in_progress");
  return active?.assignedAgentName ?? null;
}
