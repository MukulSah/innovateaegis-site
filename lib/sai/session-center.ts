import type { FounderSessionRow, FounderSessionTimelineData } from "./founder-timeline";
import { SESSION_TYPE_LABELS, normalizeSessionType } from "./session-types";
import type {
  PriorityLevel,
  SessionAutomationRule,
  SessionCenterDashboardMetrics,
  SessionCenterSection,
  SessionDutyDefinition,
  SessionLifecycleStage,
  SessionTemplateDefinition,
} from "./types";

export const SESSION_CENTER_SECTION_TITLES: Record<SessionCenterSection, string> = {
  dashboard: "Operations Dashboard",
  "registry-all": "All Sessions",
  "registry-active": "Active Sessions",
  "registry-scheduled": "Scheduled Sessions",
  "registry-approval": "Waiting Approval",
  "registry-completed": "Completed Sessions",
  "registry-archived": "Archived Sessions",
  "registry-cancelled": "Cancelled Sessions",
  templates: "Session Templates",
  duties: "Scheduler & Duties",
  automation: "Scheduler & Duties",
  agents: "Agent Workspace",
  intelligence: "Session Intelligence",
  analytics: "Session Analytics",
  settings: "Session Settings",
};

export const SESSION_TEMPLATES: SessionTemplateDefinition[] = [
  {
    id: "founder-objective",
    label: "Founder Objective",
    description: "Strategic directive from the founder — execution starts immediately.",
    sessionType: "founder_objective",
    defaultPriority: "high",
    suggestedAgents: ["CEO", "COO"],
  },
  {
    id: "product-development",
    label: "Product Development",
    description: "Feature or product initiative from concept through delivery.",
    sessionType: "development",
    defaultPriority: "medium",
    suggestedAgents: ["Product Manager", "Architect", "Engineer"],
  },
  {
    id: "feature-request",
    label: "Feature Request",
    description: "Customer or internal feature scoped for implementation.",
    sessionType: "planning",
    defaultPriority: "medium",
    suggestedAgents: ["Product Manager", "Engineer"],
  },
  {
    id: "bug-fix",
    label: "Bug Fix",
    description: "Production or development defect remediation.",
    sessionType: "production_fix",
    defaultPriority: "high",
    suggestedAgents: ["Engineer", "QA"],
  },
  {
    id: "incident-response",
    label: "Incident Response",
    description: "Critical incident triage, mitigation, and post-mortem.",
    sessionType: "incident",
    defaultPriority: "critical",
    suggestedAgents: ["COO", "Engineer", "DevOps"],
  },
  {
    id: "research",
    label: "Research",
    description: "Market, technical, or competitive research initiative.",
    sessionType: "research",
    defaultPriority: "low",
    suggestedAgents: ["CEO", "Product Manager"],
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Campaign, content, or growth initiative.",
    sessionType: "marketing",
    defaultPriority: "medium",
    suggestedAgents: ["CEO", "Marketing"],
  },
  {
    id: "sales",
    label: "Sales",
    description: "Opportunity pursuit, proposal, or customer engagement.",
    sessionType: "sales",
    defaultPriority: "medium",
    suggestedAgents: ["Sales", "CEO"],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Operational review, audit, or process improvement.",
    sessionType: "operations",
    defaultPriority: "medium",
    suggestedAgents: ["COO"],
  },
];

export const SESSION_DUTIES: SessionDutyDefinition[] = [
  { id: "ceo-weekly-growth", agentRole: "CEO", title: "Weekly Growth Review", cadence: "Every Monday 9:00 AM", nextRun: null, status: "active", sessionTemplateId: "founder-objective" },
  { id: "ceo-monthly-portfolio", agentRole: "CEO", title: "Monthly Portfolio Review", cadence: "First Monday of month", nextRun: null, status: "active", sessionTemplateId: "founder-objective" },
  { id: "ceo-quarterly-strategy", agentRole: "CEO", title: "Quarterly Strategy Review", cadence: "Quarterly", nextRun: null, status: "active", sessionTemplateId: "founder-objective" },
  { id: "coo-daily-ops", agentRole: "COO", title: "Daily Operations Review", cadence: "Daily 8:00 AM", nextRun: null, status: "active", sessionTemplateId: "operations" },
  { id: "coo-weekly-delivery", agentRole: "COO", title: "Weekly Delivery Audit", cadence: "Every Friday", nextRun: null, status: "active", sessionTemplateId: "operations" },
  { id: "coo-capacity", agentRole: "COO", title: "Capacity Review", cadence: "Bi-weekly", nextRun: null, status: "active", sessionTemplateId: "operations" },
  { id: "pm-backlog", agentRole: "Product Manager", title: "Backlog Review", cadence: "Weekly", nextRun: null, status: "active", sessionTemplateId: "product-development" },
  { id: "pm-feedback", agentRole: "Product Manager", title: "Customer Feedback Review", cadence: "Weekly", nextRun: null, status: "active", sessionTemplateId: "feature-request" },
  { id: "eng-sprint", agentRole: "Engineer", title: "Sprint Readiness Check", cadence: "Bi-weekly", nextRun: null, status: "pending", sessionTemplateId: "product-development" },
  { id: "company-monthly-financial", agentRole: "CEO", title: "Monthly Financial Analysis", cadence: "Monthly", nextRun: null, status: "pending", sessionTemplateId: "operations" },
];

