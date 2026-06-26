import { generateAICompletion } from "./ai-client";
import { recordAIUsage } from "./ai-usage";
import { estimatePromptTokens } from "./token-estimate";
import type { AIProviderName, ReasoningLevel } from "./types";

const RETRY_DELAYS_MS = [0, 5_000, 10_000] as const;

export type AgentModelConfig = {
  providerName: AIProviderName;
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningLevel: ReasoningLevel;
  systemPrompt: string;
  /** Additional models to try on same provider before fallback provider. */
  modelAlternates?: string[];
};

export type RetryExecutionInput = {
  primary: AgentModelConfig;
  fallback?: AgentModelConfig | null;
  systemPrompt: string;
  userPrompt: string;
  agentName: string;
  agentId: string;
  workflowId?: string | null;
  runtimeSessionId: string;
  timeoutMs: number;
  onStatusMessage?: (message: string) => Promise<void>;
};

export type RetryDiagnostics = {
  promptLength: number;
  estimatedInputTokens: number;
  responseTimeMs: number;
  timeoutMs: number;
};

export type RetryExecutionSuccess = RetryDiagnostics & {
  ok: true;
  content: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
  attemptCount: number;
  usedFallback: boolean;
  usedModelRotation: boolean;
  errors: string[];
};

export type RetryExecutionFailure = RetryDiagnostics & {
  ok: false;
  attemptCount: number;
  errors: string[];
  lastProvider: string;
  lastModel: string;
  timedOut: boolean;
  failureReason: string;
};

export type RetryExecutionResult = RetryExecutionSuccess | RetryExecutionFailure;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTimeoutError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("timeout") ||
    msg.includes("Timeout") ||
    msg.includes("aborted") ||
    msg.includes("AbortError")
  );
}

function buildDiagnostics(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
  responseTimeMs: number,
): RetryDiagnostics {
  const promptLength = systemPrompt.length + userPrompt.length;
  return {
    promptLength,
    estimatedInputTokens: estimatePromptTokens(systemPrompt, userPrompt),
    responseTimeMs,
    timeoutMs,
  };
}

