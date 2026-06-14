import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { postExecutiveMessage, postSystemSessionMessage } from "./executive-session-chat";
import { getCompanyAISettings } from "./ai-settings";
import { resolveDefaultProviderConfig } from "./ai-provider-resolver";
import { getProviderLabel } from "./ai-provider-catalog";
import type { AIProviderName } from "./types";

/** Core artifacts that require full retry + fallback before template mode. */
export const QUALITY_GATE_STEPS = new Set([
  "ceo_strategy",
  "coo_execution",
  "requirements",
  "design",
  "tasks",
  "implementation",
  "validation",
  "deployment",
  "documentation",
  "knowledge",
]);

export const QUALITY_GATE_ARTIFACT_NAMES: Record<string, string> = {
  ceo_strategy: "ceo_strategy_v1",
  coo_execution: "coo_execution_plan_v1",
  requirements: "requirements_v1",
  design: "architecture_v1",
  tasks: "task_plan_v1",
  implementation: "implementation_plan_v1",
  validation: "qa_report_v1",
  deployment: "release_plan_v1",
  documentation: "session_final_report_v1",
  knowledge: "knowledge_archive_v1",
};

export type AIReliabilitySnapshot = {
  provider: string;
  providerLabel: string;
  successRate: number;
  retries: number;
  fallbackUsage: number;
  templateMode: number;
  totalExecutions: number;
  operationalAlert: boolean;
};

type EventRow = {
  success: boolean;
  used_fallback: boolean;
  used_template: boolean;
  attempt_count: number;
};

export function artifactNameForStep(stepKey: string): string {
  if (stepKey === "coo_execution") return "coo_execution_plan_v1";
  return QUALITY_GATE_ARTIFACT_NAMES[stepKey] ?? `${stepKey}_v1`;
}

