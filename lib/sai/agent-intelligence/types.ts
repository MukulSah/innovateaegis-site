export const INTELLIGENCE_TYPES = [
  "current_priority",
  "pending_decision",
  "strategic_opportunity",
  "executive_recommendation",
  "risk_alert",
  "project_alert",
  "operational_alert",
  "customer_insight",
  "market_insight",
  "innovation_opportunity",
  "health_signal",
  "escalation",
  "executive_briefing",
] as const;

export type IntelligenceType = (typeof INTELLIGENCE_TYPES)[number];

export type IntelligenceStatus =
  | "open"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "closed"
  | "archived"
  | "expired";

export type IntelligenceImpact = "low" | "medium" | "high" | "critical";

export type IntelligencePriority = "low" | "medium" | "high" | "critical";

export type AgentIntelligenceRecord = {
  id: string;
  agentId: string | null;
  agentName: string;
  intelligenceType: IntelligenceType;
  title: string;
  summary: string;
  reasoning: string;
  recommendation: string;
  confidence: number | null;
  priority: IntelligencePriority;
  impact: IntelligenceImpact;
  status: IntelligenceStatus;
  relatedProjectIds: string[];
  relatedDecisionIds: string[];
  relatedMeetingIds: string[];
  relatedMemoryIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

export type IntelligenceInput = {
  agentId: string;
  agentName: string;
  intelligenceType: IntelligenceType;
  title: string;
  summary: string;
  reasoning: string;
  recommendation: string;
  confidence?: number | null;
  priority?: IntelligencePriority;
  impact?: IntelligenceImpact;
  status?: IntelligenceStatus;
  relatedProjectIds?: string[];
  relatedDecisionIds?: string[];
  relatedMeetingIds?: string[];
  relatedMemoryIds?: string[];
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
  ttlDays?: number;
};

export type AgentRoleKind =
  | "ceo"
  | "coo"
  | "product_manager"
  | "project_manager"
  | "solution_architect"
  | "qa"
  | "devops"
  | "generic";

export const FOUNDER_PRIORITY_TYPES: IntelligenceType[] = ["current_priority"];
export const FOUNDER_DECISION_TYPES: IntelligenceType[] = ["pending_decision"];
export const FOUNDER_OPPORTUNITY_TYPES: IntelligenceType[] = [
  "strategic_opportunity",
  "innovation_opportunity",
  "market_insight",
  "customer_insight",
];
export const FOUNDER_RECOMMENDATION_TYPES: IntelligenceType[] = ["executive_recommendation"];
export const FOUNDER_ALERT_TYPES: IntelligenceType[] = [
  "risk_alert",
  "escalation",
  "operational_alert",
  "project_alert",
];
export const FOUNDER_HEALTH_TYPES: IntelligenceType[] = ["health_signal"];

export const ACTIVE_INTELLIGENCE_STATUSES: IntelligenceStatus[] = [
  "open",
  "in_progress",
  "awaiting_approval",
];

export function defaultTtlDays(type: IntelligenceType): number {
  switch (type) {
    case "executive_briefing":
      return 1;
    case "current_priority":
      return 7;
    case "pending_decision":
      return 14;
    case "health_signal":
      return 3;
    case "escalation":
    case "risk_alert":
    case "project_alert":
    case "operational_alert":
      return 5;
    default:
      return 10;
  }
}

export function resolveAgentRoleKind(role: string, name: string): AgentRoleKind {
  const r = role.toLowerCase();
  const n = name.toLowerCase();
  if (r.includes("chief executive") || n.includes("ceo")) return "ceo";
  if (r.includes("chief operating") || n.includes("coo")) return "coo";
  if (r.includes("product manag") || n.includes("product manager")) return "product_manager";
  if (r.includes("project manag") || n.includes("project manager")) return "project_manager";
  if (r.includes("architect") || r.includes("architecture")) return "solution_architect";
  if (r.includes("quality") || r.includes("qa")) return "qa";
  if (r.includes("devops") || r.includes("infrastructure")) return "devops";
  return "generic";
}
