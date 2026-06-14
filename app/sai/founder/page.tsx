import { FounderWorkspaceView } from "@/components/sai/founder-workspace-view";
import { getAgents } from "@/lib/sai/agents";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { isFounder } from "@/lib/sai/current-user.types";
import { getFounderPendingApprovals } from "@/lib/sai/founder-approvals";
import { getFounderSessionTimeline } from "@/lib/sai/founder-timeline";
import { getFounderWorkspaceData } from "@/lib/sai/founder-workspace";
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

  const [workspaceData, agents, pendingApprovals, sessionTimeline] =
    configured && userIsFounder
      ? await Promise.all([
          getFounderWorkspaceData(),
          getAgents(),
          getFounderPendingApprovals(),
          getFounderSessionTimeline(),
        ])
      : [
          emptyData,
          [],
          [],
          {
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
          },
        ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Founder Workspace
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">Company Operating System</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
          Observe the organization. Direct company objectives. Monitor executive agents. Approve
          strategic decisions. Sessions execute per project — agents plan, build, and report
          autonomously.
        </p>
      </header>

      <FounderWorkspaceView
        dashboard={workspaceData.dashboard}
        agents={agents}
        inbox={workspaceData.inbox}
        timeline={workspaceData.timeline}
        agentIntelligence={workspaceData.agentIntelligence}
        pendingApprovals={pendingApprovals}
        sessionTimeline={sessionTimeline}
        isFounder={userIsFounder}
      />
    </div>
  );
}
