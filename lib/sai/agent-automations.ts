import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { computeNextCronRun, presetToCron } from "./cron-scheduler";

export type AutomationKind = "bugbot" | "security" | "approval" | "custom";
export type AutomationStatus = "active" | "paused" | "draft";

export type AutomationTrigger =
  | { type: "cron"; cron: string; preset?: string; timezone?: string }
  | { type: "git"; event: "pr_opened" | "pr_pushed" | "pr_merged"; repos: string[] }
  | { type: "webhook" };

export type AutomationTool =
  | { type: "internal"; key: string }
  | { type: "mcp"; serverName: string };

export type RepositoryScope = {
  provider?: "github" | "gitlab";
  accountId?: string;
  repos?: string[];
};

export type BugbotPreferences = {
  triggerMode?: "every_push" | "manual";
  reviewDraftPrs?: boolean;
  prSummaries?: boolean;
  autofixMode?: "off" | "on";
  autofixSeverityThreshold?: string[];
  incrementalReview?: boolean;
};

export type AgentAutomation = {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  automationKind: AutomationKind;
  instructions: string;
  modelSelection: string;
  memoryEnabled: boolean;
  triggers: AutomationTrigger[];
  tools: AutomationTool[];
  repositoryScope: RepositoryScope;
  preferences: BugbotPreferences & Record<string, unknown>;
  templateSlug: string;
  projectId: string | null;
  authorUserId: string | null;
  timezone: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentAutomationRun = {
  id: string;
  automationId: string;
  sessionId: string | null;
  triggerType: string;
  status: "success" | "skipped" | "failed";
  message: string;
  metrics: Record<string, unknown>;
  triggeredAt: string;
};

type AutomationRow = {
  id: string;
  name: string;
  description: string;
  status: string;
  automation_kind: string;
  instructions: string;
  model_selection: string;
  memory_enabled: boolean;
  triggers: AutomationTrigger[];
  tools: AutomationTool[];
  repository_scope: RepositoryScope;
  preferences: Record<string, unknown>;
  template_slug: string;
  project_id: string | null;
  author_user_id: string | null;
  timezone: string;
  next_run_at: string | null;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
};

type RunRow = {
  id: string;
  automation_id: string;
  session_id: string | null;
  trigger_type: string;
  status: string;
  message: string;
  metrics: Record<string, unknown>;
  triggered_at: string;
};

function mapAutomation(row: AutomationRow): AgentAutomation {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as AutomationStatus,
    automationKind: row.automation_kind as AutomationKind,
    instructions: row.instructions,
    modelSelection: row.model_selection,
    memoryEnabled: row.memory_enabled,
    triggers: row.triggers ?? [],
    tools: row.tools ?? [],
    repositoryScope: row.repository_scope ?? {},
    preferences: row.preferences ?? {},
    templateSlug: row.template_slug,
    projectId: row.project_id,
    authorUserId: row.author_user_id,
    timezone: row.timezone,
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    runCount: row.run_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: RunRow): AgentAutomationRun {
  return {
    id: row.id,
    automationId: row.automation_id,
    sessionId: row.session_id,
    triggerType: row.trigger_type,
    status: row.status as AgentAutomationRun["status"],
    message: row.message,
    metrics: row.metrics ?? {},
    triggeredAt: row.triggered_at,
  };
}

export function getCronTrigger(automation: AgentAutomation): AutomationTrigger | null {
  return automation.triggers.find((t) => t.type === "cron") ?? null;
}

export function computeAutomationNextRun(automation: AgentAutomation): string | null {
  const cronTrigger = getCronTrigger(automation);
  if (!cronTrigger || cronTrigger.type !== "cron") return null;
  const cron = cronTrigger.preset ? presetToCron(cronTrigger.preset) : cronTrigger.cron;
  return computeNextCronRun(cron);
}

export async function getAgentAutomations(): Promise<AgentAutomation[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_automations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as AutomationRow[]).map(mapAutomation);
}

export async function getAgentAutomationById(id: string): Promise<AgentAutomation | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapAutomation(data as AutomationRow);
}

export async function getActiveAgentAutomations(): Promise<AgentAutomation[]> {
  const all = await getAgentAutomations();
  return all.filter((a) => a.status === "active");
}

export type CreateAgentAutomationInput = {
  name: string;
  description?: string;
  status?: AutomationStatus;
  automationKind?: AutomationKind;
  instructions?: string;
  modelSelection?: string;
  memoryEnabled?: boolean;
  triggers?: AutomationTrigger[];
  tools?: AutomationTool[];
  repositoryScope?: RepositoryScope;
  preferences?: Record<string, unknown>;
  templateSlug?: string;
  projectId?: string | null;
  authorUserId?: string | null;
  timezone?: string;
};

