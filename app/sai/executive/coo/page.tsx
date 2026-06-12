import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentFeed } from "@/components/sai/agent-feed";
import { SectionPage } from "@/components/sai/section-page";
import { AiReliabilityPanel } from "@/components/sai/ai-reliability-panel";
import { SessionCommandCenter } from "@/components/sai/session-command-center";
import { getSessionAgentFeed } from "@/lib/sai/agent-feed";
import { findAgentForRole, getAgents } from "@/lib/sai/agents";
import { getCooDashboard } from "@/lib/sai/coo-dashboard";
import { computeSessionHealth } from "@/lib/sai/execution-health";
import { computeStrategicHealth } from "@/lib/sai/strategic-health";
import { getSessionHandoffs } from "@/lib/sai/coo-routing";
import { getWorkflowApprovals } from "@/lib/sai/governance";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CooWorkspacePage() {
  if (!isSupabaseConfigured()) notFound();

  const agents = await getAgents();
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo) notFound();

  const dashboard = await getCooDashboard(coo.id);
  const primarySession = dashboard.activeSessions[0] ?? dashboard.sessionQueue[0];

  let feed: Awaited<ReturnType<typeof getSessionAgentFeed>> = [];
  let sessionHealth = null;
  let strategicHealth = null;
  let sessionApprovals: Awaited<ReturnType<typeof getWorkflowApprovals>> = [];
  let handoffs: Awaited<ReturnType<typeof getSessionHandoffs>> = [];

  if (primarySession) {
    feed = await getSessionAgentFeed(primarySession.id, primarySession.projectName);
    [sessionHealth, strategicHealth, sessionApprovals, handoffs] = await Promise.all([
      computeSessionHealth(primarySession.id),
      computeStrategicHealth(primarySession.id),
      getWorkflowApprovals({ workflowId: primarySession.id, status: "pending" }),
      getSessionHandoffs(primarySession.id),
    ]);
  }

  return (
    <SectionPage
      title="COO Agent Workspace"
      subtitle="Executive Office · Session Owner & Execution Authority"
      description="COO owns active sessions, routes agents, monitors execution health, and handles escalations."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/40">Active Sessions</p>
            <p className="text-2xl font-bold text-white">{dashboard.activeSessions.length}</p>
          </div>
          <div className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/40">Blocked Sessions</p>
            <p className="text-2xl font-bold text-red-300">{dashboard.blockedSessions.length}</p>
          </div>
          <div className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/40">Execution Health</p>
            <p className="text-2xl font-bold text-emerald-300">{dashboard.health.score}%</p>
          </div>
          <div className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-[10px] text-white/40">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-200">{dashboard.health.pendingApprovals}</p>
          </div>
        </div>

        <AiReliabilityPanel reliability={dashboard.aiReliability} />

        {primarySession && sessionHealth && (
          <SessionCommandCenter
            session={primarySession}
            health={sessionHealth}
            strategicHealth={strategicHealth}
            pendingApprovals={sessionApprovals}
            handoffs={handoffs}
            blockedItems={dashboard.blockedSessions.map(
              (s) => `Session #${s.sessionNumber}: ${s.objective}`,
            )}
          />
        )}

        {dashboard.sessionQueue.length > 0 && (
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h2 className="text-sm font-semibold text-white">Session Queue</h2>
            <ul className="mt-3 space-y-2">
              {dashboard.sessionQueue.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/5 p-3 text-sm text-white/75">
                  Session #{s.sessionNumber} — {s.objective}
                  <span className="ml-2 text-xs text-white/40">{s.sessionStatus}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {dashboard.escalations.length > 0 && (
          <section className="enterprise-glass rounded-xl border border-red-400/20 p-5">
            <h2 className="text-sm font-semibold text-white">Escalations</h2>
            <ul className="mt-3 space-y-2">
              {dashboard.escalations.map((e) => (
                <li key={e.id} className="rounded-lg border border-red-400/10 p-3 text-sm text-white/75">
                  {e.issue}
                  <span className="ml-2 text-xs text-white/40">
                    Owner: {e.owner} · {e.priority}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {primarySession && (
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Session Activity</h2>
              <Link
                href={`/sai/workflows/${primarySession.id}`}
                className="text-xs text-purple-300 hover:underline"
              >
                Open session →
              </Link>
            </div>
            <div className="mt-4">
              <AgentFeed
                items={feed}
                sessionLabel={`Session #${primarySession.sessionNumber}`}
                showApprovalActions={false}
              />
            </div>
          </section>
        )}

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">All Owned Sessions</h2>
          <ul className="mt-3 space-y-2">
            {[...dashboard.activeSessions, ...dashboard.blockedSessions].length === 0 ? (
              <li className="text-sm text-white/40">No sessions owned by COO yet.</li>
            ) : (
              [...dashboard.activeSessions, ...dashboard.blockedSessions].map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/5 p-3 text-sm">
                  <span className="text-white/80">
                    #{s.sessionNumber} {s.projectName} — {s.objective}
                  </span>
                  <Link href={`/sai/workflows/${s.id}`} className="text-xs text-purple-300 hover:underline">
                    View
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </SectionPage>
  );
}
