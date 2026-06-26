import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { recordActivityFeed } from "./activity-feed";
import { postSystemSessionMessage } from "./executive-session-chat";
import { getCompanyAISettings } from "./ai-settings";
import type { AgentExecutionContext } from "./agent-executor";
import type { AgentModelConfig } from "./ai-retry-engine";

export const QUEUE_RETRY_DELAYS_MINUTES = [1, 3, 5, 10] as const;

export type QueueStatus = "idle" | "queued" | "waiting" | "processing" | "template_fallback";

export type AIQueueEntry = {
  id: string;
  workflowRunId: string;
  projectId: string;
  agentId: string;
  runtimeSessionId: string | null;
  stepKey: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  nextAttemptAt: string;
  lastError: string | null;
  provider: string | null;
  model: string | null;
};

type QueueRow = {
  id: string;
  workflow_run_id: string;
  project_id: string;
  agent_id: string;
  runtime_session_id: string | null;
  step_key: string;
  execution_payload: Record<string, unknown>;
  status: string;
  retry_count: number;
  max_retries: number;
  next_attempt_at: string;
  last_error: string | null;
  provider: string | null;
  model: string | null;
};

function mapRow(row: QueueRow): AIQueueEntry {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    projectId: row.project_id,
    agentId: row.agent_id,
    runtimeSessionId: row.runtime_session_id,
    stepKey: row.step_key,
    status: row.status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    provider: row.provider,
    model: row.model,
  };
}

export async function isFreeExecutionMode(): Promise<boolean> {
  const settings = await getCompanyAISettings();
  return (settings.executionMode ?? "free") === "free";
}

export function getNextQueueDelayMinutes(retryCount: number): number | null {
  if (retryCount >= QUEUE_RETRY_DELAYS_MINUTES.length) return null;
  return QUEUE_RETRY_DELAYS_MINUTES[retryCount];
}

export function formatQueueStatusMessage(entry: AIQueueEntry): string {
  const waitMs = new Date(entry.nextAttemptAt).getTime() - Date.now();
  const waitMin = Math.max(1, Math.ceil(waitMs / 60_000));
  return `Execution delayed due to provider throttling. Waiting for retry queue (${waitMin}-minute wait, attempt ${entry.retryCount + 1}/${entry.maxRetries}).`;
}

