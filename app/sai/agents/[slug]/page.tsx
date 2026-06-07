import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgentBySlug } from "@/lib/sai/queries";

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const statusDot: Record<string, string> = {
  active: "bg-emerald-400",
  busy: "bg-amber-400",
  idle: "bg-white/30",
};

export default async function AgentWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);

  if (!agent) notFound();

  const responsibilities = parseJsonArray(agent.responsibilities);
  const recommendations = parseJsonArray(agent.recommendations);
  const activeTasks = agent.assignedTasks.filter(
    (t) => !["released", "archived"].includes(t.stage),
  );
  const completedTasks = agent.assignedTasks.filter(
    (t) => ["released", "archived"].includes(t.stage),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/sai/agents" className="text-xs text-purple-300 hover:text-purple-200">
        ← All Agents
      </Link>

      <header className="enterprise-glass rounded-2xl border border-purple-400/15 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
              Agent Workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">{agent.name}</h1>
            <p className="mt-1 text-sm text-purple-300/80">{agent.role}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot[agent.status]}`} />
            <span className="text-lg font-bold text-white">{agent.performanceScore}</span>
          </div>
        </div>
        {agent.currentContext && (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">Current Context · </span>
            {agent.currentContext}
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Responsibilities</h2>
          <ul className="mt-3 space-y-1">
            {responsibilities.map((r) => (
              <li key={r} className="text-xs text-white/60">· {r}</li>
            ))}
          </ul>
        </section>

        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Performance</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="text-3xl font-bold text-white">{agent.performanceScore}</div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                style={{ width: `${agent.performanceScore}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-white/45">
            {activeTasks.length} active · {completedTasks.length} completed
          </p>
        </section>
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Assigned Work</h2>
        <ul className="mt-3 space-y-2">
          {activeTasks.length === 0 ? (
            <li className="text-xs text-white/45">No active assignments</li>
          ) : (
            activeTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <div>
                  <p className="text-sm text-white/80">{task.title}</p>
                  <p className="text-[10px] text-white/35">{task.project.name}</p>
                </div>
                <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/50">
                  {task.stage.replace(/_/g, " ")}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {recommendations.length > 0 && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Recommendations</h2>
          <ul className="mt-3 space-y-1">
            {recommendations.map((r) => (
              <li key={r} className="text-xs text-white/60">→ {r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Agent Memory</h2>
        <ul className="mt-3 space-y-2">
          {agent.memories.map((mem) => (
            <li key={mem.id} className="rounded-lg border border-white/5 px-3 py-2">
              <p className="text-sm text-white/80">{mem.title}</p>
              <p className="mt-1 text-xs text-white/45">{mem.content}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Activity History</h2>
        <ul className="mt-3 space-y-2">
          {agent.activityLogs.map((log) => (
            <li key={log.id} className="flex items-center justify-between text-xs text-white/55">
              <span>{log.title}</span>
              <span className="text-white/30">{log.createdAt.toISOString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
