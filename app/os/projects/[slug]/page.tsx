import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Avatar,
  BackLink,
  Card,
  HealthBadge,
  ProgressBar,
} from "@/components/sai/ui";
import {
  TASK_STAGES,
  displayName,
  getEmployee,
  getProject,
  getAgent,
  projects,
  tasks,
} from "@/lib/sai/data";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

const artifactStyle: Record<string, string> = {
  done: "text-emerald-300 border-emerald-400/30",
  "in-progress": "text-amber-300 border-amber-400/30",
  pending: "text-white/40 border-white/15",
};

const priorityStyle: Record<string, string> = {
  critical: "text-rose-300",
  high: "text-amber-300",
  medium: "text-sky-300",
  low: "text-white/50",
};

export default async function ProjectDetailPage(props: PageProps<"/os/projects/[slug]">) {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) notFound();

  const projectTasks = tasks.filter((t) => t.projectSlug === slug);
  const stagesWithTasks = TASK_STAGES.filter((stage) =>
    projectTasks.some((t) => t.stage === stage),
  );

  return (
    <div>
      <BackLink href="/os/projects">All projects</BackLink>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
            {project.product}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
            {project.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">{project.summary}</p>
        </div>
        <HealthBadge status={project.health} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-white/45">Progress</p>
          <div className="mt-3 flex items-center gap-2">
            <ProgressBar value={project.progress} />
            <span className="text-sm font-semibold text-white">{project.progress}%</span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-white/45">Owner</p>
          <p className="mt-2 text-sm font-semibold text-white">{project.owner}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-white/45">Started</p>
          <p className="mt-2 text-sm font-semibold text-white">{project.start}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.1em] text-white/45">Target</p>
          <p className="mt-2 text-sm font-semibold text-white">{project.target}</p>
        </Card>
      </div>

      {/* SAI generated artifacts */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          SAI Execution Artifacts
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {project.artifacts.map((a) => (
            <Card key={a.label} className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{a.label}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${artifactStyle[a.status]}`}
                >
                  {a.status}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-white/55">{a.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Task lifecycle board */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          Task Lifecycle Board
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stagesWithTasks.map((stage) => {
            const stageTasks = projectTasks.filter((t) => t.stage === stage);
            return (
              <div key={stage} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">
                    {stage}
                  </span>
                  <span className="text-xs text-white/40">{stageTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {stageTasks.map((t) => (
                    <Card key={t.id} className="p-3">
                      <p className="text-sm text-white">{t.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-white/50">{displayName(t.assignee)}</span>
                        <span className={`text-[11px] font-semibold uppercase ${priorityStyle[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Risks + team */}
      <section className="mt-8 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold text-white">Risks</h3>
          <ul className="mt-3 space-y-2">
            {project.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60">
                <span className="text-amber-300">▲</span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white">Team & Agents</h3>
          <div className="mt-3 space-y-2">
            {project.team.map((slug) => {
              const emp = getEmployee(slug);
              if (!emp) return null;
              return (
                <Link
                  key={slug}
                  href={`/os/people/${slug}`}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-purple-400/30"
                >
                  <Avatar initials={emp.initials} />
                  <div>
                    <p className="text-sm text-white">{emp.name}</p>
                    <p className="text-xs text-white/45">{emp.role}</p>
                  </div>
                </Link>
              );
            })}
            {project.agents.map((slug) => {
              const agent = getAgent(slug);
              if (!agent) return null;
              return (
                <Link
                  key={slug}
                  href={`/os/agents/${slug}`}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-cyan-400/30"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-xs text-cyan-200">
                    AI
                  </span>
                  <div>
                    <p className="text-sm text-white">{agent.name}</p>
                    <p className="text-xs text-white/45">{agent.role}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
