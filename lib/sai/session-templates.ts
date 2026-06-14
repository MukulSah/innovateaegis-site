import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { getEmployees } from "./employees";
import { recommendAssignment } from "./task-assignment";
import { assignAgentsToTask } from "./task-assignments";
import { createTask } from "./tasks";
import { SDLC_WORKFLOW, SESSION_START_STEP_INDEX } from "./sdlc";
import {
  inferTemplateSlugFromObjective,
  type SessionCreationMode,
  type SessionTypeV2,
} from "./session-types";
import type { Agent } from "./types";

export type SessionTemplateOwnershipDefaults = {
  sponsorRole?: string;
  ownerRole?: string;
  sponsorAgentRole?: string;
  executorRole?: string;
  approverRole?: string;
};

export type SessionTemplate = {
  id: string;
  slug: string;
  label: string;
  description: string;
  sessionType: SessionTypeV2;
  version: number;
  isSystem: boolean;
  isActive: boolean;
  defaultPriority: "low" | "medium" | "high" | "critical";
  ownershipDefaults: SessionTemplateOwnershipDefaults;
  metadata: Record<string, unknown>;
};

export type SessionTemplateStage = {
  id: string;
  templateId: string;
  stageKey: string;
  label: string;
  stageOrder: number;
  agentRole: string;
  sdlcStepKey: string | null;
  required: boolean;
  governanceApproval: string | null;
  deliverableType: string | null;
  metadata: Record<string, unknown>;
};

export type ResolvedSessionTemplate = {
  template: SessionTemplate;
  stages: SessionTemplateStage[];
};

type TemplateRow = {
  id: string;
  slug: string;
  label: string;
  description: string;
  session_type: string;
  version: number;
  is_system: boolean;
  is_active: boolean;
  default_priority: string;
  ownership_defaults: SessionTemplateOwnershipDefaults;
  metadata: Record<string, unknown>;
};

type StageRow = {
  id: string;
  template_id: string;
  stage_key: string;
  label: string;
  stage_order: number;
  agent_role: string;
  sdlc_step_key: string | null;
  required: boolean;
  governance_approval: string | null;
  deliverable_type: string | null;
  metadata: Record<string, unknown>;
};

function mapTemplate(row: TemplateRow): SessionTemplate {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    sessionType: row.session_type as SessionTypeV2,
    version: row.version,
    isSystem: row.is_system,
    isActive: row.is_active,
    defaultPriority: row.default_priority as SessionTemplate["defaultPriority"],
    ownershipDefaults: row.ownership_defaults ?? {},
    metadata: row.metadata ?? {},
  };
}

function mapStage(row: StageRow): SessionTemplateStage {
  return {
    id: row.id,
    templateId: row.template_id,
    stageKey: row.stage_key,
    label: row.label,
    stageOrder: row.stage_order,
    agentRole: row.agent_role,
    sdlcStepKey: row.sdlc_step_key,
    required: row.required,
    governanceApproval: row.governance_approval,
    deliverableType: row.deliverable_type,
    metadata: row.metadata ?? {},
  };
}

