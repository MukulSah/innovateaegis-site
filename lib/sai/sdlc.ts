import type { TaskStage } from "./types";

export type SDLCStep = {
  key: string;
  label: string;
  taskTitle: string;
  taskDescription: string;
  deliverableType: string;
  deliverableTitle: string;
  approvalType?: "architecture" | "qa" | "release" | "documentation";
  matchRoles: string[];
  taskStatus: TaskStage;
};

export const SDLC_WORKFLOW: SDLCStep[] = [
  {
    key: "requirements",
    label: "Product Manager — Creates Requirements",
    taskTitle: "Create PRD",
    taskDescription: "Create PRD, user stories, and acceptance criteria for the objective.",
    deliverableType: "prd",
    deliverableTitle: "Product Requirements Document",
    matchRoles: ["Product Management", "Product Manager"],
    taskStatus: "planning",
  },
  {
    key: "design",
    label: "Architect — Creates Design",
    taskTitle: "Create Architecture",
    taskDescription: "Define APIs, data models, security, and scaling approach.",
    deliverableType: "architecture",
    deliverableTitle: "Architecture Document",
    approvalType: "architecture",
    matchRoles: ["Architecture", "Architect"],
    taskStatus: "planning",
  },
  {
    key: "tasks",
    label: "Project Manager — Creates Tasks",
    taskTitle: "Create Execution Plan",
    taskDescription: "Create task backlog with dependencies, priorities, and timelines.",
    deliverableType: "task_breakdown",
    deliverableTitle: "Execution Plan",
    matchRoles: ["Project Management", "Project Manager"],
    taskStatus: "ready",
  },
  {
    key: "assignment",
    label: "Orchestrator — Assigns Tasks",
    taskTitle: "Assign Work",
    taskDescription: "Balance workload and assign tasks to agents and employees.",
    deliverableType: "assignment_plan",
    deliverableTitle: "Assignment Plan",
    matchRoles: ["Work Routing", "Orchestrator"],
    taskStatus: "assigned",
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
    taskDescription: "Run CI/CD, deploy infrastructure, and monitor release health.",
    deliverableType: "deployment",
    deliverableTitle: "Deployment Report",
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
