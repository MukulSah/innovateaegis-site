import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { getProjectGovernance } from "./governance";
import { getProjects } from "./projects";
import { nullableUuid } from "./nullable-uuid";
import {
  buildSessionPayloadFromTemplate,
  getSessionTemplateBySlug,
  getTemplateStartStepIndex,
  provisionWorkflowStepsFromTemplate,
  resolveTemplateForObjective,
} from "./session-templates";
import { resolveOwnershipFromTemplate } from "./session-ownership";
import { getNextSessionNumber, updateSessionFields } from "./session-manager";
import { shouldAutoOrchestrate, startOrchestration } from "./orchestration";
import { recordActivityFeed } from "./activity-feed";
import type { SessionCreationMode } from "./session-types";

export type SpawnSessionInput = {
  projectId: string;
  objective: string;
  creationMode: SessionCreationMode;
  templateSlug?: string;
  sponsorUserId?: string | null;
  scheduledAt?: string | null;
  recurrenceRule?: string | null;
  triggerMetadata?: Record<string, unknown>;
  skipOrchestration?: boolean;
  /** "auto" or a specific model id from the company pool */
  aiModelSelection?: string;
};

export type SpawnSessionResult = {
  sessionId: string;
  sessionNumber: number;
  templateSlug: string;
  projectId: string;
};

async function resolveProjectId(explicit?: string | null): Promise<string> {
  if (explicit) return explicit;
  const projects = await getProjects();
  if (!projects.length) throw new Error("No project available — create a project first");
  return projects[0].id;
}

/**
 * Unified session factory — used by founder objectives, duties, and automation.
 */
export async function spawnSession(input: SpawnSessionInput): Promise<SpawnSessionResult> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

  const projectId = await resolveProjectId(input.projectId);
  const supabase = createSupabaseAdmin();

  const { data: projectRow } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
  const projectName = projectRow?.name ?? "Project";

  const template = input.templateSlug
    ? await getSessionTemplateBySlug(input.templateSlug)
    : await resolveTemplateForObjective(input.objective);

  if (!template) throw new Error(`Template not found: ${input.templateSlug ?? "auto"}`);

  const agents = await getAgents();
  const ownership = await resolveOwnershipFromTemplate(template, {
    sponsorUserId: nullableUuid(input.sponsorUserId),
    agents,
  });

  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo && input.creationMode !== "automation") {
    throw new Error("COO agent required for session execution");
  }

  const sessionNumber = await getNextSessionNumber(projectId);
  const startStepIndex = getTemplateStartStepIndex(template.stages);
  const { workflowMode } = await getProjectGovernance(projectId);

  const { getLaunchAiOptions, buildSessionAiBrief } = await import("./launch-ai-options");
  const launchAi = await getLaunchAiOptions();
  const aiSelection = input.aiModelSelection?.trim() || "auto";
  const sessionAiBrief = buildSessionAiBrief(launchAi, aiSelection);

  const isFutureScheduled =
    Boolean(input.scheduledAt) && new Date(input.scheduledAt!) > new Date();
  const isDeferredStart =
    isFutureScheduled || input.creationMode === "recurring" || input.creationMode === "triggered";

  const runPayload = buildSessionPayloadFromTemplate(
    template,
    {
      project_id: projectId,
      name: `Session #${sessionNumber}`,
      objective: input.objective,
      owner: "SAI",
      status: isDeferredStart ? "paused" : "running",
      workflow_mode: workflowMode,
      governance_status: "normal",
      current_step_index: startStepIndex,
      session_number: sessionNumber,
      executive_sponsor_agent_id: nullableUuid(ownership.executiveSponsorAgentId),
      session_owner_agent_id: ownership.sessionOwnerAgentId ?? coo?.id,
      sponsor_user_id: nullableUuid(ownership.sponsorUserId),
      approver_user_id: nullableUuid(ownership.approverUserId),
      current_stage: template.stages[startStepIndex]?.label ?? "Planning",
      session_status: isDeferredStart ? "planning" : "pending_coo",
      strategic_brief: {
        sessionTemplate: template.template.slug,
        sessionType: template.template.sessionType,
        creationMode: input.creationMode,
        ...sessionAiBrief,
      },
      scheduled_at: input.scheduledAt ?? null,
      recurrence_rule: input.recurrenceRule ?? null,
      trigger_metadata: input.triggerMetadata ?? {},
    },
    { creationMode: input.creationMode, sponsorUserId: nullableUuid(input.sponsorUserId) },
  );

  const { data: run, error } = await supabase
    .from("workflow_runs")
    .insert(runPayload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await provisionWorkflowStepsFromTemplate({
    workflowRunId: run.id,
    projectId,
    objectiveId: null,
    objectiveTitle: input.objective,
    template,
    agents,
  });

  if (!isDeferredStart) {
    await updateSessionFields(run.id, {
      sessionStatus: "planning",
      currentStage: template.stages[startStepIndex]?.label ?? "Execution",
    });

    if (!input.skipOrchestration && (await shouldAutoOrchestrate())) {
      await startOrchestration(run.id, projectId, input.objective, projectName, workflowMode);
      try {
        const { runCooAutonomousTick } = await import("./coo-approval-engine");
        await runCooAutonomousTick();
      } catch {
        // best-effort
      }
    }
  }

  await recordActivityFeed({
    actor: "Session Engine",
    action: "session_spawned",
    targetType: "workflow",
    targetId: run.id,
    description: `[${input.creationMode}] ${input.objective}`,
  });

  return {
    sessionId: run.id,
    sessionNumber,
    templateSlug: template.template.slug,
    projectId,
  };
}

