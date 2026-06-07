import Link from "next/link";
import { SectionPage } from "@/components/sai/section-page";
import { getAIAgents } from "@/lib/sai/queries";

const statusDot: Record<string, string> = {
  active: "bg-emerald-400",
  busy: "bg-amber-400",
  idle: "bg-white/30",
};

export default async function AgentsPage() {
  const agents = await getAIAgents();

  return (
    <SectionPage
      title="AI Agents"
      subtitle="Digital employees"
      description="Agents act as digital employees with names, roles, responsibilities, memory, performance metrics, and assigned projects. They collaborate with human employees."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/sai/agents/${agent.id}`}
            className="enterprise-glass rounded-xl border border-white/10 p-5 transition-colors hover:border-purple-400/25"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusDot[agent.status]}`} />
                <span className="text-xs font-bold text-purple-300">{agent.performanceScore}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-purple-300/70">{agent.role}</p>
            <ul className="mt-3 space-y-1">
              {agent.responsibilities.slice(0, 3).map((r) => (
                <li key={r} className="text-xs text-white/50">· {r}</li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-white/35">
              {agent.assignedProjects} project{agent.assignedProjects !== 1 ? "s" : ""} assigned · Open workspace →
            </p>
          </Link>
        ))}
      </div>
    </SectionPage>
  );
}
