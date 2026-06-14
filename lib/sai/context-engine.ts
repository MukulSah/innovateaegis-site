import { getWorkflowConversations } from "./agent-conversations";
import {
  applyContextBudget,
  getContextLoadPlan,
  resolveRoleKey,
  ROLE_TOKEN_BUDGETS,
} from "./context-budget";
import {
  buildIsolatedContextSlice,
  buildRoleSectionsFromSlice,
  persistSessionContext,
  upsertSessionMemoryBucket,
} from "./context-isolation";
import { buildCompressedAgentContextV2 } from "./memory-compression-v2";
import { estimateTokens } from "./token-estimate";
import type { Agent } from "./types";
import type { AgentExecutionContext } from "./agent-executor";

export type ContextBundle = {
  markdown: string;
  sources: string[];
  loadedAt: string;
  promptLength: number;
  estimatedInputTokens: number;
  memoryRecordCount?: number;
  memoryCompressed?: boolean;
  isolationActive?: boolean;
  queueNotice?: string | null;
};

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.warn(`[context-engine] ${label} failed:`, error);
    return fallback;
  }
}

export async function getAgentContext(
  agent: Agent,
  ctx: AgentExecutionContext,
): Promise<ContextBundle> {
  const loadedAt = new Date().toISOString();
  const role = resolveRoleKey(agent);
  getContextLoadPlan(role, ctx);

  let queueNotice: string | null = null;
  if (ctx.workflowId) {
    const { getActiveQueueForSession, formatQueueStatusMessage } = await import("./recovery-queue");
    const queueEntry = await getActiveQueueForSession(ctx.workflowId);
    if (queueEntry) {
      queueNotice = formatQueueStatusMessage(queueEntry);
    }
  }

  const slice = await buildIsolatedContextSlice(role, ctx, {
    includeHistorical: false,
    includeProjectKnowledge: false,
  });

  const compressed = buildCompressedAgentContextV2(role, agent, slice, ctx);
  const sections = buildRoleSectionsFromSlice(role, agent, slice, ctx);

  if (ctx.handoffContext) {
    sections.push(`## Handoff\n${ctx.handoffContext.slice(0, 2_000)}`);
  }

  if (queueNotice) {
    sections.unshift(`## AI Queue Status\n${queueNotice}`);
  }

  const { markdown: budgetedMarkdown, truncated } = applyContextBudget(role, sections);
  const markdown = truncated ? compressed.markdown : budgetedMarkdown;

  if (ctx.workflowId) {
    await safeLoad("persist_context", async () => {
      await persistSessionContext({
        workflowRunId: ctx.workflowId!,
        agentId: agent.id,
        stepKey: ctx.stepKey,
        roleKey: role,
        allowedSources: slice.sources,
        excludedSources: slice.excluded,
        tokenBudget: ROLE_TOKEN_BUDGETS[role] ?? ROLE_TOKEN_BUDGETS.default,
        actualTokens: estimateTokens(markdown),
        contextMarkdown: markdown,
      });

      await upsertSessionMemoryBucket({
        workflowRunId: ctx.workflowId!,
        projectId: ctx.projectId,
        bucketType: "session",
        memoryKey: `${ctx.stepKey}_${role}`,
        content: {
          objective: ctx.objective,
          sources: slice.sources,
          artifactCount: slice.sessionArtifacts.length,
        },
        tokenEstimate: estimateTokens(markdown),
      });
    }, undefined);
  }

  if (role === "coo" && ctx.workflowId) {
    await safeLoad("conversations", () => getWorkflowConversations(ctx.workflowId!), []);
  }

  return {
    markdown,
    sources: slice.sources,
    loadedAt,
    promptLength: markdown.length,
    estimatedInputTokens: estimateTokens(markdown),
    memoryRecordCount: slice.sessionArtifacts.length,
    memoryCompressed: compressed.truncated,
    isolationActive: true,
    queueNotice,
  };
}
