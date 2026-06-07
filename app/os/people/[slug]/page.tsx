import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, Card, ProgressBar } from "@/components/sai/ui";
import { employees, getEmployee, getMemory, tasks } from "@/lib/sai/data";

export function generateStaticParams() {
  return employees.map((e) => ({ slug: e.slug }));
}

export default async function EmployeeProfilePage(props: PageProps<"/os/people/[slug]">) {
  const { slug } = await props.params;
  const emp = getEmployee(slug);
  if (!emp) notFound();

  const assigned = tasks.filter((t) => t.assignee === slug);

  return (
    <div>
      <BackLink href="/os/people">All people</BackLink>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 text-xl font-bold text-white">
          {emp.initials}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{emp.name}</h1>
          <p className="text-sm text-white/60">
            {emp.role} · {emp.department}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/40">
            Joined {emp.joined} · Presence {emp.presence}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Tasks Completed" value={String(emp.metrics.tasksCompleted)} />
        <Stat label="On-time Rate" value={`${Math.round(emp.metrics.onTimeRate * 100)}%`} />
        <Stat label="Active Tasks" value={String(emp.metrics.activeTasks)} />
        <Stat label="Knowledge" value={String(emp.metrics.knowledgeContributions)} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-white">Responsibilities</h2>
          <ul className="mt-3 space-y-2">
            {emp.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/65">
                <span className="text-purple-300">›</span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-white">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {emp.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                {s}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-white">Current Work</h2>
          <ul className="mt-3 space-y-2">
            {emp.currentWork.map((w, i) => (
              <li key={i} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/70">
                {w}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-white">Completed Work</h2>
          <ul className="mt-3 space-y-2">
            {emp.completedWork.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60">
                <span className="text-emerald-300">✓</span>
                {w}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {assigned.length > 0 && (
        <Card className="mt-3">
          <h2 className="text-sm font-semibold text-white">Assigned Tasks</h2>
          <div className="mt-3 space-y-2">
            {assigned.map((t) => (
              <Link
                key={t.id}
                href={`/os/projects/${t.projectSlug}`}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-purple-400/30"
              >
                <span className="text-sm text-white/75">{t.title}</span>
                <span className="text-xs text-white/45">{t.stage}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-3">
        <h2 className="text-sm font-semibold text-white">Performance</h2>
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-white/50">
              <span>On-time delivery</span>
              <span>{Math.round(emp.metrics.onTimeRate * 100)}%</span>
            </div>
            <div className="mt-1">
              <ProgressBar value={emp.metrics.onTimeRate * 100} />
            </div>
          </div>
        </div>
      </Card>

      {emp.memory.length > 0 && (
        <Card className="mt-3">
          <h2 className="text-sm font-semibold text-white">Memory Records</h2>
          <div className="mt-3 space-y-2">
            {emp.memory.map((id) => {
              const m = getMemory(id);
              if (!m) return null;
              return (
                <Link
                  key={id}
                  href="/os/memory"
                  className="block rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-cyan-400/30"
                >
                  <p className="text-sm text-white/80">{m.title}</p>
                  <p className="text-xs text-white/45">{m.type} memory · {m.date}</p>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/45">{label}</p>
    </Card>
  );
}
