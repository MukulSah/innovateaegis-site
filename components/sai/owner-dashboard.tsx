import Link from "next/link";
import type { OwnerDashboard } from "@/lib/sai/owner-dashboard";

type Props = {
  data: OwnerDashboard;
};

function EmptyState() {
  return (
    <div className="enterprise-glass rounded-2xl border border-dashed border-white/15 p-10 text-center">
      <h2 className="text-lg font-semibold text-white">Start operating your company</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
        No projects yet. Create your first project, add employees, and set objectives to see actionable insights here.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/sai/projects"
          className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white"
        >
          Create Project
        </Link>
        <Link
          href="/sai/employees"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
        >
          Add Employees
        </Link>
        <Link
          href="/sai/integrations"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
        >
          Connect GitHub
        </Link>
      </div>
    </div>
  );
}

function Panel({
  title,
  count,
  href,
  children,
  empty,
}: {
  title: string;
  count: number;
  href?: string;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-white/40">{empty}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
      {href && count > 0 && (
        <Link href={href} className="mt-3 inline-block text-xs text-purple-300/80 hover:text-purple-200">
          View all →
        </Link>
      )}
    </section>
  );
}

export function OwnerDashboardPanel({ data }: Props) {
  if (data.isEmpty) return <EmptyState />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Projects At Risk"
        count={data.projectsAtRisk.length}
        href="/sai/projects"
        empty="All projects on track."
      >
        {data.projectsAtRisk.map((p) => (
          <li key={p.id} className="rounded-lg border border-amber-400/15 bg-amber-500/5 px-3 py-2">
            <p className="text-sm text-white">{p.name}</p>
            <p className="text-[10px] text-white/45">
              {p.status.replace(/_/g, " ")} · {p.progress}%
            </p>
          </li>
        ))}
      </Panel>

      <Panel
        title="Objectives Behind Schedule"
        count={data.objectivesBehind.length}
        href="/sai/projects"
        empty="No overdue objectives."
      >
        {data.objectivesBehind.map((o) => (
          <li key={o.id} className="rounded-lg border border-red-400/15 bg-red-500/5 px-3 py-2">
            <p className="text-sm text-white">{o.title}</p>
            <p className="text-[10px] text-white/45">
              Due {o.targetDate?.slice(0, 10) ?? "N/A"} · {o.status.replace(/_/g, " ")}
            </p>
          </li>
        ))}
      </Panel>

      <Panel
        title="Upcoming Releases"
        count={data.upcomingReleases.length}
        href="/sai/releases"
        empty="No releases scheduled this week."
      >
        {data.upcomingReleases.map((r) => (
          <li key={r.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-sm text-white">{r.version}</p>
            <p className="text-[10px] text-white/45">
              {r.project ?? "No project"} · {r.releaseDate?.slice(0, 10) ?? "TBD"}
            </p>
          </li>
        ))}
      </Panel>

      <Panel
        title="Critical Blockers"
        count={data.criticalBlockers.length}
        href="/sai/tasks"
        empty="No open blockers."
      >
        {data.criticalBlockers.map((b) => (
          <li key={b.id} className="rounded-lg border border-red-400/20 bg-red-500/5 px-3 py-2">
            <p className="text-sm text-white">{b.title}</p>
            <p className="text-[10px] text-white/45">
              {b.project}
              {b.assignee ? ` · ${b.assignee}` : ""}
              {b.dueDate ? ` · due ${b.dueDate.slice(0, 10)}` : ""}
            </p>
          </li>
        ))}
      </Panel>

      <Panel title="Open Decisions" count={data.openDecisions.length} href="/sai/memory" empty="No decisions recorded.">
        {data.openDecisions.map((d) => (
          <li key={d.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-sm text-white">{d.title}</p>
            <p className="text-[10px] text-white/45">{d.createdAt.slice(0, 10)}</p>
          </li>
        ))}
      </Panel>

      <Panel title="Recent Activity" count={data.recentActivity.length} empty="No activity yet.">
        {data.recentActivity.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
            <div>
              <p className="text-xs text-white/80">{a.title}</p>
              <p className="text-[10px] uppercase text-white/30">{a.type.replace(/_/g, " ")}</p>
            </div>
            <span className="shrink-0 text-[10px] text-white/30">{a.createdAt.slice(0, 10)}</span>
          </li>
        ))}
      </Panel>
    </div>
  );
}
