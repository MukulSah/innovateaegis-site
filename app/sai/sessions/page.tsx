import { SessionCenterView } from "@/components/sai/session-center-view";
import { getAgents } from "@/lib/sai/agents";
import { getSession } from "@/lib/sai/api-auth";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { getFounderSessionTimeline } from "@/lib/sai/founder-timeline";
import { getProjects } from "@/lib/sai/projects";
import { getSessionDuties } from "@/lib/sai/session-duties";
import { getAutomationRules } from "@/lib/sai/session-automation";
import { getSessionTemplates } from "@/lib/sai/session-templates";
import { getAgentArchetypes, getCustomAgents } from "@/lib/sai/agent-archetypes";
import { getToolRegistry } from "@/lib/sai/tool-permissions";
import type { SessionCenterSection } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";
const emptyTimeline = {
  generatedAt: new Date().toISOString(),
  activeSessions: [],
  awaitingApprovalSessions: [],
  scheduledSessions: [],
  awaitingFounderApproval: [],
  completedSessions: [],
  archivedSessions: [],
  cancelledSessions: [],
  blockedSessions: [],
  needsFounderReview: [],
};

const VALID_SECTIONS = new Set<SessionCenterSection>([
  "dashboard",
  "registry-all",
  "registry-active",
  "registry-scheduled",
  "registry-approval",
  "registry-completed",
  "registry-archived",
  "registry-cancelled",
  "templates",
  "duties",
  "automation",
  "agents",
  "intelligence",
  "analytics",
  "settings",
]);

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function SessionCenterPage({ searchParams }: Props) {
  const { section: rawSection } = await searchParams;
  const section =
    rawSection && VALID_SECTIONS.has(rawSection as SessionCenterSection)
      ? (rawSection as SessionCenterSection)
      : null;

  const [session, currentUser] = await Promise.all([getSession(), getCurrentUser()]);
  const configured = isSupabaseConfigured();

  const [sessionTimeline, projects, agents, duties, automations, templates, archetypes, customAgents, tools] =
    await Promise.all([
      configured && currentUser ? getFounderSessionTimeline() : Promise.resolve(emptyTimeline),
      configured ? getProjects().catch(() => []) : Promise.resolve([]),
      configured ? getAgents().catch(() => []) : Promise.resolve([]),
      configured ? getSessionDuties().catch(() => []) : Promise.resolve([]),
      configured ? getAutomationRules().catch(() => []) : Promise.resolve([]),
      configured ? getSessionTemplates().catch(() => []) : Promise.resolve([]),
      configured ? getAgentArchetypes().catch(() => []) : Promise.resolve([]),
      configured ? getCustomAgents().catch(() => []) : Promise.resolve([]),
      configured ? getToolRegistry().catch(() => []) : Promise.resolve([]),
    ]);

  return (
    <SessionCenterView
      initialTimeline={sessionTimeline}
      section={section}
      projects={projects}
      agents={agents}
      duties={duties}
      automations={automations}
      templates={templates}
      archetypes={archetypes}
      customAgents={customAgents}
      tools={tools}
      isAdmin={session?.role === "owner"}
    />
  );
}