export const SESSION_AUTOMATIONS: SessionAutomationRule[] = [
  { id: "auto-ceo-monday", label: "CEO Weekly Review", type: "schedule", trigger: "Every Monday 9:00 AM", action: "Create CEO Growth Review session", status: "active", lastTriggered: null },
  { id: "auto-coo-daily", label: "Daily Operations Review", type: "schedule", trigger: "Daily 8:00 AM", action: "Create COO Operations Review session", status: "active", lastTriggered: null },
  { id: "auto-incident", label: "Critical Incident Response", type: "event", trigger: "Critical incident created", action: "Generate Incident Response session", status: "active", lastTriggered: null },
  { id: "auto-delay", label: "Project Delay Escalation", type: "event", trigger: "Project delay > 3 days", action: "Generate Risk Review session", status: "draft", lastTriggered: null },
  { id: "auto-revenue", label: "Revenue Drop Alert", type: "event", trigger: "Revenue drops 20%", action: "Generate Financial Review session", status: "draft", lastTriggered: null },
  { id: "auto-ceo-opportunity", label: "Growth Opportunity Detection", type: "agent", trigger: "CEO Agent identifies opportunity", action: "Create Growth Opportunity session", status: "active", lastTriggered: null },
];

const OVERDUE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function inferSessionPriority(session: FounderSessionRow): PriorityLevel {
  if (session.bucket === "blocked" || session.sessionStatus === "stalled" || session.sessionStatus === "recovery") {
    return "high";
  }
  if (session.bucket === "needs_founder_review" || session.pendingApprovalCount > 0) {
    return "critical";
  }
  if (session.sessionType === "production_fix") return "high";
  if (session.bucket === "completed" || session.bucket === "archived") return "low";
  return "medium";
}

export function inferLifecycleStage(session: FounderSessionRow): SessionLifecycleStage {
  if (session.bucket === "cancelled") return "cancelled";
  if (session.bucket === "archived") return "archived";
  if (session.bucket === "completed") return "completed";
  if (session.pendingApprovalCount > 0 || session.bucket === "awaiting_approval") return "approval";
  if (session.sessionStatus === "planning") return "planning";
  if (session.sessionStatus === "needs_founder_review") return "review";
  if (session.bucket === "active") return "executing";
  return "draft";
}

export function isSessionOverdue(session: FounderSessionRow): boolean {
  if (session.bucket !== "active" && session.bucket !== "blocked") return false;
  if (!session.lastActivityAt) return false;
  return Date.now() - new Date(session.lastActivityAt).getTime() > OVERDUE_THRESHOLD_MS;
}

