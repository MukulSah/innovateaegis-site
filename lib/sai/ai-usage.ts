import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { estimateCost } from "./ai-client";
import type { AIProviderName, AIUsageRecord, AIUsageStats } from "./types";

type UsageRow = {
  id: string;
  provider: string;
  model: string;
  agent: string;
  agent_id: string | null;
  tokens_used: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  workflow_id: string | null;
  session_id: string | null;
  created_at: string;
};

function mapRow(row: UsageRow): AIUsageRecord {
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    agent: row.agent,
    agentId: row.agent_id,
    tokensUsed: row.tokens_used,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    estimatedCost: Number(row.estimated_cost),
    workflowId: row.workflow_id,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}

export async function recordAIUsage(input: {
  provider: string;
  model: string;
  agent: string;
  agentId?: string | null;
  inputTokens: number;
  outputTokens: number;
  workflowId?: string | null;
  sessionId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const tokensUsed = input.inputTokens + input.outputTokens;
  const cost = estimateCost(
    input.provider as AIProviderName,
    input.inputTokens,
    input.outputTokens,
  );

  const supabase = createSupabaseAdmin();
  await supabase.from("ai_usage").insert({
    provider: input.provider,
    model: input.model,
    agent: input.agent,
    agent_id: input.agentId ?? null,
    tokens_used: tokensUsed,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    estimated_cost: cost,
    workflow_id: input.workflowId ?? null,
    session_id: input.sessionId ?? null,
  });
}

export async function getAIUsageStats(): Promise<AIUsageStats> {
  const empty: AIUsageStats = {
    dailyCost: 0,
    monthlyCost: 0,
    costByAgent: [],
    costByProject: [],
    costByProvider: [],
    totalTokens: 0,
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createSupabaseAdmin();
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await supabase
    .from("ai_usage")
    .select("*")
    .gte("created_at", monthStart.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data as UsageRow[]) ?? [];

  const dailyRows = rows.filter((r) => r.created_at >= dayStart.toISOString());
  const dailyCost = dailyRows.reduce((s, r) => s + Number(r.estimated_cost), 0);
  const monthlyCost = rows.reduce((s, r) => s + Number(r.estimated_cost), 0);
  const totalTokens = rows.reduce((s, r) => s + r.tokens_used, 0);

  const agentMap = new Map<string, { cost: number; tokens: number }>();
  const providerMap = new Map<string, { cost: number; tokens: number }>();
  const projectMap = new Map<string, { projectName: string; cost: number; tokens: number }>();

  const workflowIds = [...new Set(rows.map((r) => r.workflow_id).filter(Boolean))] as string[];
  const workflowProjectMap = new Map<string, { projectId: string; projectName: string }>();

  if (workflowIds.length > 0) {
    const { data: workflowRows } = await supabase
      .from("workflow_runs")
      .select("id, project_id, projects(name)")
      .in("id", workflowIds);

    for (const wf of workflowRows ?? []) {
      const row = wf as {
        id: string;
        project_id: string;
        projects: { name: string } | { name: string }[] | null;
      };
      const linked = row.projects;
      const projectName = Array.isArray(linked)
        ? linked[0]?.name ?? "Unknown"
        : linked?.name ?? "Unknown";
      workflowProjectMap.set(row.id, { projectId: row.project_id, projectName });
    }
  }

  for (const row of rows) {
    const agentEntry = agentMap.get(row.agent) ?? { cost: 0, tokens: 0 };
    agentEntry.cost += Number(row.estimated_cost);
    agentEntry.tokens += row.tokens_used;
    agentMap.set(row.agent, agentEntry);

    const provEntry = providerMap.get(row.provider) ?? { cost: 0, tokens: 0 };
    provEntry.cost += Number(row.estimated_cost);
    provEntry.tokens += row.tokens_used;
    providerMap.set(row.provider, provEntry);

    if (row.workflow_id) {
      const projectInfo = workflowProjectMap.get(row.workflow_id);
      if (projectInfo) {
        const projectEntry = projectMap.get(projectInfo.projectId) ?? {
          projectName: projectInfo.projectName,
          cost: 0,
          tokens: 0,
        };
        projectEntry.cost += Number(row.estimated_cost);
        projectEntry.tokens += row.tokens_used;
        projectMap.set(projectInfo.projectId, projectEntry);
      }
    }
  }

  return {
    dailyCost: Math.round(dailyCost * 1_000_000) / 1_000_000,
    monthlyCost: Math.round(monthlyCost * 1_000_000) / 1_000_000,
    costByAgent: [...agentMap.entries()]
      .map(([agent, v]) => ({ agent, ...v }))
      .sort((a, b) => b.cost - a.cost),
    costByProject: [...projectMap.entries()]
      .map(([projectId, v]) => ({
        projectId,
        projectName: v.projectName,
        cost: v.cost,
      }))
      .sort((a, b) => b.cost - a.cost),
    costByProvider: [...providerMap.entries()]
      .map(([provider, v]) => ({ provider, ...v }))
      .sort((a, b) => b.cost - a.cost),
    totalTokens,
  };
}

export async function getRecentAIUsage(limit = 20): Promise<AIUsageRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_usage")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as UsageRow[]).map(mapRow);
}
