import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentMetrics, AgentScores } from "./types";

type MetricsRow = {
  agent_id: string;
  tasks_assigned: number;
  tasks_completed: number;
  approvals_requested: number;
  approvals_passed: number;
  approvals_rejected: number;
  auto_approved_actions: number;
  escalated_actions: number;
  documents_created: number;
  memories_created: number;
  decisions_created: number;
  workflows_contributed: number;
  last_active: string | null;
  updated_at: string;
  agents?: { name: string; role: string; authority_level: number } | null;
};

function computeScores(row: MetricsRow): AgentScores {
  const productivity =
    row.tasks_assigned > 0
      ? Math.round((row.tasks_completed / row.tasks_assigned) * 100)
      : row.workflows_contributed > 0
        ? 70
        : 50;

  const approvalTotal = row.approvals_passed + row.approvals_rejected;
  const approvalSuccess =
    approvalTotal > 0 ? Math.round((row.approvals_passed / approvalTotal) * 100) : 100;

  const knowledge = Math.min(100, (row.memories_created + row.documents_created) * 8);
  const decisions = Math.min(100, row.decisions_created * 15);
  const workflow = Math.min(100, row.workflows_contributed * 20);

  const quality = Math.round((approvalSuccess + productivity) / 2);
  const overall = Math.round((productivity + quality + knowledge + decisions + workflow) / 5);

  return {
    productivityScore: productivity,
    qualityScore: quality,
    approvalSuccessRate: approvalSuccess,
    knowledgeContribution: knowledge,
    decisionContribution: decisions,
    workflowContribution: workflow,
    overallScore: overall,
  };
}

function mapRow(row: MetricsRow): AgentMetrics {
  const scores = computeScores(row);
  return {
    agentId: row.agent_id,
    agentName: row.agents?.name ?? null,
    agentRole: row.agents?.role ?? null,
    authorityLevel: row.agents?.authority_level ?? 2,
    tasksAssigned: row.tasks_assigned,
    tasksCompleted: row.tasks_completed,
    approvalsRequested: row.approvals_requested,
    approvalsPassed: row.approvals_passed,
    approvalsRejected: row.approvals_rejected,
    autoApprovedActions: row.auto_approved_actions,
    escalatedActions: row.escalated_actions,
    documentsCreated: row.documents_created,
    memoriesCreated: row.memories_created,
    decisionsCreated: row.decisions_created,
    workflowsContributed: row.workflows_contributed,
    lastActive: row.last_active,
    updatedAt: row.updated_at,
    scores,
  };
}

async function ensureMetricsRow(agentId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("agent_metrics").upsert({ agent_id: agentId }, { onConflict: "agent_id" });
}

export async function incrementAgentMetric(
  agentIdentifier: string,
  field: keyof Pick<
    MetricsRow,
    | "tasks_assigned"
    | "tasks_completed"
    | "approvals_requested"
    | "approvals_passed"
    | "approvals_rejected"
    | "auto_approved_actions"
    | "escalated_actions"
    | "documents_created"
    | "memories_created"
    | "decisions_created"
    | "workflows_contributed"
  >,
  agentId?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseAdmin();
  let resolvedId = agentId;

  if (!resolvedId) {
    const { data } = await supabase
      .from("agents")
      .select("id")
      .ilike("name", agentIdentifier)
      .limit(1)
      .maybeSingle();
    resolvedId = data?.id;
  }

  if (!resolvedId) return;

  await ensureMetricsRow(resolvedId);
  const { data: current } = await supabase
    .from("agent_metrics")
    .select(field)
    .eq("agent_id", resolvedId)
    .single();

  const currentVal = current ? Number((current as Record<string, number>)[field] ?? 0) : 0;
  await supabase
    .from("agent_metrics")
    .update({
      [field]: currentVal + 1,
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", resolvedId);
}

export async function getAgentMetrics(): Promise<AgentMetrics[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data: agents } = await supabase.from("agents").select("id");
  for (const agent of agents ?? []) {
    await ensureMetricsRow(agent.id);
  }

  const { data, error } = await supabase
    .from("agent_metrics")
    .select("*, agents(name, role, authority_level)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as MetricsRow[]).map(mapRow);
}

export async function getAgentMetricsById(agentId: string): Promise<AgentMetrics | null> {
  await ensureMetricsRow(agentId);
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_metrics")
    .select("*, agents(name, role, authority_level)")
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as MetricsRow) : null;
}

export function canApprove(approverLevel: number, requesterLevel: number): boolean {
  return approverLevel > requesterLevel;
}
