import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, Card, ProgressBar } from "@/components/sai/ui";
import { agents, getAgent, getMemory, getProject } from "@/lib/sai/data";

export function generateStaticParams() {
  return agents.map((a) => ({ slug: a.slug }));
}

export default async function AgentProfilePage(props: PageProps<"/os/agents/[slug]">) {
  const { slug } = await props.params;
  const agent = getAgent(slug);
  if (!agent) notFound();

  return (
    <div>
      <BackLink href="/os/agents">All agents</BackLink>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-lg font-bold text-cyan-200">
          AI
        </span>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{agent.name}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {agent.status}
            </span>
          </div>
          <p className="text-sm text-white/60">{agent.role}</p>
          <p className="mt-1 text-sm text-white/50">{agent.tagline}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Tasks Handled" value={String(agent.metrics.tasksHandled)} />
        <Stat label="Accuracy" value={`${Math.round(agent.metrics.accuracy * 100)}%`} />
        <Stat label="Autonomy" value={`${Math.round(agent.metrics.autonomy * 100)}%`} />
        <Stat label="Decisions" value={String(agent.metrics.decisionsLogged)} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-white">Responsibilities</h2>
          <ul className="mt-3 space-y-2">
            {agent.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/65">
                <span className="text-cyan-300">›</span>
                {r}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-white">Performance</h2>
          <div className="mt-3 space-y-3">
            <Meter label="Accuracy" value={agent.metrics.accuracy * 100} />
            <Meter label="Autonomy" value={agent.metrics.autonomy * 100} />
          </div>
        </Card>
      </div>

      {agent.assignedProjects.length > 0 && (
        <Card className="mt-3">
          <h2 className="text-sm font-semibold text-white">Assigned Projects</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {agent.assignedProjects.map((p) => {
              const project = getProject(p);
              if (!project) return null;
              return (
                <Link
                  key={p}
                  href={`/os/projects/${p}`}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-purple-400/30"
                >
                  <span className="text-sm text-white/80">{project.name}</span>
                  <span className="text-xs text-white/45">{project.progress}%</span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mt-3">
        <h2 className="text-sm font-semibold text-white">Memory</h2>
        {agent.memory.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">No memory records yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {agent.memory.map((id) => {
              const m = getMemory(id);
              if (!m) return null;
              return (
                <Link
                  key={id}
                  href="/os/memory"
                  className="block rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-cyan-400/30"
                >
                  <p className="text-sm text-white/80">{m.title}</p>
                  <p className="mt-0.5 text-xs text-white/45">{m.summary}</p>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
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

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-white/50">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="mt-1">
        <ProgressBar value={value} />
      </div>
    </div>
  );
}