export async function enqueueAIRecovery(input: {
  ctx: AgentExecutionContext;
  agentId: string;
  runtimeSessionId: string;
  modelConfig: AgentModelConfig | null;
  errors: string[];
}): Promise<AIQueueEntry> {
  const supabase = createSupabaseAdmin();
  const delayMin = QUEUE_RETRY_DELAYS_MINUTES[0];
  const nextAttempt = new Date(Date.now() + delayMin * 60_000).toISOString();

  const { data, error } = await supabase
    .from("ai_retry_queue")
    .insert({
      workflow_run_id: input.ctx.workflowId,
      project_id: input.ctx.projectId,
      agent_id: input.agentId,
      runtime_session_id: input.runtimeSessionId,
      step_key: input.ctx.stepKey,
      execution_payload: {
        objective: input.ctx.objective,
        projectName: input.ctx.projectName,
        taskId: input.ctx.taskId,
        objectiveId: input.ctx.objectiveId,
        errors: input.errors.slice(0, 5),
      },
      status: "waiting",
      retry_count: 0,
      max_retries: QUEUE_RETRY_DELAYS_MINUTES.length,
      next_attempt_at: nextAttempt,
      last_error: input.errors[input.errors.length - 1] ?? "Provider timeout",
      provider: input.modelConfig?.providerName ?? null,
      model: input.modelConfig?.model ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  if (input.ctx.workflowId) {
    await supabase
      .from("orchestration_runs")
      .update({ status: "WAITING" })
      .eq("workflow_id", input.ctx.workflowId);

    await supabase
      .from("workflow_runs")
      .update({ session_status: "waiting_for_ai_capacity" })
      .eq("id", input.ctx.workflowId);

    await postSystemSessionMessage(
      input.ctx.workflowId,
      formatQueueStatusMessage(mapRow(data as QueueRow)),
      {
        projectId: input.ctx.projectId,
        stepKey: input.ctx.stepKey,
      },
    );
  }

  await recordActivityFeed({
    actor: "AI Recovery Queue",
    action: "ai_queue_enqueued",
    targetType: "workflow",
    targetId: input.ctx.workflowId ?? input.runtimeSessionId,
    description: `Step ${input.ctx.stepKey} queued — retry in ${delayMin} minutes`,
  });

  await recordProviderHealthMetric({
    provider: input.modelConfig?.providerName ?? "unknown",
    model: input.modelConfig?.model ?? null,
    queueIncrement: 1,
    failureIncrement: 1,
  });

  return mapRow(data as QueueRow);
}

export async function getActiveQueueForSession(workflowRunId: string): Promise<AIQueueEntry | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ai_retry_queue")
    .select("*")
    .eq("workflow_run_id", workflowRunId)
    .in("status", ["queued", "waiting", "processing", "template_fallback"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapRow(data as QueueRow) : null;
}

export async function getGlobalQueueStatus(): Promise<{
  active: boolean;
  waitingCount: number;
  nextAttemptAt: string | null;
  entries: AIQueueEntry[];
}> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ai_retry_queue")
    .select("*")
    .in("status", ["queued", "waiting", "processing", "template_fallback"])
    .order("next_attempt_at", { ascending: true })
    .limit(10);

  const entries = (data ?? []).map((r) => mapRow(r as QueueRow));
  return {
    active: entries.length > 0,
    waitingCount: entries.length,
    nextAttemptAt: entries[0]?.nextAttemptAt ?? null,
    entries,
  };
}

export async function retryExecution(queueId: string): Promise<{ resumed: boolean }> {
  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase.from("ai_retry_queue").select("*").eq("id", queueId).maybeSingle();
  if (!row) throw new Error("Queue entry not found");

  const entry = mapRow(row as QueueRow);
  await supabase
    .from("ai_retry_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", queueId);

  const { driveSessionExecution } = await import("./session-execution-driver");
  const execution = await driveSessionExecution(entry.workflowRunId);

  if (execution.triggered) {
    await supabase
      .from("ai_retry_queue")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", queueId);
    return { resumed: true };
  }

  const nextRetry = entry.retryCount + 1;
  const delayMin = getNextQueueDelayMinutes(nextRetry);
  if (delayMin === null) {
    await supabase
      .from("ai_retry_queue")
      .update({
        status: "template_fallback",
        retry_count: nextRetry,
        last_error: execution.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueId);
  } else {
    const nextAttempt = new Date(Date.now() + delayMin * 60_000).toISOString();
    await supabase
      .from("ai_retry_queue")
      .update({
        status: "waiting",
        retry_count: nextRetry,
        next_attempt_at: nextAttempt,
        last_error: execution.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueId);
  }

  return { resumed: false };
}

export async function processDueQueueEntries(): Promise<number> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("ai_retry_queue")
    .select("*")
    .in("status", ["queued", "waiting"])
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(5);

  let processed = 0;
  for (const row of due ?? []) {
    const entry = mapRow(row as QueueRow);
    try {
      await retryExecution(entry.id);
      processed += 1;
    } catch (error) {
      const nextRetry = entry.retryCount + 1;
      const delayMin = getNextQueueDelayMinutes(nextRetry);

      if (delayMin === null) {
        await supabase
          .from("ai_retry_queue")
          .update({
            status: "template_fallback",
            retry_count: nextRetry,
            last_error: error instanceof Error ? error.message : "Max queue retries exceeded",
            updated_at: now,
          })
          .eq("id", entry.id);

        await postSystemSessionMessage(
          entry.workflowRunId,
          "All recovery queue retries exhausted. Next execution will use template mode.",
          { projectId: entry.projectId, stepKey: entry.stepKey },
        );

        await recordProviderHealthMetric({
          provider: entry.provider ?? "unknown",
          model: entry.model,
          templateFallbackIncrement: 1,
        });
      } else {
        const nextAttempt = new Date(Date.now() + delayMin * 60_000).toISOString();
        await supabase
          .from("ai_retry_queue")
          .update({
            status: "waiting",
            retry_count: nextRetry,
            next_attempt_at: nextAttempt,
            last_error: error instanceof Error ? error.message : "Retry failed",
            updated_at: now,
          })
          .eq("id", entry.id);

        await postSystemSessionMessage(
          entry.workflowRunId,
          `AI Queue Active — retry ${nextRetry}/${entry.maxRetries} scheduled in ${delayMin} minutes.`,
          { projectId: entry.projectId, stepKey: entry.stepKey },
        );
      }
    }
  }

  return processed;
}

async function recordProviderHealthMetric(input: {
  provider: string;
  model?: string | null;
  successIncrement?: number;
  failureIncrement?: number;
  timeoutIncrement?: number;
  queueIncrement?: number;
  templateFallbackIncrement?: number;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  const windowStart = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const { data: existing } = await supabase
    .from("provider_health_metrics")
    .select("*")
    .eq("provider", input.provider)
    .gte("window_start", windowStart)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const success = (existing?.success_count ?? 0) + (input.successIncrement ?? 0);
  const failure = (existing?.failure_count ?? 0) + (input.failureIncrement ?? 0);
  const timeout = (existing?.timeout_count ?? 0) + (input.timeoutIncrement ?? 0);
  const queue = (existing?.queue_count ?? 0) + (input.queueIncrement ?? 0);
  const template = (existing?.template_fallback_count ?? 0) + (input.templateFallbackIncrement ?? 0);
  const total = success + failure;
  const rate = total > 0 ? success / total : 1;

  let healthStatus: "healthy" | "degraded" | "throttled" | "offline" = "healthy";
  const timeoutRate = total > 0 ? timeout / total : 0;

  if (total === 0 && success === 0 && failure === 0) {
    healthStatus = "healthy";
  } else if (success > 0 && rate >= 0.9) {
    healthStatus = queue > 0 || timeoutRate > 0.1 ? "throttled" : "healthy";
  } else if (success > 0 && rate >= 0.7) {
    healthStatus = timeoutRate > 0.1 || queue > 2 ? "throttled" : "degraded";
  } else if (success > 0) {
    healthStatus = "degraded";
  } else if (failure > 0 && success === 0) {
    healthStatus = "offline";
  }

  if (existing?.id) {
    await supabase
      .from("provider_health_metrics")
      .update({
        success_count: success,
        failure_count: failure,
        timeout_count: timeout,
        queue_count: queue,
        template_fallback_count: template,
        health_status: healthStatus,
        updated_at: new Date().toISOString(),
        window_end: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("provider_health_metrics").insert({
      provider: input.provider,
      model: input.model ?? null,
      success_count: success,
      failure_count: failure,
      timeout_count: timeout,
      queue_count: queue,
      template_fallback_count: template,
      health_status: healthStatus,
      window_start: windowStart,
      window_end: new Date().toISOString(),
    });
  }
}

export async function getAIInfrastructureStatus(): Promise<{
  executionMode: "free" | "paid";
  provider: string | null;
  model: string | null;
  queueStatus: QueueStatus;
  queueMessage: string | null;
  retryCount: number;
  templateUsage: number;
  providerHealth: string;
  nextAttemptAt: string | null;
}> {
  const settings = await getCompanyAISettings();
  const queue = await getGlobalQueueStatus();

  const supabase = createSupabaseAdmin();
  const [{ data: latestEvent }, { data: health }] = await Promise.all([
    supabase
      .from("ai_execution_events")
      .select("provider, model, used_template")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("provider_health_metrics")
      .select("health_status, template_fallback_count")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { count: templateCount } = await supabase
    .from("ai_execution_events")
    .select("id", { count: "exact", head: true })
    .eq("used_template", true);

  const since24h = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { count: recentSuccess } = await supabase
    .from("ai_execution_events")
    .select("id", { count: "exact", head: true })
    .eq("success", true)
    .gte("created_at", since24h);

  let providerHealth = (health?.health_status as string) ?? "healthy";
  if ((recentSuccess ?? 0) > 0 && providerHealth === "offline") {
    providerHealth = queue.active ? "throttled" : "degraded";
  }

  let queueStatus: QueueStatus = "idle";
  let queueMessage: string | null = null;
  if (queue.active && queue.entries[0]) {
    queueStatus = queue.entries[0].status === "processing" ? "processing" : "waiting";
    queueMessage = formatQueueStatusMessage(queue.entries[0]);
  }

  return {
    executionMode: settings.executionMode ?? "free",
    provider: (latestEvent?.provider as string) ?? settings.defaultProviderName ?? null,
    model: (latestEvent?.model as string) ?? null,
    queueStatus,
    queueMessage,
    retryCount: queue.entries[0]?.retryCount ?? 0,
    templateUsage: templateCount ?? 0,
    providerHealth,
    nextAttemptAt: queue.nextAttemptAt,
  };
}