export async function recordAIExecutionEvent(input: {
  workflowRunId?: string | null;
  projectId?: string | null;
  agentId: string;
  agentName: string;
  stepKey: string;
  workflowStage?: string | null;
  artifactRequested: string;
  provider: string;
  model: string;
  attemptCount: number;
  success: boolean;
  usedFallback: boolean;
  usedTemplate: boolean;
  timedOut: boolean;
  errorMessage?: string;
  failureReason?: string;
  promptLength?: number;
  estimatedInputTokens?: number;
  responseTimeMs?: number;
  timeoutMs?: number;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("ai_execution_events").insert({
    workflow_run_id: input.workflowRunId ?? null,
    project_id: input.projectId ?? null,
    agent_id: input.agentId,
    agent_name: input.agentName,
    step_key: input.stepKey,
    workflow_stage: input.workflowStage ?? input.stepKey,
    artifact_requested: input.artifactRequested,
    provider: input.provider,
    model: input.model,
    attempt_count: input.attemptCount,
    success: input.success,
    used_fallback: input.usedFallback,
    used_template: input.usedTemplate,
    timed_out: input.timedOut,
    error_message: input.errorMessage?.slice(0, 2000) ?? null,
    failure_reason: input.failureReason?.slice(0, 2000) ?? input.errorMessage?.slice(0, 2000) ?? null,
    prompt_length: input.promptLength ?? null,
    estimated_input_tokens: input.estimatedInputTokens ?? null,
    response_time_ms: input.responseTimeMs ?? null,
    timeout_ms: input.timeoutMs ?? null,
  });
}

function aggregateEvents(rows: EventRow[]): AIReliabilitySnapshot {
  const total = rows.length;
  const successes = rows.filter((r) => r.success && !r.used_template).length;
  const retries = rows.reduce((s, r) => s + Math.max(0, r.attempt_count - 1), 0);
  const fallbackUsage = rows.filter((r) => r.used_fallback).length;
  const templateMode = rows.filter((r) => r.used_template).length;
  const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;
  const templateRate = total > 0 ? templateMode / total : 0;

  const provider = rows[0] ? "tracked" : "none";

  return {
    provider,
    providerLabel: provider,
    successRate,
    retries,
    fallbackUsage,
    templateMode,
    totalExecutions: total,
    operationalAlert: templateRate > 0.05,
  };
}

export async function getSessionAIReliability(sessionId: string): Promise<AIReliabilitySnapshot> {
  const supabase = createSupabaseAdmin();
  const [settings, defaultProvider, { data: events }] = await Promise.all([
    getCompanyAISettings(),
    resolveDefaultProviderConfig(),
    supabase
      .from("ai_execution_events")
      .select("success, used_fallback, used_template, attempt_count")
      .eq("workflow_run_id", sessionId),
  ]);

  const providerName =
    defaultProvider?.providerName ??
    (settings.defaultProviderName as AIProviderName | undefined) ??
    "unconfigured";

  const base = aggregateEvents((events as EventRow[]) ?? []);
  return {
    ...base,
    provider: providerName,
    providerLabel: getProviderLabel(providerName as AIProviderName),
  };
}

export async function getGlobalAIReliability(): Promise<AIReliabilitySnapshot> {
  const supabase = createSupabaseAdmin();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [defaultProvider, { data: events }] = await Promise.all([
    resolveDefaultProviderConfig(),
    supabase
      .from("ai_execution_events")
      .select("success, used_fallback, used_template, attempt_count")
      .gte("created_at", dayStart.toISOString()),
  ]);

  const providerName = defaultProvider?.providerName ?? "unconfigured";
  const base = aggregateEvents((events as EventRow[]) ?? []);
  return {
    ...base,
    provider: providerName,
    providerLabel: getProviderLabel(providerName as AIProviderName),
  };
}

export async function recordTemplateFallback(input: {
  workflowRunId: string;
  projectId: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  stepKey: string;
  artifactRequested: string;
  provider: string;
  model: string;
  attemptCount: number;
  errors: string[];
  timedOut: boolean;
  output: string;
  promptLength?: number;
  estimatedInputTokens?: number;
  responseTimeMs?: number;
  timeoutMs?: number;
  failureReason?: string;
}): Promise<void> {
  const errorSummary = input.errors.join("\n");
  const failureReason = input.failureReason ?? errorSummary;

  await recordAIExecutionEvent({
    workflowRunId: input.workflowRunId,
    projectId: input.projectId,
    agentId: input.agentId,
    agentName: input.agentName,
    stepKey: input.stepKey,
    artifactRequested: input.artifactRequested,
    provider: input.provider,
    model: input.model,
    attemptCount: input.attemptCount,
    success: false,
    usedFallback: false,
    usedTemplate: true,
    timedOut: input.timedOut,
    errorMessage: errorSummary,
    failureReason,
    promptLength: input.promptLength,
    estimatedInputTokens: input.estimatedInputTokens,
    responseTimeMs: input.responseTimeMs,
    timeoutMs: input.timeoutMs,
  });

  const failureContent = `# AI Execution Failure

## Agent
${input.agentName}

## Provider
${input.provider}

## Model
${input.model}

## Attempt Count
${input.attemptCount}

## Prompt Length
${input.promptLength ?? "unknown"} chars

## Estimated Input Tokens
${input.estimatedInputTokens ?? "unknown"}

## Response Time
${input.responseTimeMs ?? "unknown"} ms

## Timeout
${input.timeoutMs ? `${input.timeoutMs} ms` : input.timedOut ? "Yes" : "No"}

## Failure Reason
${failureReason}

## Session
${input.workflowRunId}

## Workflow Stage
${input.stepKey}

## Artifact Requested
${input.artifactRequested}

## Fallback Used
No — template mode activated

## Timestamp
${new Date().toISOString()}
`;

  await recordExecutiveArtifact({
    workflowRunId: input.workflowRunId,
    projectId: input.projectId,
    agentId: input.agentId,
    stepKey: input.stepKey,
    artifactName: "ai_execution_failure_v1",
    content: failureContent,
    artifactType: "ai_failure",
  });

  const { createSessionArtifact } = await import("./session-artifacts");
  await createSessionArtifact({
    workflowRunId: input.workflowRunId,
    projectId: input.projectId,
    agentId: input.agentId,
    stepKey: input.stepKey,
    inputSummary: `AI retries exhausted (${input.attemptCount} attempts)`,
    outputSummary: input.output.slice(0, 3000),
    artifactName: "agent_template_fallback_v1",
    artifactType: "template_fallback",
  });

  await postSystemSessionMessage(input.workflowRunId, "AI provider unavailable. Switching to template mode.", {
    projectId: input.projectId,
    stepKey: input.stepKey,
    artifactName: "agent_template_fallback_v1",
  });

  await runCooAiReliabilityReview(input);
  await runCeoAiReliabilityEscalation(input.workflowRunId, input.projectId);
}

async function runCooAiReliabilityReview(input: {
  workflowRunId: string;
  projectId: string;
  agentName: string;
  stepKey: string;
  attemptCount: number;
  errors: string[];
}): Promise<void> {
  const agents = await getAgents();
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo) return;

  const content = `# COO AI Reliability Review

## Reason
Execution quality reduced — template mode activated for ${input.agentName} (${input.stepKey}).

## Attempts
${input.attemptCount}

## Errors
${input.errors.join("\n")}

## Recommendation
Investigate provider reliability and fallback configuration.
`;

  await recordExecutiveArtifact({
    workflowRunId: input.workflowRunId,
    projectId: input.projectId,
    agentId: coo.id,
    stepKey: "ai_reliability",
    artifactName: "coo_ai_reliability_review_v1",
    content,
    artifactType: "executive_review",
  });

  await postExecutiveMessage(
    coo,
    input.workflowRunId,
    "AI reliability review: template mode used. Execution quality reduced.",
    { projectId: input.projectId, stepKey: "ai_reliability", artifactName: "coo_ai_reliability_review_v1" },
  );
}

