import { CreateTaskForm } from "@/components/sai/create-task-form";
import { SectionPage } from "@/components/sai/section-page";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { getTasks } from "@/lib/sai/queries";

export default async function TasksPage() {
  const companyId = await getCompanyId();
  const [tasks, projects, employees] = await Promise.all([
    getTasks(),
    prisma.project.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId, role: "employee" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SectionPage
      title="Tasks"
      subtitle="Work management"
      description="Assign work, set priorities, track status, and manage blockers across all projects."
    >
      <CreateTaskForm projects={projects} employees={employees} />

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
        {tasks.length === 0 ? (
          <p className="p-6 text-sm text-white/40">No tasks yet. Create a project and objective, or add tasks directly.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Task</th>
                <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 md:table-cell">Project</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Priority</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Stage</th>
                <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:table-cell">Assignee</th>
                <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 lg:table-cell">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${task.isBlocker ? "bg-red-500/5" : ""}`}>
                  <td className="px-4 py-3 text-white/85">
                    {task.isBlocker && <span className="mr-1 text-red-400">●</span>}
                    {task.title}
                  </td>
                  <td className="hidden px-4 py-3 text-white/50 md:table-cell">{task.project.name}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{task.priority}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                      {task.stage.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-white/50 sm:table-cell">
                    {task.assignee?.name ?? task.agent?.name ?? "Unassigned"}
                  </td>
                  <td className="hidden px-4 py-3 text-white/40 lg:table-cell">
                    {task.dueDate?.toISOString().slice(0, 10) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SectionPage>
  );
}
