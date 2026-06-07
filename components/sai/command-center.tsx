import Link from "next/link";
import type { CommandCenterBriefing } from "@/lib/sai/command-center";

type Props = {
  briefing: CommandCenterBriefing;
};

const severityStyles: Record<string, string> = {
  critical: "border-red-400/30 bg-red-500/10",
  high: "border-amber-400/30 bg-amber-500/10",
  medium: "border-cyan-400/20 bg-cyan-500/5",
  low: "border-white/10 bg-white/[0.02]",
};

export function CommandCenter({ briefing }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-950/50 via-[#0a0a20] to-[#06061a] p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 sai-brain-pulse opacity-50" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-300/80">
              SAI Command Center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white md:text-2xl">
              What matters right now
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
              {briefing.summary}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-300">
              Proactive Intelligence
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <BriefingCard
            title="Requires Attention"
            count={briefing.requiresAttention.length}
            emptyText="No critical attention items"
          >
            {briefing.requiresAttention.map((item) => (
              <BriefingItem
                key={item.title}
                title={item.title}
                message={item.message}
                severity={item.severity}
                link={item.link}
              />
            ))}
          </BriefingCard>

          <BriefingCard title="Blocked" count={briefing.blocked.length} emptyText="No blockers">
            {briefing.blocked.map((item) => (
              <div key={item.title} className="rounded-lg border border-red-400/15 bg-red-500/5 px-3 py-2">
                <p className="text-xs font-medium text-white/85">{item.title}</p>
                <p className="text-[10px] text-white/40">
                  {item.project} · {item.assignee ?? "Unassigned"}
                </p>
              </div>
            ))}
          </BriefingCard>

          <BriefingCard
            title="Behind Schedule"
            count={briefing.behindSchedule.length}
            emptyText="All projects on track"
          >
            {briefing.behindSchedule.map((item) => (
              <div key={item.name} className="rounded-lg border border-amber-400/15 bg-amber-500/5 px-3 py-2">
                <p className="text-xs font-medium text-white/85">{item.name}</p>
                <p className="text-[10px] text-white/40">
                  {item.progress}% · {item.status.replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </BriefingCard>

          <BriefingCard
            title="Opportunities"
            count={briefing.opportunities.length}
            emptyText="No new opportunities"
          >
            {briefing.opportunities.map((item) => (
              <div key={item.title} className="rounded-lg border border-emerald-400/15 bg-emerald-500/5 px-3 py-2">
                <p className="text-xs font-medium text-emerald-200/90">{item.title}</p>
                <p className="text-[10px] text-white/45">{item.message}</p>
              </div>
            ))}
          </BriefingCard>

          <BriefingCard
            title="Decisions Needed"
            count={briefing.pendingDecisions.length}
            emptyText="No pending decisions"
          >
            {briefing.pendingDecisions.map((item) => (
              <div key={item.id} className="rounded-lg border border-purple-400/15 bg-purple-500/5 px-3 py-2">
                <p className="text-xs font-medium text-white/85">{item.title}</p>
                <p className="text-[10px] text-white/45">{item.question}</p>
              </div>
            ))}
          </BriefingCard>

          <BriefingCard
            title="Top Priorities"
            count={briefing.topPriorities.length}
            emptyText="Priorities being analyzed"
          >
            {briefing.topPriorities.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs font-medium text-white/85">{item.title}</p>
                <p className="text-[10px] text-white/45">{item.message}</p>
              </div>
            ))}
          </BriefingCard>
        </div>
      </div>
    </section>
  );
}

function BriefingCard({
  title,
  count,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">{title}</h3>
        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-200">
          {count}
        </span>
      </div>
      <div className="space-y-2">
        {count === 0 ? (
          <p className="text-[11px] text-white/35">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function BriefingItem({
  title,
  message,
  severity,
  link,
}: {
  title: string;
  message: string;
  severity: string;
  link?: string;
}) {
  const content = (
    <div className={`rounded-lg border px-3 py-2 ${severityStyles[severity] ?? severityStyles.medium}`}>
      <p className="text-xs font-medium text-white/85">{title}</p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">{message}</p>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }
  return content;
}
