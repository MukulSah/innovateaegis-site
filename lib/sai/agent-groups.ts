import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentGroup } from "./types";

type AgentGroupRow = {
  id: string;
  name: string;
  department: string;
  description: string;
  created_at: string;
  agent_group_members?: { agent_id: string; agents?: { name: string } | null }[];
};

function mapRow(row: AgentGroupRow): AgentGroup {
  const members = row.agent_group_members ?? [];
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    description: row.description,
    memberCount: members.length,
    memberNames: members.map((m) => m.agents?.name ?? "").filter(Boolean),
    createdAt: row.created_at,
  };
}

export async function getAgentGroups(): Promise<AgentGroup[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_groups")
    .select("*, agent_group_members(agent_id, agents(name))")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as AgentGroupRow[]).map(mapRow);
}

export async function syncAgentGroupMembers(agents: { id: string; role: string; department: string }[]): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseAdmin();
  const { data: groups, error } = await supabase.from("agent_groups").select("id, name");
  if (error || !groups) return;

  const groupMatchers: Record<string, (agent: { role: string; department: string }) => boolean> = {
    "Engineering Team": (a) =>
      a.role.toLowerCase().includes("engineer") && !a.role.toLowerCase().includes("qa"),
    "Architecture Team": (a) =>
      a.role.toLowerCase().includes("architect") || a.role.toLowerCase().includes("architecture"),
    "QA Team": (a) => a.role.toLowerCase().includes("qa") || a.role.toLowerCase().includes("quality"),
    "Operations Team": (a) =>
      a.role.toLowerCase().includes("devops") || a.department.toLowerCase().includes("operations"),
    "Documentation Team": (a) => a.role.toLowerCase().includes("documentation"),
  };

  for (const group of groups) {
    const matcher = groupMatchers[group.name];
    if (!matcher) continue;

    for (const agent of agents.filter(matcher)) {
      await supabase.from("agent_group_members").upsert(
        { group_id: group.id, agent_id: agent.id },
        { onConflict: "group_id,agent_id", ignoreDuplicates: true },
      );
    }
  }
}
