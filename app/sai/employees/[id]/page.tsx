import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployeeById } from "@/lib/sai/queries";

function parseSkills(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) notFound();

  const skills = parseSkills(employee.skills);
  const activeTasks = employee.assignedTasks.filter(
    (t) => !["released", "archived"].includes(t.stage),
  );
  const completedTasks = employee.assignedTasks.filter(
    (t) => ["released", "archived"].includes(t.stage),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/sai/employees" className="text-xs text-purple-300 hover:text-purple-200">
        ← All Employees
      </Link>

      <header className="enterprise-glass rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/40 to-cyan-500/40 text-lg font-bold text-white">
            {employee.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{employee.name}</h1>
            <p className="text-sm text-white/50">{employee.title} · {employee.department?.name}</p>
          </div>
          <span className={`ml-auto h-3 w-3 rounded-full ${
            employee.status === "online" ? "bg-emerald-400" :
            employee.status === "busy" ? "bg-amber-400" : "bg-white/20"
          }`} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-white">{employee.workload}%</p>
          <p className="text-xs text-white/45">Workload</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-white">{employee.performanceScore}</p>
          <p className="text-xs text-white/45">Performance</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-white">{activeTasks.length}</p>
          <p className="text-xs text-white/45">Active Tasks</p>
        </div>
      </div>

      {skills.length > 0 && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{s}</span>
            ))}
          </div>
        </section>
      )}

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Current Work</h2>
        <p className="mt-2 text-sm text-white/60">{employee.currentWork ?? "No active assignment"}</p>
        <ul className="mt-3 space-y-2">
          {activeTasks.map((task) => (
            <li key={task.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2 text-xs">
              <span className="text-white/75">{task.title}</span>
              <span className="text-white/35">{task.project.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Completed Work</h2>
        <ul className="mt-3 space-y-1">
          {completedTasks.slice(0, 8).map((task) => (
            <li key={task.id} className="text-xs text-white/50">✓ {task.title}</li>
          ))}
        </ul>
      </section>

      {employee.knowledgeRecords.length > 0 && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Knowledge Contributions</h2>
          <ul className="mt-3 space-y-2">
            {employee.knowledgeRecords.map((k) => (
              <li key={k.id} className="text-xs text-white/55">{k.title}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Activity Timeline</h2>
        <ul className="mt-3 space-y-2">
          {employee.activityLogs.map((log) => (
            <li key={log.id} className="flex justify-between text-xs text-white/50">
              <span>{log.title}</span>
              <span className="text-white/30">{log.createdAt.toISOString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
