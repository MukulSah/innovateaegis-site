export type UserRole = "owner" | "employee" | "agent";

export type HealthStatus = "green" | "yellow" | "red";

export type TaskStage =
  | "backlog"
  | "planning"
  | "ready"
  | "assigned"
  | "in_progress"
  | "code_review"
  | "testing"
  | "approval"
  | "released"
  | "archived";

export interface SAIUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
}

export interface HealthMetric {
  id: string;
  label: string;
  status: HealthStatus;
  score: number;
  explanation: string;
}

export interface CompanyOverview {
  activeProjects: number;
  employeesOnline: number;
  totalEmployees: number;
  aiAgentsActive: number;
  totalAgents: number;
  revenue: string;
  revenueTrend: string;
  releases: number;
  openIssues: number;
  currentObjectives: string[];
  organizationHealthScore: number;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  responsibilities: string[];
  status: "active" | "idle" | "busy";
  assignedProjects: number;
  performanceScore: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "online" | "offline" | "busy";
  currentWork: string;
}

export interface Project {
  id: string;
  name: string;
  objective: string;
  status: "on_track" | "at_risk" | "delayed" | "completed";
  progress: number;
  lead: string;
  tasksTotal: number;
  tasksCompleted: number;
}

export interface MemoryRecord {
  id: string;
  type: "product" | "engineering" | "customer" | "decision" | "business";
  title: string;
  summary: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
