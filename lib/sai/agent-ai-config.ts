import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentAIConfig, ReasoningLevel } from "./types";

type ConfigRow = {
  agent_id: string;
  provider_id: string | null;
  model: string | null;
  temperature: number;
  system_prompt: string;
  max_tokens: number;
  reasoning_level: ReasoningLevel;
  tools_enabled: string[];
  enabled: boolean;
  updated_at: string;
};

function mapRow(row: ConfigRow): AgentAIConfig {
  return {
    agentId: row.agent_id,
    providerId: row.provider_id,
    model: row.model,
    temperature: Number(row.temperature),
    systemPrompt: row.system_prompt,
    maxTokens: row.max_tokens,
    reasoningLevel: row.reasoning_level,
    toolsEnabled: row.tools_enabled ?? [],
    enabled: row.enabled,
    updatedAt: row.updated_at,
  };
}

export async function getAgentAIConfig(agentId: string): Promise<AgentAIConfig | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_ai_config")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as ConfigRow) : null;
}

export type AgentAIConfigInput = {
  providerId?: string | null;
  model?: string | null;
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
  reasoningLevel?: ReasoningLevel;
  toolsEnabled?: string[];
  enabled?: boolean;
};

export async function upsertAgentAIConfig(
  agentId: string,
  input: AgentAIConfigInput,
): Promise<AgentAIConfig> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_ai_config")
    .upsert({
      agent_id: agentId,
      provider_id: input.providerId ?? null,
      model: input.model ?? null,
      temperature: input.temperature ?? 0.7,
      system_prompt: input.systemPrompt ?? "",
      max_tokens: input.maxTokens ?? 4096,
      reasoning_level: input.reasoningLevel ?? "standard",
      tools_enabled: input.toolsEnabled ?? [],
      enabled: input.enabled ?? true,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as ConfigRow);
}

export function validateAgentAIConfigInput(body: unknown): AgentAIConfigInput | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const levels: ReasoningLevel[] = ["minimal", "standard", "deep"];

  return {
    providerId: typeof data.providerId === "string" ? data.providerId : null,
    model: typeof data.model === "string" ? data.model : null,
    temperature: typeof data.temperature === "number" ? data.temperature : undefined,
    systemPrompt: typeof data.systemPrompt === "string" ? data.systemPrompt : undefined,
    maxTokens: typeof data.maxTokens === "number" ? data.maxTokens : undefined,
    reasoningLevel: levels.includes(data.reasoningLevel as ReasoningLevel)
      ? (data.reasoningLevel as ReasoningLevel)
      : undefined,
    toolsEnabled: Array.isArray(data.toolsEnabled) ? data.toolsEnabled.map(String) : undefined,
    enabled: typeof data.enabled === "boolean" ? data.enabled : undefined,
  };
}
