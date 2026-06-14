import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivity } from "./activity-logs";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder, notifyTeam } from "./notifications";
import { recordCompanyTimeline } from "./company-timeline";
import { incrementAgentMetric } from "./agent-metrics";
import type {
  ApprovalMode,
  ApprovalPolicy,
  ApprovalType,
  GovernanceProfile,
  WorkflowApproval,
  WorkflowApprovalStatus,
  WorkflowMode,
} from "./types";

type PolicyRow = {
  id: string;
  name: string;
  approval_type: string;
  mode: ApprovalMode;
  approver_role: string;
  conditions: Record<string, unknown>;
  active: boolean;
  created_at: string;
};

type ApprovalRow = {
  id: string;
  workflow_id: string;
  workflow_step_id: string | null;
  project_id: string;
  approval_type: string;
  approval_mode: ApprovalMode;
  title: string;
  description: string;
  status: WorkflowApprovalStatus;
  priority: string;
  requested_by: string;
  approved_by: string | null;
  requested_at: string;
  approved_at: string | null;
  comments: string;
  artifact_content: string;
  projects?: { name: string } | null;
  workflow_runs?: { objective: string } | null;
};

const CRITICAL_TYPES: ApprovalType[] = [
  "strategic_objective",
  "requirements",
  "architecture",
  "milestones",
  "release",
  "security",
  "infrastructure",
  "database_change",
];

function mapPolicy(row: PolicyRow): ApprovalPolicy {
  return {
    id: row.id,
    name: row.name,
    approvalType: row.approval_type as ApprovalType,
    mode: row.mode,
    approverRole: row.approver_role,
    conditions: row.conditions ?? {},
    active: row.active,
    createdAt: row.created_at,
  };
}

function mapApproval(row: ApprovalRow): WorkflowApproval {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    workflowStepId: row.workflow_step_id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    workflowObjective: row.workflow_runs?.objective ?? null,
    approvalType: row.approval_type as ApprovalType,
    approvalMode: row.approval_mode,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority as WorkflowApproval["priority"],
    requestedBy: row.requested_by,
    approvedBy: row.approved_by,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    comments: row.comments,
    artifactContent: row.artifact_content,
  };
}

const approvalSelect = `*, projects(name), workflow_runs(objective)`;

export async function getApprovalPolicies(): Promise<ApprovalPolicy[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("approval_policies")
    .select("*")
    .eq("active", true)
    .order("approval_type");
  if (error) throw new Error(error.message);
  return (data as PolicyRow[]).map(mapPolicy);
}

export async function updateApprovalPolicy(
  id: string,
  updates: Partial<Pick<ApprovalPolicy, "mode" | "active" | "approverRole">>,
): Promise<ApprovalPolicy> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("approval_policies")
    .update({
      mode: updates.mode,
      active: updates.active,
      approver_role: updates.approverRole,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapPolicy(data as PolicyRow);
}

export async function getProjectGovernance(projectId: string): Promise<{
  governanceProfile: GovernanceProfile;
  workflowMode: WorkflowMode;
}> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("governance_profile, workflow_mode")
    .eq("id", projectId)
    .single();
  if (error) throw new Error(error.message);
  return {
    governanceProfile: (data.governance_profile as GovernanceProfile) ?? "standard",
    workflowMode: (data.workflow_mode as WorkflowMode) ?? "semi_autonomous",
  };
}

export function resolveApprovalMode(
  policy: ApprovalPolicy | null,
  governanceProfile: GovernanceProfile,
  workflowMode: WorkflowMode,
  approvalType: ApprovalType,
  context: Record<string, unknown> = {},
): ApprovalMode {
  if (workflowMode === "manual") return "manual";
  if (workflowMode === "autonomous" && !CRITICAL_TYPES.includes(approvalType)) return "auto";

  if (governanceProfile === "strict") {
    if (policy?.mode === "auto" && approvalType === "document") return "auto";
    return policy?.mode === "escalated" ? "escalated" : "manual";
  }

  if (governanceProfile === "autonomous") {
    if (policy?.mode === "escalated") return "escalated";
    if (context.securityRisk === "high" || context.databaseRisk === "high") return "escalated";
    if (context.releaseType === "major") return "escalated";
    return "auto";
  }

  // standard
  if (CRITICAL_TYPES.includes(approvalType)) {
    return policy?.mode === "escalated" ? "escalated" : "manual";
  }
  return policy?.mode ?? "auto";
}