export function buildSessionCenterDashboard(
  timeline: FounderSessionTimelineData,
  options?: { automationActive?: number },
): SessionCenterDashboardMetrics {
  const allSessions = [
    ...timeline.activeSessions,
    ...timeline.awaitingApprovalSessions,
    ...timeline.scheduledSessions,
    ...timeline.blockedSessions,
    ...timeline.needsFounderReview,
    ...timeline.completedSessions,
    ...timeline.archivedSessions,
    ...timeline.cancelledSessions,
  ];

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completedThisWeek = timeline.completedSessions.filter(
    (s) => s.completedAt && new Date(s.completedAt).getTime() > weekAgo,
  ).length;

  const overdueSessions = [
    ...timeline.activeSessions,
    ...timeline.blockedSessions,
    ...timeline.needsFounderReview,
  ].filter(isSessionOverdue).length;

  const activeHealth = timeline.activeSessions.length
    ? Math.round(
        timeline.activeSessions.reduce((sum, s) => sum + s.executionHealth, 0) /
          timeline.activeSessions.length,
      )
    : 100;

  const totalTerminal = timeline.completedSessions.length + timeline.cancelledSessions.length;
  const completionRate =
    allSessions.length > 0 ? Math.round((totalTerminal / allSessions.length) * 100) : 0;

  const knowledgeCaptured = timeline.completedSessions.filter((s) => s.artifactCount > 0).length;

  const agentActivityToday = new Set(
    timeline.activeSessions.map((s) => s.currentAgentName).filter(Boolean),
  ).size;

  return {
    activeSessions: timeline.activeSessions.length,
    awaitingApproval:
      timeline.awaitingFounderApproval.length + timeline.awaitingApprovalSessions.length,
    blockedSessions: timeline.blockedSessions.length + timeline.needsFounderReview.length,
    overdueSessions,
    completedThisWeek,
    scheduledSessions: timeline.scheduledSessions.length,
    automationActive: options?.automationActive ?? SESSION_AUTOMATIONS.filter((a) => a.status === "active").length,
    knowledgeCaptured,
    executionHealth: activeHealth,
    completionRate,
    agentActivityToday,
  };
}

export function getAllSessionRows(timeline: FounderSessionTimelineData): FounderSessionRow[] {
  const seen = new Set<string>();
  const rows: FounderSessionRow[] = [];
  const lists = [
    timeline.activeSessions,
    timeline.awaitingApprovalSessions,
    timeline.scheduledSessions,
    timeline.blockedSessions,
    timeline.needsFounderReview,
    timeline.completedSessions,
    timeline.archivedSessions,
    timeline.cancelledSessions,
  ];

  for (const list of lists) {
    for (const row of list) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }

  return rows.sort(
    (a, b) =>
      new Date(b.lastActivityAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.lastActivityAt ?? a.createdAt ?? 0).getTime(),
  );
}

export function getRegistryRows(
  timeline: FounderSessionTimelineData,
  section: SessionCenterSection,
): FounderSessionRow[] {
  switch (section) {
    case "registry-all":
      return getAllSessionRows(timeline);
    case "registry-active":
      return timeline.activeSessions;
    case "registry-scheduled":
      return timeline.scheduledSessions;
    case "registry-approval":
      return timeline.awaitingApprovalSessions;
    case "registry-completed":
      return timeline.completedSessions;
    case "registry-archived":
      return timeline.archivedSessions;
    case "registry-cancelled":
      return timeline.cancelledSessions;
    default:
      return [];
  }
}

export async function getScheduledSessions(): Promise<FounderSessionRow[]> {
  const { createSupabaseAdmin, isSupabaseConfigured } = await import("@/lib/supabase/admin");
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select(
      "id, project_id, session_number, objective, status, session_status, session_type, completed_at, last_activity_at, updated_at, created_at, projects(name)",
    )
    .not("scheduled_at", "is", null)
    .gt("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (error || !data) return [];

  return data.map((row) => {
    const projects = row.projects as { name: string } | { name: string }[] | null;
    const projectName = Array.isArray(projects) ? projects[0]?.name : projects?.name;
    return {
      id: row.id as string,
      sessionNumber: row.session_number as number | null,
      projectId: row.project_id as string,
      projectName: projectName ?? "Project",
      objective: row.objective as string,
      bucket: "active" as const,
      sessionStatus: row.session_status as FounderSessionRow["sessionStatus"],
      workflowStatus: row.status as string,
      currentAgentName: null,
      currentDeliverable: "Scheduled",
      currentArtifact: null,
      executionHealth: 0,
      strategicHealth: 0,
      createdAt: row.created_at as string,
      lastActivityAt: row.last_activity_at as string | null,
      completedAt: null,
      artifactCount: 0,
      agentsInvolved: [],
      sessionType: normalizeSessionType(row.session_type as string),
      deliveryOutcome: null,
      pendingApprovalCount: 0,
      lastAiReviewAt: null,
      lastAiReviewLabel: null,
    };
  });
}

export function formatSessionTypeLabel(type: string | null): string {
  if (!type) return "General";
  const normalized = normalizeSessionType(type);
  if (normalized in SESSION_TYPE_LABELS) {
    return SESSION_TYPE_LABELS[normalized as keyof typeof SESSION_TYPE_LABELS];
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