/** In-memory fallback when DB is unavailable or migration not applied. */
export const FALLBACK_TEMPLATES: ResolvedSessionTemplate[] = [
  {
    template: {
      id: "fallback-founder-objective",
      slug: "founder_objective",
      label: "Founder Objective",
      description: "Strategic directive from the founder.",
      sessionType: "founder_objective",
      version: 1,
      isSystem: true,
      isActive: true,
      defaultPriority: "high",
      ownershipDefaults: { sponsorRole: "Founder", ownerRole: "COO", sponsorAgentRole: "CEO", approverRole: "Founder" },
      metadata: {},
    },
    stages: [
      { id: "s1", templateId: "fallback-founder-objective", stageKey: "ceo_review", label: "CEO Review", stageOrder: 1, agentRole: "CEO", sdlcStepKey: "ceo_strategy", required: true, governanceApproval: null, deliverableType: "strategic_brief", metadata: {} },
      { id: "s2", templateId: "fallback-founder-objective", stageKey: "coo_planning", label: "COO Planning", stageOrder: 2, agentRole: "COO", sdlcStepKey: "coo_execution", required: true, governanceApproval: null, deliverableType: "execution_plan", metadata: {} },
      { id: "s3", templateId: "fallback-founder-objective", stageKey: "requirements", label: "Product Requirements", stageOrder: 3, agentRole: "Product Manager", sdlcStepKey: "requirements", required: true, governanceApproval: "requirements", deliverableType: "prd", metadata: {} },
      { id: "s4", templateId: "fallback-founder-objective", stageKey: "architecture", label: "Architecture", stageOrder: 4, agentRole: "Architect", sdlcStepKey: "design", required: true, governanceApproval: "architecture", deliverableType: "architecture", metadata: {} },
      { id: "s5", templateId: "fallback-founder-objective", stageKey: "planning", label: "Project Planning", stageOrder: 5, agentRole: "Project Manager", sdlcStepKey: "tasks", required: true, governanceApproval: "task_plan", deliverableType: "task_breakdown", metadata: {} },
      { id: "s6", templateId: "fallback-founder-objective", stageKey: "development", label: "Development", stageOrder: 6, agentRole: "Engineer", sdlcStepKey: "implementation", required: true, governanceApproval: null, deliverableType: "implementation", metadata: {} },
      { id: "s7", templateId: "fallback-founder-objective", stageKey: "qa", label: "QA", stageOrder: 7, agentRole: "QA", sdlcStepKey: "validation", required: true, governanceApproval: null, deliverableType: "test_plan", metadata: {} },
      { id: "s8", templateId: "fallback-founder-objective", stageKey: "deployment", label: "Deployment", stageOrder: 8, agentRole: "DevOps", sdlcStepKey: "deployment", required: true, governanceApproval: "release", deliverableType: "deployment", metadata: {} },
      { id: "s9", templateId: "fallback-founder-objective", stageKey: "documentation", label: "Documentation", stageOrder: 9, agentRole: "Documentation", sdlcStepKey: "documentation", required: true, governanceApproval: null, deliverableType: "documentation", metadata: {} },
      { id: "s10", templateId: "fallback-founder-objective", stageKey: "knowledge_capture", label: "Knowledge Capture", stageOrder: 10, agentRole: "Documentation", sdlcStepKey: "knowledge", required: true, governanceApproval: null, deliverableType: "knowledge", metadata: {} },
    ],
  },
  {
    template: {
      id: "fallback-bug-fix",
      slug: "bug_fix",
      label: "Bug Fix",
      description: "Defect remediation with root cause analysis.",
      sessionType: "bug_fix",
      version: 1,
      isSystem: true,
      isActive: true,
      defaultPriority: "high",
      ownershipDefaults: { ownerRole: "COO", executorRole: "Engineer", approverRole: "Founder" },
      metadata: {},
    },
    stages: [
      { id: "b1", templateId: "fallback-bug-fix", stageKey: "incident_analysis", label: "Incident Analysis", stageOrder: 1, agentRole: "Engineer", sdlcStepKey: "requirements", required: true, governanceApproval: null, deliverableType: "incident_report", metadata: {} },
      { id: "b2", templateId: "fallback-bug-fix", stageKey: "root_cause", label: "Root Cause", stageOrder: 2, agentRole: "Engineer", sdlcStepKey: "design", required: true, governanceApproval: null, deliverableType: "root_cause_analysis", metadata: {} },
      { id: "b3", templateId: "fallback-bug-fix", stageKey: "fix", label: "Fix", stageOrder: 3, agentRole: "Engineer", sdlcStepKey: "implementation", required: true, governanceApproval: null, deliverableType: "fix", metadata: {} },
      { id: "b4", templateId: "fallback-bug-fix", stageKey: "validation", label: "Validation", stageOrder: 4, agentRole: "QA", sdlcStepKey: "validation", required: true, governanceApproval: null, deliverableType: "test_plan", metadata: {} },
      { id: "b5", templateId: "fallback-bug-fix", stageKey: "deployment", label: "Deployment", stageOrder: 5, agentRole: "DevOps", sdlcStepKey: "deployment", required: true, governanceApproval: "release", deliverableType: "deployment", metadata: {} },
      { id: "b6", templateId: "fallback-bug-fix", stageKey: "lessons_learned", label: "Lessons Learned", stageOrder: 6, agentRole: "Documentation", sdlcStepKey: "knowledge", required: true, governanceApproval: null, deliverableType: "knowledge", metadata: {} },
    ],
  },
];

