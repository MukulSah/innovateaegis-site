"use client";

import Link from "next/link";
import type { Agent } from "@/lib/sai/types";
import type {
  AgentIntelligenceSection,
  FounderActivityEntry,
  FounderDashboard,
  FounderInboxItem,
} from "@/lib/sai/founder-workspace.types";
import type { FounderApprovalCard } from "@/lib/sai/founder-approvals";
import type { FounderSessionTimelineData } from "@/lib/sai/founder-timeline";
import { PendingApprovalsBanner } from "@/components/sai/pending-approvals-banner";
import { FounderCommandConsole } from "@/components/sai/founder-command-console";
import {
  FounderAttentionRequired,
  FounderExecutiveOffices,
} from "@/components/sai/founder-executive-offices";
import { FounderIntelligenceCard } from "@/components/sai/founder-intelligence-card";
import { FounderStrategicSessions } from "@/components/sai/founder-strategic-sessions";

type Props = {
  dashboard: FounderDashboard;
  agents: Agent[];
  inbox: FounderInboxItem[];
  timeline: FounderActivityEntry[];
  agentIntelligence: AgentIntelligenceSection[];
  pendingApprovals: FounderApprovalCard[];
  sessionTimeline: FounderSessionTimelineData | null;
  isFounder: boolean;
};

function SectionRule() {
  return <div className="border-t border-white/10" aria-hidden />;
}

function OrganizationPulse({
  dashboard,
  agents,
  pendingCount,
}: {
  dashboard: FounderDashboard;
  agents: Agent[];
  pendingCount: number;
}) {
  const stats = dashboard.briefing.stats;
  const activeAgents = agents.filter((a) => a.status === "busy" || a.status === "idle").length;

  const items = [
    { label: "Agents", value: stats.find((s) => /agent/i.test(s.label))?.count ?? activeAgents },
    { label: "Projects", value: stats.find((s) => /project/i.test(s.label))?.count ?? "—" },
    { label: "Sessions", value: stats.find((s) => /session/i.test(s.label))?.count ?? "—" },
    { label: "Approvals", value: pendingCount },
  ];

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Organization Pulse
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 text-center"
          >
            <p className="text-2xl font-bold text-white">{item.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutiveActivityFeed({ timeline }: { timeline: FounderActivityEntry[] }) {
  const recent = timeline.slice(0, 8);
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Executive Activity Feed
      </h3>
      {recent.length === 0 ? (
        <p className="text-sm text-white/35">Activity appears as executives and agents operate.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((entry) => (
            <li
              key={entry.id}
              className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5"
            >
              <span className="shrink-0 font-mono text-[10px] text-purple-300/60">
                {new Date(entry.date).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-white/85">{entry.title}</p>
                <p className="text-[11px] text-white/45 line-clamp-1">{entry.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FounderWorkspaceView({
  dashboard,
  agents,
  inbox,
  timeline,
  agentIntelligence,
  pendingApprovals,
  sessionTimeline,
  isFounder,
}: Props) {
  if (!isFounder) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        Founder Workspace is restricted to the company founder.
      </div>
    );
  }

  const unreadInbox = inbox.filter((i) => !i.isRead).length;
  const activeSessions = sessionTimeline?.activeSessions ?? [];
  const awaitingSessions = sessionTimeline?.awaitingApprovalSessions ?? [];
  const scheduledSessions = sessionTimeline?.scheduledSessions ?? [];
  const blockedSessions = sessionTimeline?.blockedSessions ?? [];
  const reviewSessions = sessionTimeline?.needsFounderReview ?? [];
  const recentCompleted = (sessionTimeline?.completedSessions ?? []).slice(0, 5);
  const allStrategicSessions = [
    ...activeSessions,
    ...awaitingSessions,
    ...scheduledSessions,
    ...blockedSessions,
    ...reviewSessions,
    ...recentCompleted,
  ];

  const attentionItems = [
    ...dashboard.pendingDecisions.slice(0, 2).map((d) => ({
      label: "Decision",
      detail: d.title,
      severity: d.impact,
    })),
    ...inbox
      .filter((i) => !i.isRead)
      .slice(0, 2)
      .map((i) => ({
        label: i.category,
        detail: i.title,
        severity: i.severity,
      })),
  ];

  return (
    <>
      <div className="space-y-8 pb-20">
        <PendingApprovalsBanner approvals={pendingApprovals} />

        <FounderCommandConsole agents={agents} sessionTimeline={sessionTimeline} />

        <SectionRule />

        <FounderExecutiveOffices
          dashboard={dashboard}
          agentIntelligence={agentIntelligence}
          sessionCount={allStrategicSessions.length}
        />

        <SectionRule />

        <FounderAttentionRequired
          alerts={dashboard.executiveAlerts}
          pendingDecisionCount={dashboard.pendingDecisions.length}
          approvalCount={pendingApprovals.length}
          items={attentionItems}
        />

        <SectionRule />

        <FounderStrategicSessions
          sessions={allStrategicSessions}
          pendingApprovals={sessionTimeline?.awaitingFounderApproval ?? []}
        />

        <SectionRule />

        <OrganizationPulse
          dashboard={dashboard}
          agents={agents}
          pendingCount={pendingApprovals.length}
        />

        <SectionRule />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Founder Inbox
              </h3>
              <p className="mt-1 text-xs text-white/45">
                Executive mail — {unreadInbox} unread
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {inbox.length === 0 ? (
              <p className="text-sm text-white/35">No executive communications yet.</p>
            ) : (
              inbox.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`block rounded-xl border p-3 transition-colors hover:border-purple-400/30 ${
                    item.isRead
                      ? "border-white/10 bg-white/[0.02]"
                      : "border-purple-400/20 bg-purple-500/5"
                  }`}
                >
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/50 line-clamp-1">{item.message}</p>
                  <p className="mt-1 text-[10px] text-white/35">
                    {item.category} · {formatDate(item.createdAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <SectionRule />

        <ExecutiveActivityFeed timeline={timeline} />

        {dashboard.pendingDecisions[0] && (
          <>
            <SectionRule />
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                Latest Decision
              </h3>
              <FounderIntelligenceCard
                card={dashboard.pendingDecisions[0]}
                showDecisionActions
              />
            </section>
          </>
        )}
      </div>
    </>
  );
}