export async function createAgentAutomation(
  input: CreateAgentAutomationInput,
): Promise<AgentAutomation> {
  const supabase = createSupabaseAdmin();
  const triggers = input.triggers ?? [];

  const nextRunAt =
    (input.status ?? "draft") === "active" && triggers.some((t) => t.type === "cron")
      ? computeAutomationNextRun({
          triggers,
          status: "active",
        } as AgentAutomation)
      : null;

  const { data, error } = await supabase
    .from("agent_automations")
    .insert({
      name: input.name,
      description: input.description ?? "",
      status: input.status ?? "draft",
      automation_kind: input.automationKind ?? "custom",
      instructions: input.instructions ?? "",
      model_selection: input.modelSelection ?? "auto",
      memory_enabled: input.memoryEnabled ?? true,
      triggers,
      tools: input.tools ?? [],
      repository_scope: input.repositoryScope ?? {},
      preferences: input.preferences ?? {},
      template_slug: input.templateSlug ?? "bugbot_review",
      project_id: input.projectId ?? null,
      author_user_id: input.authorUserId ?? null,
      timezone: input.timezone ?? "UTC",
      next_run_at: nextRunAt,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapAutomation(data as AutomationRow);
}

export async function updateAgentAutomation(
  id: string,
  patch: Partial<CreateAgentAutomationInput & { status: AutomationStatus }>,
): Promise<AgentAutomation> {
  const existing = await getAgentAutomationById(id);
  if (!existing) throw new Error("Automation not found");

  const merged: AgentAutomation = {
    ...existing,
    ...patch,
    triggers: patch.triggers ?? existing.triggers,
    status: patch.status ?? existing.status,
  };

  const nextRunAt =
    merged.status === "active" && merged.triggers.some((t) => t.type === "cron")
      ? computeAutomationNextRun(merged)
      : null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_automations")
    .update({
      name: patch.name ?? existing.name,
      description: patch.description ?? existing.description,
      status: merged.status,
      automation_kind: patch.automationKind ?? existing.automationKind,
      instructions: patch.instructions ?? existing.instructions,
      model_selection: patch.modelSelection ?? existing.modelSelection,
      memory_enabled: patch.memoryEnabled ?? existing.memoryEnabled,
      triggers: merged.triggers,
      tools: patch.tools ?? existing.tools,
      repository_scope: patch.repositoryScope ?? existing.repositoryScope,
      preferences: patch.preferences ?? existing.preferences,
      template_slug: patch.templateSlug ?? existing.templateSlug,
      project_id: patch.projectId !== undefined ? patch.projectId : existing.projectId,
      timezone: patch.timezone ?? existing.timezone,
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapAutomation(data as AutomationRow);
}

export async function deleteAgentAutomation(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("agent_automations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getAutomationRuns(
  automationId: string,
  limit = 50,
): Promise<AgentAutomationRun[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_automation_runs")
    .select("*")
    .eq("automation_id", automationId)
    .order("triggered_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as RunRow[]).map(mapRun);
}

export async function getAutomationRunStats(days = 7): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  if (!isSupabaseConfigured()) return { total: 0, successful: 0, failed: 0 };

  const since = new Date();
  since.setDate(since.getDate() - days);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_automation_runs")
    .select("status")
    .gte("triggered_at", since.toISOString());

  if (error) return { total: 0, successful: 0, failed: 0 };

  const rows = data ?? [];
  return {
    total: rows.length,
    successful: rows.filter((r) => r.status === "success").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
}

export async function logAutomationRun(
  automationId: string,
  sessionId: string | null,
  triggerType: string,
  status: AgentAutomationRun["status"],
  message: string,
  metrics: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("agent_automation_runs").insert({
    automation_id: automationId,
    session_id: sessionId,
    trigger_type: triggerType,
    status,
    message,
    metrics,
  });
}

export const AUTOMATION_TEMPLATES = [
  {
    id: "bugbot",
    kind: "bugbot" as const,
    name: "Find bugs",
    description: "Automatically review pull requests for bugs and issues.",
    templateSlug: "bugbot_review",
    triggers: [{ type: "git" as const, event: "pr_pushed" as const, repos: [] }],
    instructions:
      "Review the PR diff for bugs, logic errors, and regressions. Post a concise summary and detailed findings table.",
    tools: [
      { type: "internal" as const, key: "repository" },
      { type: "internal" as const, key: "brain_read" },
    ],
    preferences: {
      triggerMode: "every_push",
      reviewDraftPrs: false,
      prSummaries: true,
      incrementalReview: false,
    },
    category: "code_review",
  },
  {
    id: "security",
    kind: "security" as const,
    name: "Scan codebase for vulnerabilities",
    description:
      "Review the full repository on a schedule and alert on validated high-impact security issues.",
    templateSlug: "security_scan",
    triggers: [{ type: "cron" as const, cron: "0 9 * * *", preset: "daily", timezone: "UTC" }],
    instructions:
      "Scan the connected repository for security vulnerabilities. Report validated high-impact issues with remediation steps.",
    tools: [
      { type: "internal" as const, key: "repository" },
      { type: "internal" as const, key: "brain_read" },
    ],
    preferences: {},
    category: "security",
  },
  {
    id: "approval",
    kind: "approval" as const,
    name: "Approval triage",
    description: "Triage governance approvals and PR review readiness on a schedule.",
    templateSlug: "approval_triage",
    triggers: [{ type: "cron" as const, cron: "0 * * * *", preset: "hourly", timezone: "UTC" }],
    instructions:
      "Process pending governance approvals where COO can auto-approve. Review open PRs and request reviewers where needed.",
    tools: [
      { type: "internal" as const, key: "approvals" },
      { type: "internal" as const, key: "repository" },
    ],
    preferences: {},
    category: "code_review",
  },
] as const;
