import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { computeSessionHealth } from "./execution-health";
import { getWorkflowApprovals } from "./governance";
import { getSessionState } from "./session-state-engine";
import { computeStrategicHealth } from "./strategic-health";
import type { ApprovalType, SessionStatus } from "./types";
import { inferSessionTypeFromObjective as inferV2SessionType, normalizeSessionType } from "./session-types";

export type FounderSessionBucket =
  | "active"
  | "awaiting_approval"
  | "scheduled"
  | "blocked"
  | "needs_founder_review"
  | "completed"
  | "archived"
  | "cancelled";

export type FounderSessionRow = {
  id: string;
  sessionNumber: number | null;
  projectId: string;
  projectName: string;
  objective: string;
  bucket: FounderSessionBucket;
  sessionStatus: SessionStatus;
  workflowStatus: string;
  currentAgentName: string | null;
  currentDeliverable: string | null;
  currentArtifact: string | null;
  executionHealth: number;
  strategicHealth: number;
  createdAt: string | null;
  lastActivityAt: string | null;
  completedAt: string | null;
  artifactCount: number;
  agentsInvolved: string[];
  sessionType: ReturnType<typeof normalizeSessionType> | null;
  deliveryOutcome: string | null;
  pendingApprovalCount: number;
  lastAiReviewAt: string | null;
  lastAiReviewLabel: string | null;
};

export type FounderAwaitingApproval = {
  id: string;
  workflowId: string | null;
  projectId: string;
  projectName: string | null;
  sessionNumber: number | null;
  objective: string | null;
  approvalType: ApprovalType;
  title: string;
  requestedBy: string;
  requestedAt: string;
  waitingHours: number;
  impact: "critical" | "high" | "medium" | "low";
  artifactPreview: string;
};

export type FounderSessionTimelineData = {
  generatedAt: string;
  activeSessions: FounderSessionRow[];
  awaitingApprovalSessions: FounderSessionRow[];
  scheduledSessions: FounderSessionRow[];
  awaitingFounderApproval: FounderAwaitingApproval[];
  completedSessions: FounderSessionRow[];
  archivedSessions: FounderSessionRow[];
  cancelledSessions: FounderSessionRow[];
  blockedSessions: FounderSessionRow[];
  needsFounderReview: FounderSessionRow[];
};

type RunRow = {
  id: string;
  project_id: string;
  session_number: number | null;
  objective: string;
  status: string;
  session_status: string;
  session_type: string | null;
  delivery_outcome: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  updated_at: string;
  created_at: string;
  scheduled_at: string | null;
  projects: { name: string } | null;
};

function classifyBucket(
  status: string,
  sessionStatus: SessionStatus,
  pendingCount: number,
  scheduledAt: string | null,
): FounderSessionBucket {
  if (sessionStatus === "cancelled") return "cancelled";
  if (sessionStatus === "needs_founder_review") return "needs_founder_review";
  if (sessionStatus === "completed" || status === "completed") return "completed";
  if (sessionStatus === "blocked" || sessionStatus === "stalled" || sessionStatus === "recovery") {
    return "blocked";
  }
  if (sessionStatus === "waiting_approval" || pendingCount > 0) return "awaiting_approval";
  if (status === "paused") return "scheduled";
  if (scheduledAt && new Date(scheduledAt) > new Date()) return "scheduled";
  if (status === "running") return "active";
  return "archived";
}

function inferSessionTypeFromObjective(objective: string) {
  return inferV2SessionType(objective);
}

function approvalImpact(type: ApprovalType): FounderAwaitingApproval["impact"] {
  if (type === "strategic_objective" || type === "release") return "critical";
  if (type === "architecture" || type === "requirements") return "high";
  if (type === "task_plan" || type === "execution_readiness") return "medium";
  return "low";
}

