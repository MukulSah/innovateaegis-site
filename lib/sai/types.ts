export type HealthStatus = "green" | "yellow" | "red";

export type HealthDomain = {
  key: string;
  label: string;
  status: HealthStatus;
  score: number;
  explanation: string;
};

export type CompanyMetrics = {
  activeProjects: number;
  employeesOnline: number;
  agentsActive: number;
  revenue: number;
  revenueDeltaPct: number;
  releasesThisQuarter: number;
  openIssues: number;
  organizationHealthScore: number;
};

export type Objective = {
  id: string;
  title: string;
  status: "in-progress" | "planned" | "completed";
  progress: number;
  owner: string;
  projectSlug?: string;
  description: string;
};

export type PresenceStatus = "online" | "away" | "offline";

export type Employee = {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  presence: PresenceStatus;
  initials: string;
  joined: string;
  responsibilities: string[];
  skills: string[];
  currentWork: string[];
  completedWork: string[];
  metrics: {
    tasksCompleted: number;
    onTimeRate: number;
    activeTasks: number;
    knowledgeContributions: number;
  };
  memory: string[];
};

export type AgentCategory =
  | "executive"
  | "product"
  | "engineering"
  | "quality"
  | "operations"
  | "security"
  | "knowledge"
  | "growth"
  | "people";

export type Agent = {
  id: string;
  slug: string;
  name: string;
  role: string;
  category: AgentCategory;
  status: "active" | "idle" | "training";
  tagline: string;
  responsibilities: string[];
  memory: string[];
  metrics: {
    tasksHandled: number;
    accuracy: number;
    autonomy: number;
    decisionsLogged: number;
  };
  assignedProjects: string[];
};

export type TaskStage =
  | "Backlog"
  | "Planning"
  | "Ready"
  | "Assigned"
  | "In Progress"
  | "Code Review"
  | "Testing"
  | "Approval"
  | "Released"
  | "Knowledge Archived";

export type Task = {
  id: string;
  title: string;
  projectSlug: string;
  stage: TaskStage;
  assignee: string;
  type: "feature" | "bug" | "test" | "infra" | "docs";
  priority: "low" | "medium" | "high" | "critical";
  updated: string;
};

export type ProjectArtifact = {
  label: string;
  status: "done" | "in-progress" | "pending";
  detail: string;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  product: string;
  status: "planning" | "active" | "at-risk" | "shipped";
  health: HealthStatus;
  progress: number;
  owner: string;
  objective: string;
  summary: string;
  start: string;
  target: string;
  risks: string[];
  team: string[];
  agents: string[];
  artifacts: ProjectArtifact[];
};

export type MemoryType =
  | "product"
  | "engineering"
  | "customer"
  | "decision"
  | "business";

export type MemoryRecord = {
  id: string;
  type: MemoryType;
  title: string;
  summary: string;
  tags: string[];
  date: string;
  author: string;
  relatedProject?: string;
};