export async function activateScheduledSessions(): Promise<SpawnSessionResult[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("workflow_runs")
    .select("id, project_id, objective, session_template_id, creation_mode, strategic_brief")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now)
    .eq("status", "paused");

  const activated: SpawnSessionResult[] = [];

  for (const row of due ?? []) {
    activated.push(
      await activateWorkflowRun({
        id: row.id as string,
        project_id: row.project_id as string,
        objective: row.objective as string,
        strategic_brief: row.strategic_brief,
      }),
    );
  }

  return activated;
}

const RECURRENCE_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

async function activateWorkflowRun(
  row: {
    id: string;
    project_id: string;
    objective: string;
    strategic_brief: unknown;
  },
): Promise<SpawnSessionResult> {
  const supabase = createSupabaseAdmin();
  const brief = (row.strategic_brief as Record<string, unknown>) ?? {};
  const templateSlug = String(brief.sessionTemplate ?? "founder_objective");

  await supabase
    .from("workflow_runs")
    .update({ status: "running", session_status: "planning" })
    .eq("id", row.id);

  const { data: projectRow } = await supabase
    .from("projects")
    .select("name")
    .eq("id", row.project_id)
    .maybeSingle();

  const { workflowMode } = await getProjectGovernance(row.project_id as string);
  if (await shouldAutoOrchestrate()) {
    await startOrchestration(
      row.id,
      row.project_id,
      row.objective,
      (projectRow?.name as string) ?? "Project",
      workflowMode,
    );
  }

  return {
    sessionId: row.id,
    sessionNumber: 0,
    templateSlug,
    projectId: row.project_id,
  };
}

/** Activate deferred recurring sessions waiting for first scheduler tick. */
export async function activateDeferredRecurringSessions(): Promise<SpawnSessionResult[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data: pending } = await supabase
    .from("workflow_runs")
    .select("id, project_id, objective, strategic_brief")
    .eq("status", "paused")
    .eq("creation_mode", "recurring")
    .is("scheduled_at", null);

  const activated: SpawnSessionResult[] = [];

  for (const row of pending ?? []) {
    const { data: orch } = await supabase
      .from("orchestration_runs")
      .select("id")
      .eq("workflow_id", row.id)
      .maybeSingle();

    if (orch) continue;

    activated.push(
      await activateWorkflowRun({
        id: row.id as string,
        project_id: row.project_id as string,
        objective: row.objective as string,
        strategic_brief: row.strategic_brief,
      }),
    );
  }

  return activated;
}

/** Spawn next instance after a completed recurring session's interval elapses. */
export async function spawnRecurringFollowUps(): Promise<SpawnSessionResult[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data: completed } = await supabase
    .from("workflow_runs")
    .select("id, project_id, objective, recurrence_rule, completed_at, strategic_brief")
    .eq("status", "completed")
    .not("recurrence_rule", "is", null)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50);

  const spawned: SpawnSessionResult[] = [];

  for (const row of completed ?? []) {
    const rule = String(row.recurrence_rule ?? "");
    const intervalMs = RECURRENCE_MS[rule];
    if (!intervalMs || !row.completed_at) continue;

    const elapsed = Date.now() - new Date(row.completed_at as string).getTime();
    if (elapsed < intervalMs) continue;

    const { count } = await supabase
      .from("workflow_runs")
      .select("id", { count: "exact", head: true })
      .eq("project_id", row.project_id)
      .eq("objective", row.objective)
      .gt("created_at", row.completed_at);

    if (count && count > 0) continue;

    const brief = (row.strategic_brief as Record<string, unknown>) ?? {};
    const templateSlug = String(brief.sessionTemplate ?? "");

    try {
      const result = await spawnSession({
        projectId: row.project_id as string,
        objective: row.objective as string,
        creationMode: "recurring",
        templateSlug: templateSlug || undefined,
        recurrenceRule: rule,
      });
      spawned.push(result);
    } catch {
      // skip failed spawns
    }
  }

  return spawned;
}

export async function processRecurringSessions(): Promise<SpawnSessionResult[]> {
  const deferred = await activateDeferredRecurringSessions();
  const followUps = await spawnRecurringFollowUps();
  return [...deferred, ...followUps];
}

/** Activate armed triggered sessions matching an event type. */
export async function activateTriggeredSessions(
  eventType: string,
): Promise<SpawnSessionResult[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data: armed } = await supabase
    .from("workflow_runs")
    .select("id, project_id, objective, strategic_brief, trigger_metadata")
    .eq("status", "paused")
    .eq("creation_mode", "triggered");

  const activated: SpawnSessionResult[] = [];

  for (const row of armed ?? []) {
    const meta = (row.trigger_metadata as Record<string, unknown>) ?? {};
    if (String(meta.eventType ?? "") !== eventType) continue;

    const { data: orch } = await supabase
      .from("orchestration_runs")
      .select("id")
      .eq("workflow_id", row.id)
      .maybeSingle();

    if (orch) continue;

    activated.push(
      await activateWorkflowRun({
        id: row.id as string,
        project_id: row.project_id as string,
        objective: row.objective as string,
        strategic_brief: row.strategic_brief,
      }),
    );

    await supabase
      .from("workflow_runs")
      .update({
        trigger_metadata: { ...meta, armed: false, activatedAt: new Date().toISOString() },
      })
      .eq("id", row.id);
  }

  return activated;
}