function fallbackBySlug(slug: string): ResolvedSessionTemplate | null {
  return FALLBACK_TEMPLATES.find((t) => t.template.slug === slug) ?? FALLBACK_TEMPLATES[0];
}

export async function getSessionTemplates(): Promise<SessionTemplate[]> {
  if (!isSupabaseConfigured()) return FALLBACK_TEMPLATES.map((t) => t.template);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_templates")
    .select("*")
    .eq("is_active", true)
    .order("label");

  if (error || !data?.length) return FALLBACK_TEMPLATES.map((t) => t.template);
  return (data as TemplateRow[]).map(mapTemplate);
}

export async function getSessionTemplateBySlug(slug: string): Promise<ResolvedSessionTemplate | null> {
  if (!isSupabaseConfigured()) return fallbackBySlug(slug);

  const supabase = createSupabaseAdmin();
  const { data: templateRow, error } = await supabase
    .from("session_templates")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !templateRow) return fallbackBySlug(slug);

  const { data: stageRows, error: stageError } = await supabase
    .from("session_template_stages")
    .select("*")
    .eq("template_id", templateRow.id)
    .order("stage_order");

  if (stageError || !stageRows?.length) {
    const fallback = fallbackBySlug(slug);
    if (fallback) {
      return { template: mapTemplate(templateRow as TemplateRow), stages: fallback.stages };
    }
    return null;
  }

  return {
    template: mapTemplate(templateRow as TemplateRow),
    stages: (stageRows as StageRow[]).map(mapStage),
  };
}

export async function resolveTemplateForObjective(objective: string): Promise<ResolvedSessionTemplate> {
  const slug = inferTemplateSlugFromObjective(objective);
  const resolved = await getSessionTemplateBySlug(slug);
  return resolved ?? FALLBACK_TEMPLATES[0];
}

/** First executable SDLC step index for a template (requirements equivalent). */
export function getTemplateStartStepIndex(stages: SessionTemplateStage[]): number {
  const requirementsIdx = stages.findIndex((s) => s.sdlcStepKey === "requirements");
  if (requirementsIdx >= 0) return requirementsIdx;
  const firstExec = stages.findIndex((s) => s.sdlcStepKey && !["ceo_strategy", "coo_execution"].includes(s.sdlcStepKey));
  return firstExec >= 0 ? firstExec : 0;
}

function roleMatchPatterns(role: string): string[] {
  const map: Record<string, string[]> = {
    CEO: ["CEO", "Chief Executive"],
    COO: ["COO", "Chief Operating"],
    "Product Manager": ["Product Management", "Product Manager"],
    Architect: ["Architecture", "Architect", "Solution Architect"],
    "Project Manager": ["Project Management", "Project Manager"],
    Engineer: ["Engineering", "Software Engineer"],
    QA: ["Quality Assurance", "QA"],
    DevOps: ["DevOps"],
    Documentation: ["Documentation", "Knowledge"],
    Founder: ["CEO", "Chief Executive"],
  };
  return map[role] ?? [role];
}

function resolveSdlcStep(sdlcStepKey: string | null) {
  if (!sdlcStepKey) return null;
  return SDLC_WORKFLOW.find((s) => s.key === sdlcStepKey) ?? null;
}

export type ProvisionStepsInput = {
  workflowRunId: string;
  projectId: string;
  objectiveId?: string | null;
  objectiveTitle: string;
  template: ResolvedSessionTemplate;
  agents?: Agent[];
};