async function buildSessionRow(
  row: RunRow,
  pendingByWorkflow: Map<string, number>,
  artifactCounts: Map<string, number>,
  agentsByWorkflow: Map<string, string[]>,
  lastAiReviewByWorkflow: Map<string, { at: string; label: string }>,
): Promise<FounderSessionRow> {
  const pendingCount = pendingByWorkflow.get(row.id) ?? 0;
  const sessionStatus = row.session_status as SessionStatus;
  let bucket = classifyBucket(row.status, sessionStatus, pendingCount, row.scheduled_at);

  const completedMs = row.completed_at ? new Date(row.completed_at).getTime() : null;
  const isFullyClosed =
    row.status === "completed" && (sessionStatus === "completed" || sessionStatus === "cancelled");
  if (
    bucket === "completed" &&
    isFullyClosed &&
    completedMs &&
    Date.now() - completedMs > 30 * 24 * 60 * 60 * 1000
  ) {
    bucket = "archived";
  }

  const [state, executionHealth, strategicHealth] = await Promise.all([
    getSessionState(row.id),
    computeSessionHealth(row.id).catch(() => ({ score: 0 })),
    computeStrategicHealth(row.id).catch(() => ({ score: 0 })),
  ]);

  return {
    id: row.id,
    sessionNumber: row.session_number,
    projectId: row.project_id,
    projectName: row.projects?.name ?? "Project",
    objective: row.objective,
    bucket,
    sessionStatus,
    workflowStatus: row.status,
    currentAgentName: state?.currentAgentName ?? null,
    currentDeliverable: state?.currentDeliverable ?? null,
    currentArtifact: state?.currentArtifact ?? null,
    executionHealth: state?.executionHealth ?? executionHealth.score,
    strategicHealth: strategicHealth.score,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at ?? row.updated_at ?? row.created_at,
    completedAt: row.completed_at,
    artifactCount: artifactCounts.get(row.id) ?? 0,
    agentsInvolved: agentsByWorkflow.get(row.id) ?? [],
    sessionType: normalizeSessionType(
      (row.session_type as string) ?? inferSessionTypeFromObjective(row.objective),
    ),
    deliveryOutcome: row.delivery_outcome ?? null,
    pendingApprovalCount: pendingCount,
    lastAiReviewAt: lastAiReviewByWorkflow.get(row.id)?.at ?? null,
    lastAiReviewLabel: lastAiReviewByWorkflow.get(row.id)?.label ?? null,
  };
}

