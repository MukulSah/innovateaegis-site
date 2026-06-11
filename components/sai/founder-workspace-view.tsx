"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Agent } from "@/lib/sai/types";
import type {
  AgentIntelligenceSection,
  ExecutiveAlert,
  FounderActivityEntry,
  FounderDashboard,
  FounderDiscussion,
  FounderInboxItem,
  FounderMeeting,
  FounderWorkspaceItem,
  FounderWorkspaceSection,
  FounderWorkspaceViewTab,
  IntelligenceCard,
} from "@/lib/sai/founder-workspace.types";
import { FOUNDER_SECTIONS, FOUNDER_VIEW_TABS } from "@/lib/sai/founder-workspace.types";

type Props = {
  founderName: string;
  dashboard: FounderDashboard;
  workspaceItems: FounderWorkspaceItem[];
  agents: Agent[];
  discussions: FounderDiscussion[];
  meetings: FounderMeeting[];
  inbox: FounderInboxItem[];
  timeline: FounderActivityEntry[];
  agentIntelligence: AgentIntelligenceSection[];
  isFounder: boolean;
};

const impactColor: Record<string, string> = {
  critical: "text-red-300 border-red-400/30 bg-red-500/10",
  high: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  medium: "text-blue-300 border-blue-400/30 bg-blue-500/10",
  low: "text-white/50 border-white/10 bg-white/5",
};

const severityColor: Record<string, string> = {
  critical: "border-red-400/40 bg-red-500/10",
  high: "border-amber-400/40 bg-amber-500/10",
  medium: "border-blue-400/40 bg-blue-500/10",
  low: "border-white/15 bg-white/5",
};

const trendIcon: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

