import Link from "next/link";
import type { AIAgent, Employee, Project } from "@/lib/sai/types";

type Props = {
  projects: Project[];
  employees: Employee[];
  agents: AIAgent[];
};

const statusColors: Record<Project["status"], string> = {
  on_track: "text-emerald-400",
  at_risk: "text-amber-400",
  delayed: "text-red-400",
  completed: "text-cyan-400",
};

const statusLabels: Record<Project["status"], string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  delayed: "Delayed",
  completed: "Completed",
};

export function QuickPanels({ projects, employees, agents }: Props) {
  const activeAgents = agents.filter((a) => a.status === "active" || a.status === "busy");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Active Projects</h3>
          <Link href="/sai/projects" className="text-[10px] font-medium uppercase tracking-[0.1em] text-purple-300 hover:text-purple-200">
            View all
          </Link>
        </div>
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{project.name}</p>
                <span className={`shrink-0 text-[10px] font-semibold uppercase ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-white/40">
                {project.tasksCompleted}/{project.tasksTotal} tasks · {project.progress}%
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Team Online</h3>
          <Link href="/sai/employees" className="text-[10px] font-medium uppercase tracking-[0.1em] text-purple-300 hover:text-purple-200">
            View all
          </Link>
        </div>
        <ul className="space-y-2">
          {employees.filter((e) => e.status !== "offline").map((employee) => (
            <li key={employee.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${employee.status === "busy" ? "bg-amber-400" : "bg-emerald-400"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{employee.name}</p>
                <p className="truncate text-[10px] text-white/40">{employee.currentWork}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">AI Agents Active</h3>
          <Link href="/sai/agents" className="text-[10px] font-medium uppercase tracking-[0.1em] text-purple-300 hover:text-purple-200">
            View all
          </Link>
        </div>
        <ul className="space-y-2">
          {activeAgents.slice(0, 6).map((agent) => (
            <li key={agent.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/[0.03]">
              <div>
                <p className="text-sm text-white">{agent.name}</p>
                <p className="text-[10px] text-white/40">{agent.role}</p>
              </div>
              <span className="text-xs font-bold text-purple-300">{agent.performanceScore}</span>
            </li>
          ))}
          {activeAgents.length > 6 && (
            <li className="px-2 text-[10px] text-white/35">
              +{activeAgents.length - 6} more agents active
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
