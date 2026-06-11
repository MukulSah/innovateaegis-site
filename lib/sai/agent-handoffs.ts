import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentHandoff } from "./types";

type HandoffRow = {
  id: string;
  workflow_id: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  step_key: string;
  objective: string;
  requirements: string;
  deliverables: string;
  decisions: string;
  open_risks: string;
  pending_questions: string;
  approval_status: string;
  created_at: string;
};

function mapRow(row: HandoffRow): AgentHandoff {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    fromAgentId: row.from_agent_id,
    toAgentId: row.to_agent_id,
    stepKey: row.step_key,
    objective: row.objective,
    requirements: row.requirements,
    deliverables: row.deliverables,
    decisions: row.decisions,
    openRisks: row.open_risks,
    pendingQuestions: row.pending_questions,
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
  };
}

export async function getWorkflowHandoffs(workflowId: string): Promise<AgentHandoff[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_handoffs")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as HandoffRow[]).map(mapRow);
}

export async function getAgentHandoffs(agentId: string, limit = 10): Promise<AgentHandoff[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_handoffs")
    .select("*")
    .or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as HandoffRow[]).map(mapRow);
}
