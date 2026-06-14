import type { ApprovalType, TaskStage } from "./types";

export type SDLCStep = {
  key: string;
  label: string;
  taskTitle: string;
  taskDescription: string;
  deliverableType: string;
  deliverableTitle: string;
  governanceApproval?: ApprovalType;
  approvalType?: "architecture" | "qa" | "release" | "documentation";
  matchRoles: string[];
  taskStatus: TaskStage;
  skipOnSessionActivate?: boolean;
  /** Passive agents (e.g. Team Orchestrator) activate only on escalation — not in primary chain. */
  passiveOnly?: boolean;
};

export const SDLC_WORKFLOW: SDLCStep[] = [
  {
    key: "ceo_strategy",
    label: "CEO — Validates Strategy",
    taskTitle: "Strategic Alignment Review",
    taskDescription:
      "Review the founder objective against company goals, KPIs, and strategic priorities. Approve business alignment, assign priority, define success metrics. Do NOT write code or technical designs.",
    deliverableType: "strategic_brief",
    deliverableTitle: "Strategic Brief",
    matchRoles: ["CEO", "Chief Executive"],
    taskStatus: "planning",
    skipOnSessionActivate: true,
  },
  {
    key: "coo_execution",
    label: "COO — Creates Execution Plan",
    taskTitle: "Execution Plan",
    taskDescription:
      "Create execution plan: project scope, session setup, agent assignments, workflow selection. You own this session's execution.",
    deliverableType: "execution_plan",
    deliverableTitle: "Execution Plan",
    matchRoles: ["COO", "Chief Operating"],
    taskStatus: "planning",
    skipOnSessionActivate: true,
  },
  {
    key: "requirements",
    label: "Product Manager — Creates Requirements",
    taskTitle: "Create PRD",
    taskDescription: "Create PRD, user stories, and acceptance criteria for the objective.",
    deliverableType: "prd",
    deliverableTitle: "Product Requirements Document",
    governanceApproval: "requirements",
    matchRoles: ["Product Management", "Product Manager"],
    taskStatus: "planning",
  },
  {
    key: "execution_readiness",
    label: "Team Orchestrator — Escalation Routing",
    taskTitle: "Resource & Coordination Review",
    taskDescription:
      "Activate only for resource conflicts, blocked dependencies, capacity planning, or cross-team coordination.",
    deliverableType: "readiness_report",
    deliverableTitle: "Coordination Report",
    governanceApproval: "execution_readiness",
    matchRoles: ["Work Routing", "Orchestrator"],
    taskStatus: "ready",
    skipOnSessionActivate: true,
    passiveOnly: true,
  },
  {
    key: "design",
    label: "Architect — Creates Design",
    taskTitle: "Create Architecture",
    taskDescription: "Define APIs, data models, security, and scaling approach.",
    deliverableType: "architecture",
    deliverableTitle: "Architecture Document",
    governanceApproval: "architecture",
    approvalType: "architecture",
    matchRoles: ["Architecture", "Architect", "Solution Architect"],
    taskStatus: "planning",
  },
  {
    key: "tasks",
    label: "Project Manager — Creates Tasks",
    taskTitle: "Create Execution Plan",
    taskDescription: "Create task backlog with dependencies, priorities, and timelines.",
    deliverableType: "task_breakdown",
    deliverableTitle: "Execution Plan",
    governanceApproval: "task_plan",
    matchRoles: ["Project Management", "Project Manager"],
    taskStatus: "ready",
  },
  {
    key: "implementation",
    label: "Engineer — Implements Solution",
    taskTitle: "Implement Solution",
    taskDescription: "Build features, fix bugs, and produce technical deliverables.",
    deliverableType: "implementation",
    deliverableTitle: "Implementation Notes",
    matchRoles: ["Engineering", "Software Engineer"],
    taskStatus: "in_progress",
  },
  {
    key: "validation",
    label: "QA — Validates Work",
    taskTitle: "Validate Solution",
    taskDescription: "Generate test cases, run regression, and file bug reports.",
    deliverableType: "test_plan",
    deliverableTitle: "Test Plan & QA Report",
    approvalType: "qa",
    matchRoles: ["Quality Assurance", "QA"],
    taskStatus: "testing",
  },
  {
    key: "deployment",
    label: "DevOps — Deploys Release",
    taskTitle: "Deploy Release",
    taskDescription: "Run CI/CD, deploy to staging, and monitor release health.",
    deliverableType: "deployment",
    deliverableTitle: "Deployment Report",
    governanceApproval: "release",
    approvalType: "release",
    matchRoles: ["DevOps"],
    taskStatus: "approval",
  },
  {
    key: "documentation",
    label: "Documentation — Updates Docs",
    taskTitle: "Generate Documentation",
    taskDescription: "Publish technical docs, user guides, and release notes.",
    deliverableType: "documentation",
    deliverableTitle: "Release Notes",
    approvalType: "documentation",
    matchRoles: ["Documentation"],
    taskStatus: "released",
  },
  {
    key: "knowledge",
    label: "Knowledge Engine — Stores Lessons",
    taskTitle: "Archive Learnings",
    taskDescription: "Capture decisions, lessons learned, and performance history.",
    deliverableType: "knowledge",
    deliverableTitle: "Knowledge Record",
    matchRoles: ["Documentation", "Knowledge"],
    taskStatus: "archived",
  },
];

