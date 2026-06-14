import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getAgentById } from "./agents";

export type ToolDefinition = {
  toolKey: string;
  label: string;
  description: string;
  category: string;
  isDangerous: boolean;
};

/** Map SDLC step keys to required tools for runtime enforcement. */
export const STEP_TOOL_REQUIREMENTS: Record<string, string> = {
  ceo_strategy: "analytics",
  coo_execution: "reporting",
  requirements: "documentation",
  design: "system_design",
  tasks: "documentation",
  implementation: "code_write",
  validation: "documentation",
  deployment: "deploy",
  documentation: "documentation",
  knowledge: "brain_write",
};

const ROLE_DEFAULT_TOOLS: Record<string, string[]> = {
  CEO: ["analytics", "reporting", "portfolio_intelligence", "approvals"],
  COO: ["reporting", "analytics", "approvals", "documentation"],
  Engineer: ["code_write", "repository", "terminal", "supabase"],
  Engineering: ["code_write", "repository", "terminal", "supabase"],
  Architect: ["system_design", "database_design", "documentation"],
  Architecture: ["system_design", "database_design", "documentation"],
  "Solution Architect": ["system_design", "database_design", "documentation"],
  "Product Manager": ["documentation", "brain_read", "analytics"],
  "Product Management": ["documentation", "brain_read", "analytics"],
  QA: ["documentation", "repository"],
  "Quality Assurance": ["documentation", "repository"],
  DevOps: ["deploy", "terminal", "repository", "supabase"],
  Documentation: ["documentation", "brain_read", "brain_write"],
};

function roleDefaultTools(role: string, toolsAccess: string[] = []): string[] {
  if (ROLE_DEFAULT_TOOLS[role]) return [...ROLE_DEFAULT_TOOLS[role]];
  const lower = role.toLowerCase();
  if (lower.includes("architect")) return [...ROLE_DEFAULT_TOOLS.Architect];
  if (lower.includes("engineer") && !lower.includes("qa")) return [...ROLE_DEFAULT_TOOLS.Engineer];
  if (lower.includes("product")) return [...ROLE_DEFAULT_TOOLS["Product Manager"]];
  if (lower.includes("coo") || lower.includes("operating")) return [...ROLE_DEFAULT_TOOLS.COO];
  if (lower.includes("ceo") || lower.includes("executive")) return [...ROLE_DEFAULT_TOOLS.CEO];
  if (lower.includes("devops") || lower.includes("deploy")) return [...ROLE_DEFAULT_TOOLS.DevOps];
  if (lower.includes("qa") || lower.includes("quality")) return [...ROLE_DEFAULT_TOOLS.QA];
  if (toolsAccess.length) return [...toolsAccess];
  return [];
}

export async function getToolRegistry(): Promise<ToolDefinition[]> {
  if (!isSupabaseConfigured()) {
    return Object.entries(STEP_TOOL_REQUIREMENTS).map(([key]) => ({
      toolKey: key,
      label: key,
      description: "",
      category: "general",
      isDangerous: false,
    }));
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("tool_registry").select("*").order("category, label");

  if (error || !data?.length) return [];
  return data.map((row) => ({
    toolKey: row.tool_key as string,
    label: row.label as string,
    description: row.description as string,
    category: row.category as string,
    isDangerous: row.is_dangerous as boolean,
  }));
}

export async function getAgentToolPermissions(agentId: string): Promise<Record<string, boolean>> {
  if (!isSupabaseConfigured()) return {};

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_tool_permissions")
    .select("tool_key, allowed")
    .eq("agent_id", agentId);

  if (error || !data?.length) return {};
  return Object.fromEntries(data.map((r) => [r.tool_key as string, r.allowed as boolean]));
}

export async function setAgentToolPermission(
  agentId: string,
  toolKey: string,
  allowed: boolean,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("agent_tool_permissions").upsert(
    { agent_id: agentId, tool_key: toolKey, allowed, scope: "global" },
    { onConflict: "agent_id,tool_key,scope" },
  );
  if (error) throw new Error(error.message);
}

export async function resolveEffectiveTools(agentId: string): Promise<Set<string>> {
  const agent = await getAgentById(agentId);
  if (!agent) return new Set();

  const tools = new Set<string>();
  for (const t of roleDefaultTools(agent.role, agent.toolsAccess ?? [])) tools.add(t);
  for (const t of agent.toolsAccess ?? []) tools.add(t);

  const explicit = await getAgentToolPermissions(agentId);
  for (const [key, allowed] of Object.entries(explicit)) {
    if (allowed) tools.add(key);
    else tools.delete(key);
  }

  return tools;
}

/** Grant a step-required tool to an agent when COS detects a permission gap. */
export async function healAgentToolForStep(agentId: string, stepKey: string): Promise<boolean> {
  const required = STEP_TOOL_REQUIREMENTS[stepKey];
  if (!required) return false;

  const tools = await resolveEffectiveTools(agentId);
  if (tools.has(required)) return true;

  await setAgentToolPermission(agentId, required, true);

  const agent = await getAgentById(agentId);
  const { recordActivityFeed } = await import("./activity-feed");
  await recordActivityFeed({
    actor: "COS",
    action: "agent_tool_healed",
    targetType: "agent",
    targetId: agentId,
    description: `Auto-granted "${required}" to ${agent?.name ?? agentId} for step ${stepKey}`,
  });

  return true;
}

export async function assertAgentToolAccess(agentId: string, toolKey: string): Promise<void> {
  const tools = await resolveEffectiveTools(agentId);
  if (!tools.has(toolKey)) {
    const agent = await getAgentById(agentId);
    throw new Error(
      `Tool access denied: agent "${agent?.name ?? agentId}" lacks permission for "${toolKey}"`,
    );
  }
}

export async function assertStepToolAccess(agentId: string, stepKey: string): Promise<void> {
  const required = STEP_TOOL_REQUIREMENTS[stepKey];
  if (!required) return;
  await assertAgentToolAccess(agentId, required);
}

export async function seedAgentToolPermissionsFromRole(agentId: string, role: string): Promise<void> {
  const defaults = roleDefaultTools(role);
  for (const toolKey of defaults) {
    await setAgentToolPermission(agentId, toolKey, true);
  }
}