function formatDate(iso: string | null) {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function IntelligenceCardView({
  card,
  showDecisionActions,
}: {
  card: IntelligenceCard;
  showDecisionActions?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-purple-400/20">
      <p className="text-[10px] uppercase tracking-wider text-purple-300/60">Raised by {card.raisedBy}</p>
      <p className="mt-1 font-medium text-white">{card.title}</p>
      <p className="mt-1 text-xs text-white/45 line-clamp-2">{card.description}</p>
      {card.riskAssessment && (
        <p className="mt-2 text-[11px] text-amber-200/70">Risk: {card.riskAssessment}</p>
      )}
      {card.recommendation && (
        <p className="mt-1 text-[11px] text-emerald-200/70">Recommendation: {card.recommendation}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] ${impactColor[card.impact] ?? impactColor.medium}`}
        >
          {card.impact} impact
        </span>
        <span className="text-[10px] text-white/35">{card.status.replace(/_/g, " ")}</span>
        {card.confidence != null && (
          <span className="text-[10px] text-emerald-300/70">{card.confidence}% confidence</span>
        )}
        {card.timeline && <span className="text-[10px] text-white/35">{card.timeline}</span>}
        {card.requiredInvestment && (
          <span className="text-[10px] text-white/35">Investment: {card.requiredInvestment}</span>
        )}
      </div>
      {showDecisionActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/sai/approvals"
            className="rounded-lg bg-emerald-600/80 px-3 py-1 text-[10px] text-white hover:bg-emerald-600"
          >
            Approve
          </Link>
          <Link
            href="/sai/approvals"
            className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] text-red-200"
          >
            Reject
          </Link>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-1 text-[10px] text-white/70"
          >
            Request Discussion
          </button>
          <Link href="/sai/memory" className="rounded-lg px-3 py-1 text-[10px] text-purple-300/80">
            View Analysis
          </Link>
        </div>
      )}
    </div>
  );
}

function ExecutiveBriefingSection({ dashboard }: { dashboard: FounderDashboard }) {
  const { briefing } = dashboard;
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/70">
        Executive Briefing
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">{briefing.greeting}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">
        {briefing.companyStatusSummary}
      </p>
      {briefing.todaysFocus.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Today&apos;s Focus</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {briefing.todaysFocus.map((focus, index) => (
              <li
                key={`focus-${index}-${focus}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
              >
                {focus}
              </li>
            ))}
          </ul>
        </div>
      )}
      {briefing.recommendedActions && briefing.recommendedActions.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Recommended Actions</p>
          <ul className="mt-2 space-y-1">
            {briefing.recommendedActions.map((action, index) => (
              <li key={`action-${index}-${action}`} className="text-xs text-emerald-200/70">
                {action}
              </li>
            ))}
          </ul>
          {briefing.generatedBy && (
            <p className="mt-2 text-[10px] text-white/30">
              Generated by {briefing.generatedBy}
              {briefing.generatedAt
                ? ` · ${new Date(briefing.generatedAt).toLocaleString()}`
                : ""}
            </p>
          )}
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {briefing.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center"
          >
            <p className="text-2xl font-bold text-white">{stat.count}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompanyHealthCenter({ dashboard }: { dashboard: FounderDashboard }) {
  const health = dashboard.companyHealth;
  return (
    <section className="mb-6 rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Company Health Center</h3>
          <p className="mt-1 text-xs text-white/45">
            Aggregated intelligence from all executive agents
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-emerald-300">{health.overallScore}</span>
          <p className="text-[10px] text-white/40">
            Overall {trendIcon[health.overallTrend]} {health.overallTrend}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {health.dimensions.map((dim) => (
          <div key={dim.key} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-white/40">{dim.label}</p>
              <span className="text-xs text-white/50">{trendIcon[dim.trend]}</span>
            </div>
            <p className="mt-1 text-xl font-semibold text-white">{dim.score}</p>
            {dim.contributors.length > 0 && (
              <p className="mt-2 text-[10px] text-white/35">
                Contributors: {dim.contributors.join(", ")}
              </p>
            )}
            {dim.recommendedActions.length > 0 && (
              <p className="mt-1 text-[10px] text-emerald-300/60 line-clamp-2">
                {dim.recommendedActions[0]}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutiveAlertsSection({ alerts }: { alerts: ExecutiveAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-300/70">
        Executive Alerts
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl border p-4 ${severityColor[alert.severity] ?? severityColor.medium}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  {alert.severity} · {alert.sourceAgent}
                </p>
                <p className="mt-1 font-medium text-white">{alert.title}</p>
                <p className="mt-1 text-xs text-white/50">Impact: {alert.impact}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/60">Required: {alert.requiredAction}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardTab({ dashboard }: { dashboard: FounderDashboard }) {
  return (
    <>
      <ExecutiveBriefingSection dashboard={dashboard} />
      <CompanyHealthCenter dashboard={dashboard} />
      <ExecutiveAlertsSection alerts={dashboard.executiveAlerts} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Current Priorities
          </h3>
          <div className="space-y-3">
            {dashboard.priorities.length === 0 && (
              <p className="text-sm text-white/35">
                Executive agents will surface priorities as they operate.
              </p>
            )}
            {dashboard.priorities.map((c) => (
              <IntelligenceCardView key={c.id} card={c} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Pending Decisions
          </h3>
          <div className="space-y-3">
            {dashboard.pendingDecisions.length === 0 && (
              <p className="text-sm text-white/35">No decisions awaiting founder approval.</p>
            )}
            {dashboard.pendingDecisions.map((c) => (
              <IntelligenceCardView key={c.id} card={c} showDecisionActions />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Strategic Opportunities
          </h3>
          <div className="space-y-3">
            {dashboard.opportunities.length === 0 && (
              <p className="text-sm text-white/35">Agents are scanning for strategic opportunities.</p>
            )}
            {dashboard.opportunities.map((c) => (
              <IntelligenceCardView key={c.id} card={c} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Executive Recommendations
          </h3>
          <div className="space-y-3">
            {dashboard.recommendations.length === 0 && (
              <p className="text-sm text-white/35">Recommendations will appear as agents analyze.</p>
            )}
            {dashboard.recommendations.map((c) => (
              <IntelligenceCardView key={c.id} card={c} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Upcoming Meetings
          </h3>
          <div className="space-y-3">
            {dashboard.upcomingMeetings.length === 0 && (
              <p className="text-sm text-white/35">No meetings scheduled.</p>
            )}
            {dashboard.upcomingMeetings.map((m) => (
              <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-white">{m.topic}</p>
                <p className="mt-1 text-xs text-white/45">
                  {m.participantNames.join(", ") || "Participants TBD"}
                </p>
                <p className="mt-1 text-[10px] text-white/35">
                  {formatDate(m.scheduledAt)} · {m.status.replace(/_/g, " ")}
                </p>
                {m.agenda && <p className="mt-2 text-xs text-white/40 line-clamp-2">{m.agenda}</p>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Active Discussions
          </h3>
          <div className="space-y-3">
            {dashboard.activeDiscussions.length === 0 && (
              <p className="text-sm text-white/35">Start an executive discussion with your team.</p>
            )}
            {dashboard.activeDiscussions.map((d) => (
              <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-white">{d.topic}</p>
                <p className="mt-1 text-xs text-white/45">
                  {d.participantNames.join(", ") || "No participants"}
                </p>
                <p className="mt-2 text-[10px] text-white/35">
                  {d.messageCount} messages · {d.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function DiscussionsTab({
  discussions,
  onStartDiscussion,
}: {
  discussions: FounderDiscussion[];
  onStartDiscussion: () => void;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Executive Discussion Center</h3>
          <p className="mt-1 text-sm text-white/45">
            Collaborate with your executive agents on strategic topics.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartDiscussion}
          className="rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-medium text-white hover:bg-purple-600"
        >
          Create Discussion
        </button>
      </div>
      <div className="space-y-3">
        {discussions.length === 0 && (
          <p className="text-sm text-white/35">No discussions yet. Create one to begin.</p>
        )}
        {discussions.map((d) => (
          <div key={d.id} className="rounded-xl border border-purple-400/15 bg-purple-500/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-white">{d.topic}</p>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                {d.status}
              </span>
            </div>
            {d.objective && <p className="mt-2 text-xs text-white/55">Objective: {d.objective}</p>}
            {d.context && <p className="mt-1 text-xs text-white/45">Context: {d.context}</p>}
            <p className="mt-2 text-xs text-white/45">
              Participants: {d.participantNames.join(", ") || "None"}
            </p>
            <p className="mt-2 text-[10px] text-white/35">
              {d.messageCount} messages · Priority: {d.priority ?? "medium"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingsTab({
  meetings,
  onScheduleMeeting,
}: {
  meetings: FounderMeeting[];
  onScheduleMeeting: () => void;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Meeting Center</h3>
          <p className="mt-1 text-sm text-white/45">
            Executive and strategic meetings. Completed meetings generate organizational memory.
          </p>
        </div>
        <button
          type="button"
          onClick={onScheduleMeeting}
          className="rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-medium text-white hover:bg-purple-600"
        >
          Schedule Meeting
        </button>
      </div>
      <div className="space-y-3">
        {meetings.length === 0 && (
          <p className="text-sm text-white/35">No meetings recorded. Schedule your first executive meeting.</p>
        )}
        {meetings.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-white">{m.topic}</p>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                {m.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/45">{m.meetingType.replace(/_/g, " ")}</p>
            <p className="mt-1 text-[10px] text-white/35">{formatDate(m.scheduledAt)}</p>
            {m.agenda && <p className="mt-2 text-xs text-white/50">{m.agenda}</p>}
            {m.summary && (
              <p className="mt-2 text-xs text-emerald-200/60">Summary: {m.summary}</p>
            )}
            <p className="mt-2 text-xs text-white/40">
              {m.participantNames.join(", ") || "No participants"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntelligenceTab({ sections }: { sections: AgentIntelligenceSection[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white">Agent Intelligence Panel</h3>
      <p className="mt-1 mb-6 text-sm text-white/45">
        Executive intelligence surfaced by your agent team. All data generated by agents.
      </p>
      <div className="space-y-6">
        {sections.map((section) => {
          const total =
            section.priorities.length +
            section.risks.length +
            section.opportunities.length +
            section.recommendations.length;
          if (total === 0) return null;
          return (
            <div key={section.agentId} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold text-white">{section.agentName}</p>
                <p className="text-xs text-purple-300/60">{section.agentRole}</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {section.priorities.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                      Strategic Priorities
                    </p>
                    <div className="space-y-2">
                      {section.priorities.map((c) => (
                        <IntelligenceCardView key={c.id} card={c} />
                      ))}
                    </div>
                  </div>
                )}
                {section.risks.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Risks</p>
                    <div className="space-y-2">
                      {section.risks.map((c) => (
                        <IntelligenceCardView key={c.id} card={c} />
                      ))}
                    </div>
                  </div>
                )}
                {section.opportunities.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                      Opportunities
                    </p>
                    <div className="space-y-2">
                      {section.opportunities.map((c) => (
                        <IntelligenceCardView key={c.id} card={c} />
                      ))}
                    </div>
                  </div>
                )}
                {section.recommendations.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                      Recommendations
                    </p>
                    <div className="space-y-2">
                      {section.recommendations.map((c) => (
                        <IntelligenceCardView key={c.id} card={c} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sections.every(
          (s) =>
            s.priorities.length +
              s.risks.length +
              s.opportunities.length +
              s.recommendations.length ===
            0,
        ) && (
          <p className="text-sm text-white/35">
            Agent intelligence will populate as your executive team operates.
          </p>
        )}
      </div>
    </div>
  );
}

function InboxTab({ inbox }: { inbox: FounderInboxItem[] }) {
  const unread = inbox.filter((i) => !i.isRead).length;
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Founder Inbox</h3>
        <p className="mt-1 text-sm text-white/45">
          Centralized executive communications — {unread} unread
        </p>
      </div>
      <div className="space-y-2">
        {inbox.length === 0 && (
          <p className="text-sm text-white/35">No executive communications yet.</p>
        )}
        {inbox.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border p-4 ${
              item.isRead ? "border-white/10 bg-white/[0.02]" : "border-purple-400/20 bg-purple-500/5"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link href={item.href} className="font-medium text-white hover:text-purple-200">
                {item.title}
              </Link>
              <span className="text-[10px] uppercase text-white/40">{item.category}</span>
            </div>
            <p className="mt-1 text-xs text-white/50">{item.message}</p>
            <p className="mt-2 text-[10px] text-white/35">
              {item.severity} · {formatDate(item.createdAt)}
            </p>
            <Link
              href={item.href}
              className="mt-3 inline-flex rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
            >
              {item.label} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineTab({ timeline }: { timeline: FounderActivityEntry[] }) {
  const grouped = timeline.reduce<Record<string, FounderActivityEntry[]>>((acc, entry) => {
    const day = new Date(entry.date).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  return (
    <div>
      <h3 className="text-lg font-semibold text-white">Founder Activity Timeline</h3>
      <p className="mt-1 mb-6 text-sm text-white/45">
        Everything important — sourced from Organizational Memory.
      </p>
      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-white/35">
          Activity will appear as decisions, meetings, and agent actions are recorded.
        </p>
      )}
      {Object.entries(grouped).map(([day, entries]) => (
        <div key={day} className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-purple-300/60">
            {day}
          </p>
          <div className="space-y-2 border-l border-white/10 pl-4">
            {entries.map((entry) => (
              <div key={entry.id} className="relative rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <span className="absolute -left-[21px] top-4 h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-[10px] uppercase text-white/40">{entry.type}</p>
                <p className="mt-1 text-sm font-medium text-white">{entry.title}</p>
                <p className="mt-1 text-xs text-white/45 line-clamp-2">{entry.summary}</p>
                {entry.participants.length > 0 && (
                  <p className="mt-1 text-[10px] text-white/35">
                    {entry.participants.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FounderWorkspaceView({
  founderName,
  dashboard,
  workspaceItems,
  agents,
  discussions,
  meetings,
  inbox,
  timeline,
  agentIntelligence,
  isFounder,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FounderWorkspaceViewTab>("dashboard");
  const [drawerSection, setDrawerSection] = useState<FounderWorkspaceSection | null>(null);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [discussionForm, setDiscussionForm] = useState({
    topic: "",
    objective: "",
    context: "",
    priority: "medium",
    selectedAgents: [] as string[],
  });

  const [meetingForm, setMeetingForm] = useState({
    topic: "",
    meetingType: "founder_strategy",
    agenda: "",
    scheduledAt: "",
    selectedAgents: [] as string[],
  });

  const [itemForm, setItemForm] = useState({ title: "", content: "", tags: "" });

  const sectionItems = drawerSection
    ? workspaceItems.filter((i) => i.section === drawerSection)
    : [];

  async function refresh() {
    router.refresh();
  }

  async function handleStartDiscussion(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const names = agents
      .filter((a) => discussionForm.selectedAgents.includes(a.id))
      .map((a) => a.name);
    await fetch("/api/sai/founder/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: discussionForm.topic,
        objective: discussionForm.objective,
        context: discussionForm.context,
        priority: discussionForm.priority,
        participantAgentIds: discussionForm.selectedAgents,
        participantNames: names,
      }),
    });
    setDiscussionOpen(false);
    setDiscussionForm({
      topic: "",
      objective: "",
      context: "",
      priority: "medium",
      selectedAgents: [],
    });
    setLoading(false);
    await refresh();
  }

  async function handleScheduleMeeting(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const names = agents
      .filter((a) => meetingForm.selectedAgents.includes(a.id))
      .map((a) => a.name);
    await fetch("/api/sai/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: meetingForm.topic,
        meetingType: meetingForm.meetingType,
        agenda: meetingForm.agenda,
        scheduledAt: meetingForm.scheduledAt || undefined,
        participantAgentIds: meetingForm.selectedAgents,
        participantNames: names,
      }),
    });
    setMeetingOpen(false);
    setMeetingForm({
      topic: "",
      meetingType: "founder_strategy",
      agenda: "",
      scheduledAt: "",
      selectedAgents: [],
    });
    setLoading(false);
    await refresh();
  }

  async function handleCreateItem(e: FormEvent) {
    e.preventDefault();
    if (!drawerSection) return;
    setLoading(true);
    await fetch("/api/sai/founder/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: drawerSection,
        title: itemForm.title,
        content: itemForm.content,
        tags: itemForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    setItemForm({ title: "", content: "", tags: "" });
    setLoading(false);
    await refresh();
  }

  if (!isFounder) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        Founder Workspace is restricted to the company founder.
      </div>
    );
  }

  const unreadInbox = inbox.filter((i) => !i.isRead).length;

  return (
    <div className="flex gap-0 overflow-hidden rounded-2xl border border-purple-400/15 bg-[#06061a]/80">
      {/* Founder Drawer — private workspace */}
      <aside className="w-52 shrink-0 border-r border-white/10 bg-[#050510]/90 p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Founder Drawer
        </p>
        <p className="mb-3 text-[10px] text-white/30">Private · {founderName}</p>
        <ul className="space-y-0.5">
          {FOUNDER_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setDrawerSection(drawerSection === s.id ? null : s.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  drawerSection === s.id
                    ? "bg-purple-500/15 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {/* HQ header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-purple-900/20 to-transparent px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/60">
            InnovateAegis Headquarters
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Executive Command Center</h2>
          <p className="mt-1 text-xs text-white/45">
            Your executive team is standing by with briefings, recommendations, and intelligence.
          </p>

          {/* Main navigation */}
          <nav className="mt-4 flex flex-wrap gap-1">
            {FOUNDER_VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  activeTab === tab.id
                    ? "bg-purple-600/80 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
                {tab.id === "inbox" && unreadInbox > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500/80 px-1.5 text-[9px]">
                    {unreadInbox}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "dashboard" && <DashboardTab dashboard={dashboard} />}
          {activeTab === "discussions" && (
            <DiscussionsTab discussions={discussions} onStartDiscussion={() => setDiscussionOpen(true)} />
          )}
          {activeTab === "meetings" && (
            <MeetingsTab meetings={meetings} onScheduleMeeting={() => setMeetingOpen(true)} />
          )}
          {activeTab === "intelligence" && <IntelligenceTab sections={agentIntelligence} />}
          {activeTab === "inbox" && <InboxTab inbox={inbox} />}
          {activeTab === "timeline" && <TimelineTab timeline={timeline} />}

          {/* Drawer section content */}
          {drawerSection && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white">
                {FOUNDER_SECTIONS.find((s) => s.id === drawerSection)?.label}
              </h3>
              <p className="mt-1 text-xs text-white/40">
                Private founder notes — not Company Brain or Organizational Memory.
              </p>
              <form onSubmit={handleCreateItem} className="mt-4 max-w-lg space-y-2">
                <input
                  value={itemForm.title}
                  onChange={(e) => setItemForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Title"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
                />
                <textarea
                  value={itemForm.content}
                  onChange={(e) => setItemForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Content"
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
                />
                <input
                  value={itemForm.tags}
                  onChange={(e) => setItemForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="Tags (comma-separated)"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-purple-600/80 px-4 py-2 text-xs text-white"
                >
                  Add Item
                </button>
              </form>
              <ul className="mt-4 space-y-2">
                {sectionItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-fuchsia-400/15 bg-fuchsia-500/5 p-3"
                  >
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-white/50">{item.content}</p>
                    {item.tags.length > 0 && (
                      <p className="mt-1 text-[10px] text-white/30">{item.tags.join(", ")}</p>
                    )}
                    <p className="mt-1 text-[10px] text-white/30">v{item.version}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Discussion modal */}
      {discussionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleStartDiscussion}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-purple-400/20 bg-[#0a0a24] p-6"
          >
            <h3 className="text-lg font-semibold text-white">Create Executive Discussion</h3>
            <input
              value={discussionForm.topic}
              onChange={(e) => setDiscussionForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="Topic"
              required
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <input
              value={discussionForm.objective}
              onChange={(e) => setDiscussionForm((f) => ({ ...f, objective: e.target.value }))}
              placeholder="Objective"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <textarea
              value={discussionForm.context}
              onChange={(e) => setDiscussionForm((f) => ({ ...f, context: e.target.value }))}
              placeholder="Context"
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <select
              value={discussionForm.priority}
              onChange={(e) => setDiscussionForm((f) => ({ ...f, priority: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </select>
            <p className="text-xs text-white/45">Select executive agents</p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {agents.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={discussionForm.selectedAgents.includes(a.id)}
                    onChange={(e) => {
                      setDiscussionForm((f) => ({
                        ...f,
                        selectedAgents: e.target.checked
                          ? [...f.selectedAgents, a.id]
                          : f.selectedAgents.filter((id) => id !== a.id),
                      }));
                    }}
                  />
                  {a.name} — {a.role}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDiscussionOpen(false)}
                className="text-xs text-white/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs text-white"
              >
                Start Discussion
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meeting modal */}
      {meetingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleScheduleMeeting}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-purple-400/20 bg-[#0a0a24] p-6"
          >
            <h3 className="text-lg font-semibold text-white">Schedule Executive Meeting</h3>
            <input
              value={meetingForm.topic}
              onChange={(e) => setMeetingForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="Topic"
              required
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <select
              value={meetingForm.meetingType}
              onChange={(e) => setMeetingForm((f) => ({ ...f, meetingType: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              <option value="founder_strategy">Founder Strategy</option>
              <option value="ceo_review">CEO Review</option>
              <option value="product_planning">Product Planning</option>
              <option value="architecture_review">Architecture Review</option>
              <option value="board">Board</option>
              <option value="team">Team</option>
              <option value="custom">Custom</option>
            </select>
            <textarea
              value={meetingForm.agenda}
              onChange={(e) => setMeetingForm((f) => ({ ...f, agenda: e.target.value }))}
              placeholder="Agenda"
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <input
              type="datetime-local"
              value={meetingForm.scheduledAt}
              onChange={(e) => setMeetingForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <p className="text-xs text-white/45">Select participants</p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {agents.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={meetingForm.selectedAgents.includes(a.id)}
                    onChange={(e) => {
                      setMeetingForm((f) => ({
                        ...f,
                        selectedAgents: e.target.checked
                          ? [...f.selectedAgents, a.id]
                          : f.selectedAgents.filter((id) => id !== a.id),
                      }));
                    }}
                  />
                  {a.name} — {a.role}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMeetingOpen(false)}
                className="text-xs text-white/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs text-white"
              >
                Schedule Meeting
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
