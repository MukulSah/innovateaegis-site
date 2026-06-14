import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentConversationPanel } from "@/components/sai/agent-conversation-panel";
import { AgentTurnCard } from "@/components/sai/agent-turn-card";
import { CeoWorkspaceDashboard } from "@/components/sai/ceo-workspace-dashboard";
import { SectionPage } from "@/components/sai/section-page";
import { SessionChat } from "@/components/sai/session-chat";
import { isConversationOpen } from "@/lib/sai/agent-conversation";
import { getObjectiveAgentFeed, getSessionAgentFeed } from "@/lib/sai/agent-feed";
import { getSessionChat } from "@/lib/sai/session-chat";
import { getObjectiveArtifacts } from "@/lib/sai/session-artifacts";
import { findAgentForRole, getAgents } from "@/lib/sai/agents";
import { getCeoDashboard } from "@/lib/sai/ceo-dashboard";
import { getObjectiveById } from "@/lib/sai/founder-objectives";
import { getFounderPendingApprovals } from "@/lib/sai/founder-approvals";
import { getWorkflowApprovals } from "@/lib/sai/governance";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ objectiveId?: string; sessionId?: string }> };

export default async function CeoWorkspacePage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) notFound();

  const { objectiveId, sessionId: sessionIdParam } = await searchParams;
  const agents = await getAgents();
  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  if (!ceo) notFound();

  const dashboard = await getCeoDashboard(ceo.id);
  const primarySessionId =
    sessionIdParam ?? dashboard.sponsoredSessions[0]?.id ?? null;

  let objectiveTurn = null;
  let objectiveFeed: Awaited<ReturnType<typeof getObjectiveAgentFeed>> = [];
  let objectiveChat: Awaited<ReturnType<typeof getSessionChat>> = [];
  let artifacts: Awaited<ReturnType<typeof getObjectiveArtifacts>> = [];
  let conversationOpen = false;
  let ceoArtifactId: string | null = null;

  let sessionFeed: Awaited<ReturnType<typeof getSessionAgentFeed>> = [];
  let sessionChat: Awaited<ReturnType<typeof getSessionChat>> = [];

  if (objectiveId) {
    const objective = await getObjectiveById(objectiveId);
    if (objective) {
      objectiveFeed = await getObjectiveAgentFeed(objectiveId);
      artifacts = await getObjectiveArtifacts(objectiveId);
      const ceoArtifact = artifacts.find((a) => a.stepKey === "ceo_strategy") ?? null;
      ceoArtifactId = ceoArtifact?.id ?? null;

      objectiveChat = await getSessionChat({ objectiveId, artifactId: ceoArtifactId ?? undefined });
      conversationOpen = await isConversationOpen({ objectiveId, artifactId: ceoArtifactId ?? undefined });

      const approvals = await getWorkflowApprovals({
        projectId: objective.projectId,
        status: "pending",
      });
      const strategicApproval = approvals.find((a) => a.approvalType === "strategic_objective");
      const brief = objective.strategicBrief;
      objectiveTurn = {
        agentName: ceo.name,
        agentRole: ceo.role,
        objective: objective.title,
        body: String(brief.raw ?? objective.description),
        artifactName: ceoArtifact?.artifactName ?? "strategic_brief_v1",
        priority: String(brief.priority ?? "high"),
        expectedOutcome: String(brief.expectedOutcome ?? ""),
        successMetric: String(brief.successMetric ?? ""),
        recommendation: "Proceed",
        approvalId: strategicApproval?.id ?? null,
        showActions: objective.status === "pending_founder",
      };
    }
  }

  if (primarySessionId) {
    const sponsored = dashboard.sponsoredSessions.find((s) => s.id === primarySessionId);
    sessionFeed = await getSessionAgentFeed(primarySessionId, sponsored?.projectName);
    sessionChat = await getSessionChat({ workflowRunId: primarySessionId });
  }

  const pendingApprovals = await getFounderPendingApprovals();

  return (
    <SectionPage
      title="CEO Agent Workspace"
      subtitle="Executive Office · Executive Sponsor"
      description="CEO monitors strategic alignment, business impact, and delivery risk across sponsored sessions. The CEO does not route work or assign agents."
    >
      <div className="space-y-6">
        <CeoWorkspaceDashboard dashboard={dashboard} primarySessionId={primarySessionId} />

        {primarySessionId && (
          <>
            <SessionChat messages={sessionChat} title="Session Chat — Executive Participation" />
            <section className="enterprise-glass rounded-xl border border-white/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Sponsored Session Activity</h2>
                <Link
                  href={`/sai/sessions/${primarySessionId}`}
                  className="text-xs text-purple-300 hover:underline"
                >
                  Open in Session Center →
                </Link>
              </div>
              <p className="mt-2 text-xs text-white/45">
                {sessionFeed.length} agent event(s) — open Session Center for artifacts and execution records.
              </p>
            </section>
          </>
        )}

        {objectiveId && ceo && (
          <AgentConversationPanel
            messages={objectiveChat}
            agentId={ceo.id}
            agentName={ceo.name}
            objectiveId={objectiveId}
            artifactId={ceoArtifactId ?? undefined}
            conversationOpen={conversationOpen}
            title="Pre-Approval Conversation"
          />
        )}

        {objectiveTurn && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-purple-300/80">
              Strategic Brief (Pending Activation)
            </h2>
            <AgentTurnCard turn={objectiveTurn} />
          </section>
        )}

        {objectiveFeed.length > 0 && objectiveId && (
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Objective Activity Summary</h2>
              <Link href="/sai/sessions" className="text-xs text-purple-300 hover:underline">
                Session Center →
              </Link>
            </div>
            <p className="mt-1 text-xs text-white/45">
              {objectiveFeed.length} agent event(s) — open Session Center for full records.
            </p>
          </section>
        )}

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Pending Strategic Approvals</h2>
          <p className="mt-1 text-xs text-white/45">{pendingApprovals.length} awaiting founder decision</p>
          <ul className="mt-3 space-y-2">
            {pendingApprovals.length === 0 ? (
              <li className="text-sm text-white/40">No pending approvals.</li>
            ) : (
              pendingApprovals.map((a) => (
                <li key={a.id} className="rounded-lg border border-white/5 p-3 text-sm text-white/70">
                  {a.projectName}: {a.title}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </SectionPage>
  );
}