export type ApprovalRequestInput = {
  workflowId?: string | null;
  workflowStepId?: string | null;
  projectId: string;
  approvalType: ApprovalType;
  title: string;
  description?: string;
  requestedBy: string;
  artifactContent?: string;
  context?: Record<string, unknown>;
  priority?: WorkflowApproval["priority"];
};

export async function requestWorkflowApproval(
  input: ApprovalRequestInput,
): Promise<{ approval: WorkflowApproval; canProceed: boolean }> {
  const supabase = createSupabaseAdmin();

  if (input.workflowId) {
    const executable = await (await import("./session-state-engine")).isSessionExecutable(
      input.workflowId,
    );
    if (!executable) {
      const { data: last } = await supabase
        .from("workflow_approvals")
        .select(approvalSelect)
        .eq("workflow_id", input.workflowId)
        .eq("approval_type", input.approvalType)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last) {
        return { approval: mapApproval(last as ApprovalRow), canProceed: false };
      }
      throw new Error("Cannot request approval — session is not active");
    }

    const { data: pending } = await supabase
      .from("workflow_approvals")
      .select(approvalSelect)
      .eq("workflow_id", input.workflowId)
      .eq("approval_type", input.approvalType)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pending) {
      return { approval: mapApproval(pending as ApprovalRow), canProceed: false };
    }
  }

  const { governanceProfile, workflowMode } = await getProjectGovernance(input.projectId);

  const { data: policies } = await supabase
    .from("approval_policies")
    .select("*")
    .eq("approval_type", input.approvalType)
    .eq("active", true)
    .limit(1);

  const policy = policies?.[0] ? mapPolicy(policies[0] as PolicyRow) : null;
  const mode = resolveApprovalMode(
    policy,
    governanceProfile,
    workflowMode,
    input.approvalType,
    input.context,
  );

  const isAuto = mode === "auto";
  const isEscalated = mode === "escalated";
  const status: WorkflowApprovalStatus = isAuto
    ? "auto_approved"
    : isEscalated
      ? "escalated"
      : "pending";

  const { data, error } = await supabase
    .from("workflow_approvals")
    .insert({
      workflow_id: input.workflowId ?? null,
      workflow_step_id: input.workflowStepId ?? null,
      project_id: input.projectId,
      approval_type: input.approvalType,
      approval_mode: mode,
      title: input.title,
      description: input.description ?? "",
      status,
      priority: input.priority ?? (isEscalated ? "critical" : "medium"),
      requested_by: input.requestedBy,
      approved_by: isAuto ? "SAI Auto-Approval Engine" : null,
      approved_at: isAuto ? new Date().toISOString() : null,
      artifact_content: input.artifactContent ?? "",
    })
    .select(approvalSelect)
    .single();

  if (error) throw new Error(error.message);
  const approval = mapApproval(data as ApprovalRow);

  await (await import("./approval-history")).recordApprovalHistory({
    approvalId: approval.id,
    workflowId: input.workflowId ?? null,
    projectId: input.projectId,
    approvalType: input.approvalType,
    title: input.title,
    requestedBy: input.requestedBy,
    decidedBy: isAuto ? "SAI Auto-Approval Engine" : null,
    decision: isAuto ? "auto_approved" : "requested",
    artifactContent: input.artifactContent ?? "",
    requestedAt: approval.requestedAt,
  });

  const eventType = isAuto ? "auto_approved" : isEscalated ? "escalation_triggered" : "approval_requested";
  const severity = isEscalated ? "critical" : isAuto ? "info" : "medium";

  await recordCompanyTimeline({
    eventType,
    entityType: "approval",
    entityId: approval.id,
    projectId: input.projectId,
    workflowId: input.workflowId,
    title: isAuto ? `Auto approved: ${input.title}` : isEscalated ? `Escalated: ${input.title}` : `Approval requested: ${input.title}`,
    description: input.description ?? "",
    actor: input.requestedBy,
    severity,
  });

  await recordActivity({
    actor: input.requestedBy,
    action: eventType === "auto_approved" ? `Auto approved: ${input.title}` : `Approval requested: ${input.title}`,
    entityType: "approval",
    entityId: approval.id,
  });

  await recordActivityFeed({
    actor: input.requestedBy,
    action: eventType,
    targetType: "approval",
    targetId: approval.id,
    description: input.title,
  });

  if (isEscalated) {
    await notifyFounder(
      `Escalation: ${input.title}`,
      input.description ?? "Action requires founder attention",
      "ESCALATION",
      { severity: "CRITICAL", entityType: "approval", entityId: approval.id },
    );
    await notifyTeam(
      `Escalation triggered: ${input.title}`,
      input.description ?? "",
      "ESCALATION",
      { severity: "HIGH", entityType: "approval", entityId: approval.id },
    );
  } else if (!isAuto) {
    await notifyFounder(
      `Approval requested: ${input.title}`,
      input.description ?? "",
      "APPROVAL",
      {
        severity: isEscalated ? "CRITICAL" : "HIGH",
        entityType: "approval",
        entityId: approval.id,
      },
    );
  }

  if (!isAuto && input.workflowId) {
    const governanceStatus = isEscalated ? "escalated" : "waiting_for_approval";
    await supabase
      .from("workflow_runs")
      .update({
        governance_status: governanceStatus,
        status: "paused",
        session_status: "waiting_approval",
      })
      .eq("id", input.workflowId);
  }

  if (isAuto) {
    await incrementAgentMetric(input.requestedBy, "auto_approved_actions");
  } else {
    await incrementAgentMetric(input.requestedBy, "approvals_requested");
    if (isEscalated) await incrementAgentMetric(input.requestedBy, "escalated_actions");
  }

  return { approval, canProceed: isAuto };
}

