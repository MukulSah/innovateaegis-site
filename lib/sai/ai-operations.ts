import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAIProviders } from "./ai-providers";
import { getAIUsageStats } from "./ai-usage";
import { getActiveRuntimeSessions, countFailedSessions } from "./agent-runtime";
import { getRecentConversations, countConversations } from "./agent-conversations";
import type { AIOperationsMetrics } from "./types";

export async function getAIOperationsMetrics(): Promise<AIOperationsMetrics> {
  const empty: AIOperationsMetrics = {
    connectedProviders: 0,
    runningAgents: 0,
    activeSessions: 0,
    failedExecutions: 0,
    dailyCost: 0,
    monthlyCost: 0,
    conversationCount: 0,
    mostActiveAgent: null,
    modelUsage: [],
    providers: [],
    recentSessions: [],
    recentConversations: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const [providers, usage, sessions, failed, conversations, conversationCount] =
    await Promise.all([
      getAIProviders(),
      getAIUsageStats(),
      getActiveRuntimeSessions(),
      countFailedSessions(),
      getRecentConversations(10),
      countConversations(),
    ]);

  const connectedProviders = providers.filter((p) => p.enabled && p.hasApiKey).length;
  const runningAgents = new Set(sessions.map((s) => s.agentId)).size;

  const supabase = createSupabaseAdmin();
  const { data: modelRows } = await supabase
    .from("ai_usage")
    .select("model")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const modelCounts = new Map<string, number>();
  for (const row of modelRows ?? []) {
    const m = row.model as string;
    modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1);
  }

  const mostActiveAgent = usage.costByAgent[0]?.agent ?? null;

  return {
    connectedProviders,
    runningAgents,
    activeSessions: sessions.length,
    failedExecutions: failed,
    dailyCost: usage.dailyCost,
    monthlyCost: usage.monthlyCost,
    conversationCount,
    mostActiveAgent,
    modelUsage: [...modelCounts.entries()]
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    providers: providers.filter((p) => p.enabled),
    recentSessions: sessions.slice(0, 5),
    recentConversations: conversations,
  };
}
