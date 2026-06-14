import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import type { ResolvedSessionTemplate } from "./session-templates";
import type { SessionTemplateOwnershipDefaults } from "./session-templates";

export type SessionOwnership = {
  sessionId: string;
  sponsor: {
    type: "founder" | "agent" | "system";
    userId: string | null;
    userName: string | null;
    agentId: string | null;
    agentName: string | null;
    role: string;
  };
  owner: {
    agentId: string | null;
    agentName: string | null;
    role: string;
  };
  executor: {
    agentId: string | null;
    agentName: string | null;
    role: string;
  };
  approver: {
    type: "founder" | "agent" | "none";
    userId: string | null;
    agentId: string | null;
    agentName: string | null;
    role: string;
  };
};

type OwnershipRow = {
  id: string;
  executive_sponsor_agent_id: string | null;
  session_owner_agent_id: string | null;
  current_agent_id: string | null;
  sponsor_user_id: string | null;
  approver_user_id: string | null;
  approver_agent_id: string | null;
  owner: string;
};

function rolePatterns(role: string): string[] {
  const map: Record<string, string[]> = {
    CEO: ["CEO", "Chief Executive"],
    COO: ["COO", "Chief Operating"],
    Engineer: ["Engineering", "Software Engineer"],
    Founder: [],
  };
  return map[role] ?? [role];
}

export async function resolveOwnershipFromTemplate(
  template: ResolvedSessionTemplate,
  options: {
    sponsorUserId?: string | null;
    sponsorUserName?: string;
    agents?: Awaited<ReturnType<typeof getAgents>>;
  } = {},
): Promise<{
  executiveSponsorAgentId: string | null;
  sessionOwnerAgentId: string | null;
  sponsorUserId: string | null;
  approverUserId: string | null;
  approverAgentId: string | null;
}> {
  const agents = options.agents ?? (await getAgents());
  const defaults: SessionTemplateOwnershipDefaults = template.template.ownershipDefaults;

  const sponsorAgent = defaults.sponsorAgentRole
    ? findAgentForRole(agents, rolePatterns(defaults.sponsorAgentRole))
    : null;
  const ownerAgent = defaults.ownerRole
    ? findAgentForRole(agents, rolePatterns(defaults.ownerRole))
    : findAgentForRole(agents, rolePatterns("COO"));
  const executorAgent = defaults.executorRole
    ? findAgentForRole(agents, rolePatterns(defaults.executorRole))
    : null;

  const sponsorUserId = defaults.sponsorRole === "Founder" ? (options.sponsorUserId ?? null) : null;
  const approverUserId = defaults.approverRole === "Founder" ? (options.sponsorUserId ?? null) : null;

  return {
    executiveSponsorAgentId: sponsorAgent?.id ?? null,
    sessionOwnerAgentId: ownerAgent?.id ?? null,
    sponsorUserId,
    approverUserId,
    approverAgentId: null,
    ...(executorAgent ? {} : {}),
  };
}

export async function getSessionOwnership(sessionId: string): Promise<SessionOwnership | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("workflow_runs")
    .select(
      "id, executive_sponsor_agent_id, session_owner_agent_id, current_agent_id, sponsor_user_id, approver_user_id, approver_agent_id, owner",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !row) return null;

  const wf = row as OwnershipRow;
  const agentIds = [wf.executive_sponsor_agent_id, wf.session_owner_agent_id, wf.current_agent_id, wf.approver_agent_id].filter(
    Boolean,
  ) as string[];

  const agentNames = new Map<string, string>();
  if (agentIds.length) {
    const { data: agentRows } = await supabase.from("agents").select("id, name, role").in("id", agentIds);
    for (const a of agentRows ?? []) {
      agentNames.set(a.id as string, a.name as string);
    }
  }

  const sponsorIsFounder = Boolean(wf.sponsor_user_id);

  return {
    sessionId: wf.id,
    sponsor: {
      type: sponsorIsFounder ? "founder" : wf.executive_sponsor_agent_id ? "agent" : "system",
      userId: wf.sponsor_user_id,
      userName: sponsorIsFounder ? wf.owner : null,
      agentId: wf.executive_sponsor_agent_id,
      agentName: wf.executive_sponsor_agent_id ? agentNames.get(wf.executive_sponsor_agent_id) ?? null : null,
      role: sponsorIsFounder ? "Founder" : "CEO",
    },
    owner: {
      agentId: wf.session_owner_agent_id,
      agentName: wf.session_owner_agent_id ? agentNames.get(wf.session_owner_agent_id) ?? null : null,
      role: "COO",
    },
    executor: {
      agentId: wf.current_agent_id,
      agentName: wf.current_agent_id ? agentNames.get(wf.current_agent_id) ?? null : null,
      role: "Executor",
    },
    approver: {
      type: wf.approver_user_id ? "founder" : wf.approver_agent_id ? "agent" : "none",
      userId: wf.approver_user_id,
      agentId: wf.approver_agent_id,
      agentName: wf.approver_agent_id ? agentNames.get(wf.approver_agent_id) ?? null : null,
      role: wf.approver_user_id ? "Founder" : "—",
    },
  };
}

export async function applyOwnershipToSession(
  sessionId: string,
  ownership: Awaited<ReturnType<typeof resolveOwnershipFromTemplate>>,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("workflow_runs")
    .update({
      executive_sponsor_agent_id: ownership.executiveSponsorAgentId,
      session_owner_agent_id: ownership.sessionOwnerAgentId,
      sponsor_user_id: ownership.sponsorUserId,
      approver_user_id: ownership.approverUserId,
      approver_agent_id: ownership.approverAgentId,
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
}