/**
 * Provision workflow_run_steps, tasks, and deliverables from a session template.
 * Maps template stages to SDLC step definitions where sdlc_step_key is set.
 */
export async function provisionWorkflowStepsFromTemplate(input: ProvisionStepsInput): Promise<number> {
  const supabase = createSupabaseAdmin();
  const agents = input.agents ?? (await getAgents());
  const employees = await getEmployees();
  const { stages } = input.template;
  const startIndex = getTemplateStartStepIndex(stages);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const sdlc = resolveSdlcStep(stage.sdlcStepKey);
    const stepKey = stage.sdlcStepKey ?? stage.stageKey;
    const roleAgent = findAgentForRole(agents, roleMatchPatterns(stage.agentRole));
    const recommendation = sdlc
      ? recommendAssignment(
          {
            title: sdlc.taskTitle,
            description: sdlc.taskDescription,
            workflowStepKey: stepKey,
            projectId: input.projectId,
          },
          agents,
          employees,
        )
      : { agentId: roleAgent?.id ?? null, employeeId: null, reason: `Assigned by template: ${stage.agentRole}` };
    const assignedAgentId = roleAgent?.id ?? recommendation.agentId;
    const isPreDone = sdlc?.skipOnSessionActivate || sdlc?.passiveOnly || false;
    const isFirstActive = i === startIndex;

    await supabase.from("workflow_run_steps").insert({
      workflow_run_id: input.workflowRunId,
      step_key: stepKey,
      step_label: stage.label,
      step_order: stage.stageOrder,
      assigned_agent_id: assignedAgentId,
      status: isPreDone ? "completed" : isFirstActive ? "in_progress" : "pending",
      started_at: isPreDone || isFirstActive ? new Date().toISOString() : null,
      completed_at: isPreDone ? new Date().toISOString() : null,
    });

    if (!isPreDone && sdlc) {
      const task = await createTask({
        projectId: input.projectId,
        title: sdlc.taskTitle,
        description: `${sdlc.taskDescription}\n\nObjective: ${input.objectiveTitle}`,
        priority: i < startIndex + 3 ? "high" : "medium",
        dependencies: [],
        acceptanceCriteria: [`Complete ${stage.label}`],
        objectiveId: input.objectiveId ?? undefined,
        assignedAgentId,
        assignedEmployeeId: recommendation.employeeId,
        status: sdlc.taskStatus,
        evidence: "",
        comments: [recommendation.reason],
        approvalStatus: stage.governanceApproval || sdlc.governanceApproval || sdlc.approvalType ? "pending" : "none",
        workflowRunId: input.workflowRunId,
        workflowStepKey: stepKey,
      });

      await supabase.from("project_deliverables").insert({
        project_id: input.projectId,
        workflow_run_id: input.workflowRunId,
        workflow_step_key: stepKey,
        deliverable_type: stage.deliverableType ?? sdlc.deliverableType,
        title: sdlc.deliverableTitle,
        content: `Pending: ${sdlc.taskDescription}`,
      });

      await assignAgentsToTask(task.id, stepKey, agents);
    }
  }

  return startIndex;
}

export function buildSessionPayloadFromTemplate(
  resolved: ResolvedSessionTemplate,
  base: Record<string, unknown>,
  options?: { creationMode?: SessionCreationMode; sponsorUserId?: string | null },
): Record<string, unknown> {
  return {
    ...base,
    session_type: resolved.template.sessionType,
    session_template_id: resolved.template.id.startsWith("fallback-") ? null : resolved.template.id,
    creation_mode: options?.creationMode ?? "instant",
    sponsor_user_id: options?.sponsorUserId ?? null,
    approver_user_id: options?.sponsorUserId ?? null,
  };
}

/** @deprecated Use getTemplateStartStepIndex — kept for founder-objectives compat */
export function templateSessionStartStepIndex(stages: SessionTemplateStage[]): number {
  const idx = getTemplateStartStepIndex(stages);
  return idx > 0 ? idx : SESSION_START_STEP_INDEX;
}