async function runCeoAiReliabilityEscalation(
  workflowRunId: string,
  projectId: string,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [{ count: sessionCount }, { count: dayCount }] = await Promise.all([
    supabase
      .from("ai_execution_events")
      .select("*", { count: "exact", head: true })
      .eq("workflow_run_id", workflowRunId)
      .eq("used_template", true),
    supabase
      .from("ai_execution_events")
      .select("*", { count: "exact", head: true })
      .eq("used_template", true)
      .gte("created_at", dayStart.toISOString()),
  ]);

  const sessionTemplates = sessionCount ?? 0;
  const dayTemplates = dayCount ?? 0;

  if (sessionTemplates <= 3 && dayTemplates <= 10) return;

  const severity =
    dayTemplates > 20 || sessionTemplates > 6
      ? "Critical"
      : dayTemplates > 10 || sessionTemplates > 3
        ? "High"
        : "Medium";

  const agents = await getAgents();
  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  if (!ceo) return;

  const content = `# CEO AI Reliability Escalation

## Severity
${severity}

## Session Template Events
${sessionTemplates}

## Daily Template Events
${dayTemplates}

## Assessment
AI provider reliability is below operational threshold. Template mode usage exceeds acceptable limits.

## Recommendation
Review primary and fallback AI provider configuration immediately.
`;

  await recordExecutiveArtifact({
    workflowRunId,
    projectId,
    agentId: ceo.id,
    stepKey: "ai_reliability",
    artifactName: "ceo_ai_reliability_escalation_v1",
    content,
    artifactType: "executive_review",
  });

  await postExecutiveMessage(
    ceo,
    workflowRunId,
    `AI reliability escalation (${severity}): ${sessionTemplates} template events this session, ${dayTemplates} today.`,
    { projectId, stepKey: "ai_reliability", artifactName: "ceo_ai_reliability_escalation_v1" },
  );
}