export async function getWorkflowApprovals(filters?: {
  status?: WorkflowApprovalStatus;
  workflowId?: string;
  projectId?: string;
}): Promise<WorkflowApproval[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseAdmin();
  let query = supabase.from("workflow_approvals").select(approvalSelect).order("requested_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.workflowId) query = query.eq("workflow_id", filters.workflowId);
  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let approvals = (data as ApprovalRow[]).map(mapApproval);

  if (!filters?.workflowId && filters?.status === "pending") {
    const workflowIds = [
      ...new Set(approvals.map((a) => a.workflowId).filter(Boolean)),
    ] as string[];
    if (workflowIds.length) {
      const { data: runs } = await supabase
        .from("workflow_runs")
        .select("id, status, session_status")
        .in("id", workflowIds);
      const activeIds = new Set(
        (runs ?? [])
          .filter(
            (r) =>
              r.status === "running" &&
              !["cancelled", "completed", "failed"].includes(r.session_status as string),
          )
          .map((r) => r.id as string),
      );
      approvals = approvals.filter((a) => !a.workflowId || activeIds.has(a.workflowId));
    }
  }

  return approvals;
}

export async function getWorkflowApprovalById(id: string): Promise<WorkflowApproval | null> {
  const supabase = createSupabaseAdmin();
  const { data: approval, error: approvalError } = await supabase
    .from("workflow_approvals")
    .select(approvalSelect)
    .eq("id", id)
    .maybeSingle();
  if (approvalError) throw new Error(approvalError.message);
  return approval ? mapApproval(approval as ApprovalRow) : null;
}

export async function getApprovalComments(approvalId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("approval_comments")
    .select("*")
    .eq("approval_id", approvalId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    approvalId: row.approval_id as string,
    author: row.author as string,
    content: row.content as string,
    createdAt: row.created_at as string,
  }));
}

