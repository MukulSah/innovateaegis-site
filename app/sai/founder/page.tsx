import { FounderWorkspaceView } from "@/components/sai/founder-workspace-view";
import { getAgents } from "@/lib/sai/agents";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { isFounder } from "@/lib/sai/current-user.types";
import { getFounderPendingApprovals } from "@/lib/sai/founder-approvals";
import { getFounderActiveSessionOverview } from "@/lib/sai/founder-session-overview";
import { getFounderWorkspaceData, getFounderWorkspaceItems } from "@/lib/sai/founder-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function FounderWorkspacePage() {
  const currentUser = await getCurrentUser();
  const userIsFounder = currentUser ? isFounder(currentUser.profile) : false;
  const configured = isSupabaseConfigured();

  const emptyData = {
    founderName: "Founder",
    dashboard: {
      briefing: {
        greeting: "Welcome",
        companyStatusSummary: "",
        todaysFocus: [],
        stats: [],
      },
      priorities: [],
      pendingDecisions: [],
      activeDiscussions: [],
      opportunities: [],
      upcomingMeetings: [],
      recommendations: [],
      executiveAlerts: [],
      companyHealth: { dimensions: [], overallScore: 0, overallTrend: "stable" as const },
    },
    discussions: [],
    meetings: [],
    inbox: [],
    timeline: [],
    agentIntelligence: [],
  };

  const [workspaceData, workspaceItems, agents, pendingApprovals, activeSession] =
    configured && userIsFounder
      ? await Promise.all([
          getFounderWorkspaceData(),
          getFounderWorkspaceItems(),
          getAgents(),
          getFounderPendingApprovals(),
          getFounderActiveSessionOverview(),
        ])
      : [emptyData, [], [], [], null];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          Executive Command Center
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">Founder Workspace</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
          Monitor the company. Direct the organization. Review agent intelligence, make decisions,
          and conduct executive discussions. Founder Workspace consumes intelligence from Company Brain,
          Organizational Memory, and Agent Factory — it does not replace them.
        </p>
      </header>

      <FounderWorkspaceView
        founderName={workspaceData.founderName}
        dashboard={workspaceData.dashboard}
        workspaceItems={workspaceItems}
        agents={agents}
        discussions={workspaceData.discussions}
        meetings={workspaceData.meetings}
        inbox={workspaceData.inbox}
        timeline={workspaceData.timeline}
        agentIntelligence={workspaceData.agentIntelligence}
        pendingApprovals={pendingApprovals}
        activeSession={activeSession}
        isFounder={userIsFounder}
      />
    </div>
  );
}
