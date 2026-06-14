import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { createAgent, type AgentInput } from "./agents";
import { seedAgentToolPermissionsFromRole } from "./tool-permissions";

export type AgentArchetype = {
  id: string;
  slug: string;
  label: string;
  description: string;
  defaultRole: string;
  defaultDepartment: string;
  defaultSkills: string[];
  defaultTools: string[];
  defaultResponsibilities: string[];
  systemPrompt: string;
  isSystem: boolean;
};

type ArchetypeRow = {
  id: string;
  slug: string;
  label: string;
  description: string;
  default_role: string;
  default_department: string;
  default_skills: string[];
  default_tools: string[];
  default_responsibilities: string[];
  system_prompt: string;
  is_system: boolean;
};

function mapArchetype(row: ArchetypeRow): AgentArchetype {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    defaultRole: row.default_role,
    defaultDepartment: row.default_department,
    defaultSkills: row.default_skills ?? [],
    defaultTools: row.default_tools ?? [],
    defaultResponsibilities: row.default_responsibilities ?? [],
    systemPrompt: row.system_prompt,
    isSystem: row.is_system,
  };
}

export async function getAgentArchetypes(): Promise<AgentArchetype[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("agent_archetypes").select("*").order("label");

  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as ArchetypeRow[]).map(mapArchetype);
}

export async function createCustomAgentFromArchetype(
  archetypeSlug: string,
  overrides?: Partial<{ name: string; projectIds: string[] }>,
): Promise<{ agentId: string; name: string }> {
  const supabase = createSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("agent_archetypes")
    .select("*")
    .eq("slug", archetypeSlug)
    .maybeSingle();

  if (error || !row) throw new Error(`Archetype not found: ${archetypeSlug}`);
  const archetype = mapArchetype(row as ArchetypeRow);

  const input: AgentInput = {
    name: overrides?.name ?? archetype.label,
    role: archetype.defaultRole,
    department: archetype.defaultDepartment,
    description: archetype.description,
    responsibilities: archetype.defaultResponsibilities,
    skills: archetype.defaultSkills,
    toolsAccess: archetype.defaultTools,
    objectives: [],
    projectIds: overrides?.projectIds ?? [],
    priorityLevel: "medium",
    memoryEnabled: true,
    approvalRequired: false,
    status: "active",
    performanceScore: 80,
  };

  const agent = await createAgent(input);

  await supabase
    .from("agents")
    .update({ is_custom: true, archetype_slug: archetypeSlug })
    .eq("id", agent.id);

  await seedAgentToolPermissionsFromRole(agent.id, archetype.defaultRole);
  for (const tool of archetype.defaultTools) {
    const { setAgentToolPermission } = await import("./tool-permissions");
    await setAgentToolPermission(agent.id, tool, true);
  }

  return { agentId: agent.id, name: agent.name };
}

export async function getCustomAgents(): Promise<{ id: string; name: string; role: string; archetypeSlug: string | null }[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, role, archetype_slug")
    .eq("is_custom", true)
    .order("name");

  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    role: r.role as string,
    archetypeSlug: r.archetype_slug as string | null,
  }));
}