export async function addWorkflowDiscussion(
  workflowId: string,
  author: string,
  authorType: "founder" | "agent" | "employee",
  content: string,
) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_discussions")
    .insert({ workflow_id: workflowId, author, author_type: authorType, content })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id as string,
    workflowId,
    author,
    authorType,
    content,
    createdAt: data.created_at as string,
  };
}

export async function getWorkflowDiscussions(workflowId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("workflow_discussions")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    workflowId: row.workflow_id as string,
    author: row.author as string,
    authorType: row.author_type as "founder" | "agent" | "employee",
    content: row.content as string,
    createdAt: row.created_at as string,
  }));
}

export async function processApprovalDecision(
  approvalId: string,
  decision: "approved" | "rejected" | "revision_required" | "escalated",
  actor: string,
  comments = "",
  force = false,
  actorUserId?: string | null,
): Promise<WorkflowApproval> {
  const supabase = createSupabaseAdmin();
  const existing = await getWorkflowApprovalById(approvalId);
  if (!existing) throw new Error("Approval not found");

  const statusMap: Record<string, WorkflowApprovalStatus> = {
    approved: "approved",
    rejected: "rejected",
    revision_required: "revision_required",
    escalated: "escalated",
  };

  const status = statusMap[decision];
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("workflow_approvals")
    .update({
      status,
      approved_by: actor,
      approved_at: now,
      comments: comments || existing.comments,
    })
    .eq("id", approvalId)
    .select(approvalSelect)
    .single();

  if (error) throw new Error(error.message);
  const approval = mapApproval(data as ApprovalRow);

  if (comments) {
    await supabase.from("approval_comments").insert({
      approval_id: approvalId,
      author: actor,
      content: comments,
    });
  }

  await (await import("./approval-history")).recordApprovalHistory({
    approvalId: approval.id,
    workflowId: approval.workflowId,
    projectId: approval.projectId,
    approvalType: approval.approvalType,
    title: approval.title,
    requestedBy: approval.requestedBy,
    decidedBy: actor,
    decision: status as import("./approval-history").ApprovalHistoryDecision,
    artifactContent: approval.artifactContent,
    comments: comments || approval.comments,
    requestedAt: approval.requestedAt,
  });

  const eventType =
    decision === "approved"
      ? "approval_approved"
      : decision === "rejected"
        ? "approval_rejected"
        : decision === "revision_required"
          ? "approval_revision_required"
          : "escalation_triggered";

  await recordCompanyTimeline({
    eventType,
    entityType: "approval",
    entityId: approvalId,
    projectId: approval.projectId,
    workflowId: approval.workflowId,
    title: `${decision.replace("_", " ")}: ${approval.title}`,
    description: comments,
    actor,
    severity: decision === "escalated" ? "critical" : decision === "rejected" ? "high" : "info",
  });

  if (force) {
    await supabase.from("founder_overrides").insert({
      action: `force_${decision}`,
      entity_type: "approval",
      entity_id: approvalId,
      reason: comments || "Founder override",
      actor,
    });
    await recordCompanyTimeline({
      eventType: "founder_override",
      entityType: "approval",
      entityId: approvalId,
      projectId: approval.projectId,
      workflowId: approval.workflowId,
      title: `Founder override: ${decision}`,
      description: comments,
      actor,
      severity: "high",
    });
  }

  if (approval.approvalType === "strategic_objective" && decision === "approved") {
    const { activateSession } = await import("./founder-objectives");
    const {
      createApprovalTrail,
      appendTrailStep,
      completeTrail,
      getApprovalTrailById,
      ApprovalActivationError,
    } = await import("./approval-trail");

    const { data: objective } = await supabase
      .from("project_objectives")
      .select("id")
      .eq("project_id", approval.projectId)
      .eq("status", "pending_founder")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const trail = await createApprovalTrail(approvalId, objective?.id ?? null);
    await appendTrailStep(trail.id, {
      key: "approval_received",
      label: "Approval Received",
      status: "completed",
    });
    await appendTrailStep(trail.id, {
      key: "approval_updated",
      label: "Approval Updated",
      status: "completed",
    });
    await appendTrailStep(trail.id, {
      key: "founder_decision_saved",
      label: "Founder Decision Saved",
      status: "completed",
    });

    if (objective?.id) {
      await appendTrailStep(trail.id, {
        key: "session_activation_started",
        label: "Session Activation Started",
        status: "completed",
      });
      try {
        const workflowRun = await activateSession(
          objective.id,
          { userId: actorUserId ?? null, name: actor },
          trail.id,
        );
        await completeTrail(trail.id, "completed", undefined, workflowRun.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Session activation failed";
        await appendTrailStep(trail.id, {
          key: "session_activation_failed",
          label: "Session Activation Failed",
          status: "failed",
          error: message,
        });
        await completeTrail(trail.id, "failed", message);
        const updatedTrail = await getApprovalTrailById(trail.id);
        throw new ApprovalActivationError(message, trail.id, updatedTrail?.steps ?? []);
      }
    } else {
      await appendTrailStep(trail.id, {
        key: "objective_not_found",
        label: "No Pending Objective Found",
        status: "failed",
        error: "No objective with status pending_founder",
      });
      await completeTrail(trail.id, "failed", "No pending objective found for activation");
    }
  }

  if (approval.workflowId) {
    if (decision === "approved") {
      await supabase
        .from("workflow_runs")
        .update({
          governance_status: "normal",
          status: "running",
          session_status: "running",
        })
        .eq("id", approval.workflowId);

      if (approval.approvalType === "requirements") {
        const { data: wf } = await supabase
          .from("workflow_runs")
          .select("session_owner_agent_id")
          .eq("id", approval.workflowId)
          .maybeSingle();
        const { data: reqArtifact } = await supabase
          .from("session_artifacts")
          .select("id")
          .eq("workflow_run_id", approval.workflowId)
          .eq("artifact_name", "requirements_v1")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data: pmStep } = await supabase
          .from("workflow_run_steps")
          .select("assigned_agent_id")
          .eq("workflow_run_id", approval.workflowId)
          .eq("step_key", "requirements")
          .maybeSingle();

        const cooAgentId = (wf?.session_owner_agent_id as string) ?? null;
        const pmAgentId = (pmStep?.assigned_agent_id as string) ?? cooAgentId;

        if (cooAgentId && pmAgentId) {
          const { completeRequirementsAndRouteToArchitect, reconcileSessionState } =
            await import("./session-state-engine");
          const result = await completeRequirementsAndRouteToArchitect({
            sessionId: approval.workflowId,
            cooAgentId,
            pmAgentId,
            artifactId: reqArtifact?.id ?? null,
          });
          if (!result.ok) {
            console.error(
              `[governance] requirements routing failed for ${approval.workflowId}:`,
              result.error,
            );
            await reconcileSessionState(approval.workflowId);
          }
        } else {
          const { reconcileSessionState } = await import("./session-state-engine");
          await reconcileSessionState(approval.workflowId);
        }
      }

      if (approval.approvalType !== "strategic_objective" && approval.approvalType !== "requirements") {
        const { resumeOrchestration } = await import("./orchestration");
        const { data: wf } = await supabase
          .from("workflow_runs")
          .select("objective, project_id")
          .eq("id", approval.workflowId)
          .maybeSingle();
        const { data: project } = wf
          ? await supabase.from("projects").select("name").eq("id", wf.project_id).maybeSingle()
          : { data: null };
        if (wf) {
          await resumeOrchestration(
            approval.workflowId,
            wf.project_id,
            wf.objective,
            project?.name ?? "Project",
          );
        }
      }
      await incrementAgentMetric(approval.requestedBy, "approvals_passed");
    } else if (decision === "rejected" || decision === "revision_required") {
      await supabase
        .from("workflow_runs")
        .update({ governance_status: "waiting_for_revision", status: "paused" })
        .eq("id", approval.workflowId);
      await incrementAgentMetric(approval.requestedBy, "approvals_rejected");
    } else if (decision === "escalated") {
      await supabase
        .from("workflow_runs")
        .update({ governance_status: "escalated", status: "paused" })
        .eq("id", approval.workflowId);
      await incrementAgentMetric(approval.requestedBy, "escalated_actions");
    }
  }

  await recordActivity({
    actor,
    action: `${decision}: ${approval.title}`,
    entityType: "approval",
    entityId: approvalId,
  });

  await recordActivityFeed({
    actor,
    action: eventType,
    targetType: "approval",
    targetId: approvalId,
    description: approval.title,
  });

  const notifCategory = decision === "escalated" ? "ESCALATION" : "APPROVAL";
  const notifSeverity =
    decision === "escalated" || decision === "rejected" ? "HIGH" : "MEDIUM";

  await notifyFounder(
    `${decision.replace("_", " ")}: ${approval.title}`,
    comments || approval.description,
    notifCategory,
    { severity: notifSeverity, entityType: "approval", entityId: approvalId },
  );

  return approval;
}