async function attemptCompletion(
  config: AgentModelConfig,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<{ content: string; inputTokens: number; outputTokens: number; latencyMs: number }> {
  const result = await generateAICompletion({
    providerName: config.providerName,
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    model: config.model,
    systemPrompt,
    userPrompt,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    timeoutMs,
  });
  if (!result.content?.trim()) {
    throw new Error("Empty AI response");
  }
  return result;
}

/**
 * Unified retry policy for all agent executions:
 * Attempt 1 → wait 5s → Attempt 2 → wait 10s → Attempt 3 → Fallback provider → failure
 */
export async function executeWithRetryPolicy(
  input: RetryExecutionInput,
): Promise<RetryExecutionResult> {
  const errors: string[] = [];
  let attemptCount = 0;
  let lastProvider = input.primary.providerName;
  let lastModel = input.primary.model;
  let timedOut = false;
  const startedAt = Date.now();
  const baseDiagnostics = buildDiagnostics(
    input.systemPrompt,
    input.userPrompt,
    input.timeoutMs,
    0,
  );

  const tryConfig = async (
    config: AgentModelConfig,
    label: string,
    options?: { usedFallback?: boolean; usedModelRotation?: boolean },
  ): Promise<RetryExecutionSuccess | null> => {
    try {
      const result = await attemptCompletion(
        config,
        input.systemPrompt,
        input.userPrompt,
        input.timeoutMs,
      );
      console.info("[ai-retry-engine] execution success", {
        provider: config.providerName,
        model: config.model,
        endpoint: config.endpoint,
        timeoutMs: input.timeoutMs,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        promptLength: input.systemPrompt.length + input.userPrompt.length,
        agentId: input.agentId,
        workflowId: input.workflowId,
        label,
      });
      return {
        ok: true,
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: config.providerName,
        model: config.model,
        attemptCount,
        usedFallback: options?.usedFallback ?? false,
        usedModelRotation: options?.usedModelRotation ?? false,
        errors,
        ...buildDiagnostics(
          input.systemPrompt,
          input.userPrompt,
          input.timeoutMs,
          Date.now() - startedAt,
        ),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("[ai-retry-engine] execution attempt failed", {
        label,
        provider: config.providerName,
        model: config.model,
        endpoint: config.endpoint,
        timeoutMs: input.timeoutMs,
        promptLength: input.systemPrompt.length + input.userPrompt.length,
        agentId: input.agentId,
        workflowId: input.workflowId,
        error: msg,
      });
      errors.push(`${label}: ${msg}`);
      if (isTimeoutError(error)) timedOut = true;
      lastProvider = config.providerName;
      lastModel = config.model;
      return null;
    }
  };

  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    if (i > 0) await sleep(RETRY_DELAYS_MS[i]);
    attemptCount = i + 1;
    const success = await tryConfig(input.primary, `primary-attempt-${attemptCount}`);
    if (success) {
      await recordAIUsage({
        provider: success.provider,
        model: success.model,
        agent: input.agentName,
        agentId: input.agentId,
        inputTokens: success.inputTokens,
        outputTokens: success.outputTokens,
        workflowId: input.workflowId,
        sessionId: input.runtimeSessionId,
      });
      if (success.usedFallback) {
        await input.onStatusMessage?.("Fallback provider used successfully. Execution continues.");
      } else if (success.usedModelRotation) {
        await input.onStatusMessage?.(
          `Recovered using alternate model (${success.model}). Execution continues.`,
        );
      }
      return success;
    }
    if (i === 0) {
      await input.onStatusMessage?.("AI provider unavailable.");
    }
    await input.onStatusMessage?.(`Retry ${i + 1}/${RETRY_DELAYS_MS.length} failed.`);
  }

  const alternates = input.primary.modelAlternates ?? [];
  for (const alternateModel of alternates) {
    attemptCount += 1;
    await input.onStatusMessage?.(`Trying alternate model: ${alternateModel}`);
    const altConfig: AgentModelConfig = { ...input.primary, model: alternateModel };
    const altSuccess = await tryConfig(altConfig, `alternate-${alternateModel}`, {
      usedModelRotation: true,
    });
    if (altSuccess) {
      await recordAIUsage({
        provider: altSuccess.provider,
        model: altSuccess.model,
        agent: input.agentName,
        agentId: input.agentId,
        inputTokens: altSuccess.inputTokens,
        outputTokens: altSuccess.outputTokens,
        workflowId: input.workflowId,
        sessionId: input.runtimeSessionId,
      });
      await input.onStatusMessage?.(
        `Recovered using alternate model (${alternateModel}). Execution continues.`,
      );
      return altSuccess;
    }
  }

  if (input.fallback) {
    await input.onStatusMessage?.("Switching to fallback provider.");
    attemptCount += 1;
    const fallbackSuccess = await tryConfig(input.fallback, "fallback", { usedFallback: true });
    if (fallbackSuccess) {
      await recordAIUsage({
        provider: fallbackSuccess.provider,
        model: fallbackSuccess.model,
        agent: input.agentName,
        agentId: input.agentId,
        inputTokens: fallbackSuccess.inputTokens,
        outputTokens: fallbackSuccess.outputTokens,
        workflowId: input.workflowId,
        sessionId: input.runtimeSessionId,
      });
      await input.onStatusMessage?.("Fallback provider used successfully. Execution continues.");
      return fallbackSuccess;
    }
  }

  const failureReason = timedOut
    ? `Timed out after ${input.timeoutMs}ms`
    : errors[errors.length - 1] ?? "AI execution failed";

  return {
    ok: false,
    attemptCount,
    errors,
    lastProvider,
    lastModel,
    timedOut,
    failureReason,
    ...baseDiagnostics,
    responseTimeMs: Date.now() - startedAt,
  };
}
