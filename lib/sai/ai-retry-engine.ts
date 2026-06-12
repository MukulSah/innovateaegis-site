import { generateAICompletion } from "./ai-client";
import { recordAIUsage } from "./ai-usage";
import type { AIProviderName, ReasoningLevel } from "./types";

export const AI_RETRY_TIMEOUT_MS = 45_000;
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
  onStatusMessage?: (message: string) => Promise<void>;
};

export type RetryExecutionSuccess = {
  ok: true;
  content: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
  attemptCount: number;
  usedFallback: boolean;
  errors: string[];
};

export type RetryExecutionFailure = {
  ok: false;
  attemptCount: number;
  errors: string[];
  lastProvider: string;
  lastModel: string;
  timedOut: boolean;
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

async function attemptCompletion(
  config: AgentModelConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const result = await generateAICompletion({
    providerName: config.providerName,
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    model: config.model,
    systemPrompt,
    userPrompt,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
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

  const tryConfig = async (
    config: AgentModelConfig,
    label: string,
  ): Promise<RetryExecutionSuccess | null> => {
    try {
      const result = await attemptCompletion(config, input.systemPrompt, input.userPrompt);
      return {
        ok: true,
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: config.providerName,
        model: config.model,
        attemptCount,
        usedFallback: label === "fallback",
        errors,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
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
      }
      return success;
    }
    if (i === 0) {
      await input.onStatusMessage?.("AI provider unavailable.");
    }
    await input.onStatusMessage?.(`Retry ${i + 1}/${RETRY_DELAYS_MS.length} failed.`);
  }

  if (input.fallback) {
    await input.onStatusMessage?.("Switching to fallback provider.");
    attemptCount += 1;
    const fallbackSuccess = await tryConfig(input.fallback, "fallback");
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

  return {
    ok: false,
    attemptCount,
    errors,
    lastProvider,
    lastModel,
    timedOut,
  };
}
