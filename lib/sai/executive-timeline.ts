import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getApprovalHistory } from "./approval-history";
import { getCompanyTimeline } from "./company-timeline";
import { getWorkflowEvents } from "./workflow-events";

export type ExecutiveTimelineEntry = {
  id: string;
  timestamp: string;
  source: "company" | "workflow" | "approval";
  eventType: string;
  title: string;
  description: string;
  actor: string;
  severity: string;
  sessionId: string | null;
  projectId: string | null;
};

export async function getExecutiveTimeline(filters?: {
  sessionId?: string;
  projectId?: string;
  limit?: number;
}): Promise<ExecutiveTimelineEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const limit = filters?.limit ?? 100;
  const entries: ExecutiveTimelineEntry[] = [];

  const [companyEvents, approvalHistory] = await Promise.all([
    getCompanyTimeline({ projectId: filters?.projectId, limit }),
    getApprovalHistory({
      workflowId: filters?.sessionId,
      projectId: filters?.projectId,
      limit: 50,
    }),
  ]);

  for (const e of companyEvents) {
    if (filters?.sessionId && e.workflowId && e.workflowId !== filters.sessionId) continue;
    entries.push({
      id: `company-${e.id}`,
      timestamp: e.createdAt,
      source: "company",
      eventType: e.eventType,
      title: e.title,
      description: e.description,
      actor: e.actor,
      severity: e.severity,
      sessionId: e.workflowId,
      projectId: e.projectId,
    });
  }

  for (const h of approvalHistory) {
    entries.push({
      id: `approval-${h.id}`,
      timestamp: h.decidedAt,
      source: "approval",
      eventType: h.decision,
      title: h.title,
      description: h.comments || `${h.decision} by ${h.decidedBy ?? h.requestedBy}`,
      actor: h.decidedBy ?? h.requestedBy,
      severity: h.decision === "rejected" || h.decision === "escalated" ? "high" : "info",
      sessionId: h.workflowId,
      projectId: h.projectId,
    });
  }

  if (filters?.sessionId) {
    const workflowEvents = await getWorkflowEvents(filters.sessionId);
    for (const e of workflowEvents) {
      entries.push({
        id: `workflow-${e.id}`,
        timestamp: e.createdAt,
        source: "workflow",
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        actor: e.actor,
        severity: "info",
        sessionId: filters.sessionId,
        projectId: filters.projectId ?? null,
      });
    }
  }

  return entries
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export async function getExecutiveTimelineForSession(sessionId: string): Promise<ExecutiveTimelineEntry[]> {
  const supabase = createSupabaseAdmin();
  const { data: run } = await supabase
    .from("workflow_runs")
    .select("project_id")
    .eq("id", sessionId)
    .maybeSingle();

  return getExecutiveTimeline({
    sessionId,
    projectId: run?.project_id as string | undefined,
    limit: 150,
  });
}

export async function getCompanyExecutiveTimeline(limit = 80): Promise<ExecutiveTimelineEntry[]> {
  return getExecutiveTimeline({ limit });
}