export async function getGovernanceStats() {
  if (!isSupabaseConfigured()) {
    return {
      pendingApprovals: 0,
      approvedToday: 0,
      autoApprovedToday: 0,
      escalationsToday: 0,
      blockedWorkflows: 0,
      waitingForFounder: 0,
      waitingForRevision: 0,
      averageApprovalHours: 0,
      governanceHealth: 100,
    };
  }

  const supabase = createSupabaseAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [approvals, workflows] = await Promise.all([
    supabase.from("workflow_approvals").select("status, approval_mode, requested_at, approved_at"),
    supabase.from("workflow_runs").select("governance_status, status"),
  ]);

  const rows = approvals.data ?? [];
  const wfRows = workflows.data ?? [];

  const approvedToday = rows.filter(
    (r) => r.status === "approved" && r.approved_at && r.approved_at >= todayIso,
  ).length;
  const autoApprovedToday = rows.filter(
    (r) => r.status === "auto_approved" && r.approved_at && r.approved_at >= todayIso,
  ).length;
  const escalationsToday = rows.filter(
    (r) => (r.status === "escalated" || r.approval_mode === "escalated") && r.requested_at >= todayIso,
  ).length;

  const completedWithTime = rows.filter((r) => r.approved_at && r.requested_at);
  const avgMs =
    completedWithTime.length > 0
      ? completedWithTime.reduce((sum, r) => {
          return sum + (new Date(r.approved_at as string).getTime() - new Date(r.requested_at as string).getTime());
        }, 0) / completedWithTime.length
      : 0;

  const pending = rows.filter((r) => r.status === "pending").length;
  const escalated = rows.filter((r) => r.status === "escalated").length;
  const blocked = wfRows.filter((w) => w.status === "blocked" || w.governance_status !== "normal").length;

  const governanceHealth = Math.max(0, 100 - pending * 5 - escalated * 10 - blocked * 8);

  return {
    pendingApprovals: pending,
    approvedToday,
    autoApprovedToday,
    escalationsToday,
    blockedWorkflows: blocked,
    waitingForFounder: rows.filter((r) => r.status === "escalated").length,
    waitingForRevision: wfRows.filter((w) => w.governance_status === "waiting_for_revision").length,
    averageApprovalHours: Math.round((avgMs / 3_600_000) * 10) / 10,
    governanceHealth,
  };
}

export async function recordFounderOverride(
  action: string,
  entityType: string,
  entityId: string | null,
  reason: string,
  actor = "Founder",
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("founder_overrides").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    actor,
  });
  await recordCompanyTimeline({
    eventType: "founder_override",
    entityType,
    entityId,
    title: `Founder override: ${action}`,
    description: reason,
    actor,
    severity: "high",
  });
}
