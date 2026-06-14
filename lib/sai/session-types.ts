/**
 * Session Architecture v2 — canonical session type system.
 */

export const SESSION_TYPES = [
  "founder_objective",
  "product_development",
  "bug_fix",
  "incident",
  "research",
  "sales",
  "marketing",
  "operations",
  "duty",
  "automation",
  "customer_request",
] as const;

export type SessionTypeV2 = (typeof SESSION_TYPES)[number];

/** Legacy session types still stored in older rows. */
export const LEGACY_SESSION_TYPES = [
  "documentation_only",
  "planning",
  "architecture",
  "development",
  "deployment",
  "production_fix",
] as const;

export type LegacySessionType = (typeof LEGACY_SESSION_TYPES)[number];

export type SessionType = SessionTypeV2 | LegacySessionType;

export const SESSION_TYPE_LABELS: Record<SessionTypeV2, string> = {
  founder_objective: "Founder Objective",
  product_development: "Product Development",
  bug_fix: "Bug Fix",
  incident: "Incident Response",
  research: "Research",
  sales: "Sales",
  marketing: "Marketing",
  operations: "Operations",
  duty: "Duty",
  automation: "Automation",
  customer_request: "Customer Request",
};

export type SessionCreationMode =
  | "instant"
  | "scheduled"
  | "recurring"
  | "triggered"
  | "duty"
  | "automation";

export type SessionDependencyType = "blocks" | "depends_on" | "related";

export type CompanyRecordType =
  | "session_file"
  | "decision"
  | "knowledge"
  | "architecture"
  | "sop"
  | "agent_learning"
  | "lesson"
  | "recommendation";

export type SessionIntelligenceStatus = "pending" | "in_progress" | "complete" | "failed";

/** Map legacy DB values to v2 types for display. */
export function normalizeSessionType(value: string | null | undefined): SessionType {
  if (!value) return "founder_objective";
  if ((SESSION_TYPES as readonly string[]).includes(value)) return value as SessionTypeV2;
  if ((LEGACY_SESSION_TYPES as readonly string[]).includes(value)) return value as LegacySessionType;
  return "founder_objective";
}

/** Infer v2 session type from objective text. */
export function inferSessionTypeFromObjective(objective: string): SessionTypeV2 {
  const o = objective.toLowerCase();
  if (o.includes("incident") || o.includes("outage") || o.includes("critical")) return "incident";
  if (o.includes("fix") || o.includes("bug") || o.includes("production")) return "bug_fix";
  if (o.includes("growth") || o.includes("revenue") || o.includes("opportunity")) return "founder_objective";
  if (o.includes("research") || o.includes("competitive") || o.includes("market analysis")) return "research";
  if (o.includes("sales") || o.includes("customer") || o.includes("proposal")) return "customer_request";
  if (o.includes("marketing") || o.includes("campaign") || o.includes("content")) return "marketing";
  if (o.includes("operations") || o.includes("audit") || o.includes("capacity")) return "operations";
  if (o.includes("deploy")) return "product_development";
  if (o.includes("architect")) return "product_development";
  if (o.includes("implement") || o.includes("code") || o.includes("build") || o.includes("feature")) {
    return "product_development";
  }
  if (o.includes("document")) return "product_development";
  return "founder_objective";
}

/** Resolve template slug from session type. */
export function templateSlugForSessionType(type: SessionTypeV2): string {
  switch (type) {
    case "bug_fix":
      return "bug_fix";
    case "incident":
      return "incident_response";
    case "research":
      return "research";
    case "operations":
    case "duty":
      return "operations_review";
    case "automation":
      return "duty_session";
    case "product_development":
    case "customer_request":
    case "sales":
    case "marketing":
      return "product_development";
    case "founder_objective":
    default:
      return "founder_objective";
  }
}

/** Infer template slug from objective (considers growth-specific path). */
export function inferTemplateSlugFromObjective(objective: string): string {
  const o = objective.toLowerCase();
  if (o.includes("growth") || o.includes("portfolio review") || o.includes("strategy review")) {
    return "growth_review";
  }
  return templateSlugForSessionType(inferSessionTypeFromObjective(objective));
}
