import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentRuntimeSession, RuntimeSessionStatus } from "./types";

type SessionRow = {
  id: string;
  agent_id: string;
  workflow_id: string | null;
  task_id: string | null;
  status: RuntimeSessionStatus;
  model_provider: string;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  reasoning: string;
  output: string;
  error_message: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  agents?: { name: string } | null;
};

const select = `*, agents(name)`;

function mapRow(row: SessionRow): AgentRuntimeSession {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agents?.name ?? null,
    workflowId: row.workflow_id,
    taskId: row.task_id,
    status: row.status,
    modelProvider: row.model_provider,
    modelName: row.model_name,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    reasoning: row.reasoning,
    output: row.output,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function createRuntimeSession(input: {
  agentId: string;
  workflowId?: string | null;
  taskId?: string | null;
  modelProvider: string;
  modelName: string;
}): Promise<AgentRuntimeSession> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("agent_runtime_sessions")
    .insert({
      agent_id: input.agentId,
      workflow_id: input.workflowId ?? null,
      task_id: input.taskId ?? null,
      status: "RUNNING",
      model_provider: input.modelProvider,
      model_name: input.modelName,
      started_at: now,
    })
    .select(select)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as SessionRow);
}

export async function updateRuntimeSession(
  id: string,
  updates: Partial<{
    status: RuntimeSessionStatus;
    inputTokens: number;
    outputTokens: number;
    reasoning: string;
    output: string;
    errorMessage: string;
  }>,
): Promise<AgentRuntimeSession> {
  const supabase = createSupabaseAdmin();
  const payload: Record<string, unknown> = {};

  if (updates.status) {
    payload.status = updates.status;
    if (["COMPLETED", "FAILED", "TERMINATED"].includes(updates.status)) {
      payload.completed_at = new Date().toISOString();
    }
  }
  if (updates.inputTokens !== undefined) payload.input_tokens = updates.inputTokens;
  if (updates.outputTokens !== undefined) payload.output_tokens = updates.outputTokens;
  if (updates.reasoning !== undefined) payload.reasoning = updates.reasoning;
  if (updates.output !== undefined) payload.output = updates.output;
  if (updates.errorMessage !== undefined) payload.error_message = updates.errorMessage;

  const { data, error } = await supabase
    .from("agent_runtime_sessions")
    .update(payload)
    .eq("id", id)
    .select(select)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as SessionRow);
}

export async function getRuntimeSession(id: string): Promise<AgentRuntimeSession | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_runtime_sessions")
    .select(select)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as SessionRow) : null;
}

export async function getAgentRuntimeSessions(
  agentId: string,
  limit = 20,
): Promise<AgentRuntimeSession[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_runtime_sessions")
    .select(select)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as SessionRow[]).map(mapRow);
}

export async function getActiveRuntimeSessions(): Promise<AgentRuntimeSession[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_runtime_sessions")
    .select(select)
    .in("status", ["PENDING", "RUNNING", "WAITING"])
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SessionRow[]).map(mapRow);
}

export async function countFailedSessions(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("agent_runtime_sessions")
    .select("*", { count: "exact", head: true })
    .eq("status", "FAILED");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function pauseRuntimeSession(id: string): Promise<AgentRuntimeSession> {
  return updateRuntimeSession(id, { status: "PAUSED" });
}

export async function terminateRuntimeSession(id: string): Promise<AgentRuntimeSession> {
  return updateRuntimeSession(id, { status: "TERMINATED" });
}

export async function resumeRuntimeSession(id: string): Promise<AgentRuntimeSession> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_runtime_sessions")
    .update({ status: "RUNNING", started_at: new Date().toISOString() })
    .eq("id", id)
    .select(select)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as SessionRow);
}