export async function getFounderSessionTimeline(filters?: {
  projectId?: string;
  search?: string;
  bucket?: FounderSessionBucket;
  limit?: number;
}): Promise<FounderSessionTimelineData> {
  const empty: FounderSessionTimelineData = {
    generatedAt: new Date().toISOString(),
    activeSessions: [],
    awaitingApprovalSessions: [],
    scheduledSessions: [],
    awaitingFounderApproval: [],
    completedSessions: [],
    archivedSessions: [],
    cancelledSessions: [],
    blockedSessions: [],
    needsFounderReview: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("workflow_runs")
    .select(
      "id, project_id, session_number, objective, status, session_status, session_type, delivery_outcome, completed_at, last_activity_at, updated_at, created_at, scheduled_at, projects(name)",
    )
    .order("updated_at", { ascending: false });

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.limit) query = query.limit(filters.limit);
  else query = query.limit(500);

  const { data: runs, error } = await query;
  if (error) throw new Error(error.message);

  let rows: RunRow[] = (runs ?? []).map((row) => {
    const projects = row.projects as { name: string } | { name: string }[] | null;
    const project = Array.isArray(projects) ? projects[0] ?? null : projects;
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      session_number: row.session_number as number | null,
      objective: row.objective as string,
      status: row.status as string,
      session_status: row.session_status as string,
      session_type: (row as { session_type?: string | null }).session_type ?? null,
      delivery_outcome: (row as { delivery_outcome?: string | null }).delivery_outcome ?? null,
      completed_at: row.completed_at as string | null,
      last_activity_at: row.last_activity_at as string | null,
      updated_at: row.updated_at as string,
      created_at: row.created_at as string,
      scheduled_at: (row as { scheduled_at?: string | null }).scheduled_at ?? null,
      projects: project,
    };
  });
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.objective.toLowerCase().includes(q) ||
        String(r.session_number ?? "").includes(q) ||
        (r.projects?.name ?? "").toLowerCase().includes(q),
    );
  }

  const sessionIds = rows.map((r) => r.id);

  const [pendingApprovals, artifactRes, agentRes, latestReviewRes] = await Promise.all([
    getWorkflowApprovals({ status: "pending" }),
    sessionIds.length
      ? supabase.from("session_artifacts").select("workflow_run_id").in("workflow_run_id", sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? supabase
          .from("session_artifacts")
          .select("workflow_run_id, agent_id, agents(name)")
          .in("workflow_run_id", sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? supabase
          .from("session_artifacts")
          .select("workflow_run_id, artifact_name, step_key, created_at")
          .in("workflow_run_id", sessionIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const pendingByWorkflow = new Map<string, number>();
  for (const a of pendingApprovals) {
    if (!a.workflowId) continue;
    pendingByWorkflow.set(a.workflowId, (pendingByWorkflow.get(a.workflowId) ?? 0) + 1);
  }

  const artifactCounts = new Map<string, number>();
  for (const a of artifactRes.data ?? []) {
    const id = a.workflow_run_id as string;
    artifactCounts.set(id, (artifactCounts.get(id) ?? 0) + 1);
  }

  const agentsByWorkflow = new Map<string, Set<string>>();
  for (const a of agentRes.data ?? []) {
    const id = a.workflow_run_id as string;
    const agents = a.agents as { name: string } | { name: string }[] | null;
    const name = Array.isArray(agents) ? agents[0]?.name : agents?.name;
    if (!name) continue;
    if (!agentsByWorkflow.has(id)) agentsByWorkflow.set(id, new Set());
    agentsByWorkflow.get(id)!.add(name);
  }

  const lastAiReviewByWorkflow = new Map<string, { at: string; label: string }>();
  const reviewSteps = new Set([
    "ceo_monitoring",
    "ceo_strategy",
    "coo_execution",
    "knowledge",
    "executive_review",
  ]);
  for (const a of latestReviewRes.data ?? []) {
    const id = a.workflow_run_id as string;
    if (lastAiReviewByWorkflow.has(id)) continue;
    const stepKey = (a.step_key as string) ?? "";
    const artifactName = (a.artifact_name as string) ?? "";
    if (
      reviewSteps.has(stepKey) ||
      artifactName.includes("review") ||
      artifactName.includes("monitoring") ||
      artifactName.includes("executive")
    ) {
      lastAiReviewByWorkflow.set(id, {
        at: a.created_at as string,
        label: artifactName || stepKey.replace(/_/g, " "),
      });
    }
  }

  const sessionRows = await Promise.all(
    rows.map((r) =>
      buildSessionRow(
        r,
        pendingByWorkflow,
        artifactCounts,
        new Map([...agentsByWorkflow.entries()].map(([k, v]) => [k, [...v]])),
        lastAiReviewByWorkflow,
      ),
    ),
  );

  const byBucket = (bucket: FounderSessionBucket) =>
    sessionRows.filter((s) => s.bucket === bucket);

  const sessionById = new Map(sessionRows.map((s) => [s.id, s]));

  const awaitingFounderApproval: FounderAwaitingApproval[] = pendingApprovals
    .filter((a) => a.status === "pending" || a.status === "escalated")
    .map((a) => {
      const session = a.workflowId ? sessionById.get(a.workflowId) : null;
      const requestedAt = a.requestedAt;
      const waitingMs = Date.now() - new Date(requestedAt).getTime();
      return {
        id: a.id,
        workflowId: a.workflowId,
        projectId: a.projectId,
        projectName: a.projectName ?? session?.projectName ?? null,
        sessionNumber: session?.sessionNumber ?? null,
        objective: session?.objective ?? null,
        approvalType: a.approvalType,
        title: a.title,
        requestedBy: a.requestedBy,
        requestedAt,
        waitingHours: Math.round(waitingMs / (1000 * 60 * 60)),
        impact: approvalImpact(a.approvalType),
        artifactPreview: (a.artifactContent ?? "").slice(0, 200),
      };
    });

  const result: FounderSessionTimelineData = {
    generatedAt: new Date().toISOString(),
    activeSessions: byBucket("active"),
    awaitingApprovalSessions: byBucket("awaiting_approval"),
    scheduledSessions: byBucket("scheduled"),
    awaitingFounderApproval,
    completedSessions: byBucket("completed"),
    archivedSessions: byBucket("archived"),
    cancelledSessions: byBucket("cancelled"),
    blockedSessions: byBucket("blocked"),
    needsFounderReview: byBucket("needs_founder_review"),
  };

  if (filters?.bucket) {
    const key = {
      active: "activeSessions",
      awaiting_approval: "awaitingApprovalSessions",
      scheduled: "scheduledSessions",
      blocked: "blockedSessions",
      needs_founder_review: "needsFounderReview",
      completed: "completedSessions",
      archived: "archivedSessions",
      cancelled: "cancelledSessions",
    }[filters.bucket] as keyof FounderSessionTimelineData;

    if (key && key !== "generatedAt" && key !== "awaitingFounderApproval") {
      return { ...empty, [key]: result[key], generatedAt: result.generatedAt };
    }
  }

  return result;
}

export async function getSessionExecutiveTimeline(sessionId: string) {
  const { getExecutiveTimelineForSession } = await import("./executive-timeline");
  return getExecutiveTimelineForSession(sessionId);
}