export const SESSION_START_STEP_INDEX = SDLC_WORKFLOW.findIndex((s) => s.key === "requirements");

/** Executable SDLC stages (excludes pre-session CEO/COO planning steps). */
export function getExecutableWorkflowSteps(): SDLCStep[] {
  return SDLC_WORKFLOW.filter((s) => !s.skipOnSessionActivate);
}

/** Primary delivery chain — excludes passive escalation agents (Team Orchestrator). */
export function getPrimarySdlcChain(): SDLCStep[] {
  return SDLC_WORKFLOW.filter((s) => !s.skipOnSessionActivate && !s.passiveOnly);
}

/** First operational stage after COO planning — resolved from workflow definition. */
export function getInitialExecutionStage(): SDLCStep {
  return getPrimarySdlcChain().find((s) => s.key === "requirements") ?? getPrimarySdlcChain()[0];
}

/** Next stage in the primary SDLC chain (PM → Architect → PM → Engineer → …). */
export function getNextPrimaryStage(afterStepKey: string): SDLCStep | null {
  const chain = getPrimarySdlcChain();
  const idx = chain.findIndex((s) => s.key === afterStepKey);
  return idx >= 0 && idx < chain.length - 1 ? chain[idx + 1] : null;
}

/** @deprecated Use getNextPrimaryStage */
export function getNextDeliveryStage(afterStepKey: string): SDLCStep | null {
  return getNextPrimaryStage(afterStepKey);
}

const PRIMARY_DELIVERABLE_NAMES: Record<string, string> = {
  coo_execution: "coo_execution_plan_v1",
  design: "architecture_v1",
  tasks: "task_plan_v1",
  implementation: "implementation_plan_v1",
  validation: "qa_report_v1",
  deployment: "release_plan_v1",
  documentation: "session_final_report_v1",
  knowledge: "knowledge_archive_v1",
};

export function stepContextArtifactName(stepKey: string): string {
  if (stepKey === "design") return "architecture_context_v1";
  if (stepKey === "coo_execution") return "coo_execution_plan_v1";
  return `${stepKey}_v1`;
}

export function deliverableArtifactName(stepKey: string, version = 1): string {
  if (version === 1 && PRIMARY_DELIVERABLE_NAMES[stepKey]) {
    return PRIMARY_DELIVERABLE_NAMES[stepKey];
  }
  return `${stepKey}_v${version}`;
}

export function getStepGovernanceApproval(stepKey: string): ApprovalType | undefined {
  return SDLC_WORKFLOW.find((s) => s.key === stepKey)?.governanceApproval;
}
