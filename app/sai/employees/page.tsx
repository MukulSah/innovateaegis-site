import Link from "next/link";
import { SectionPage } from "@/components/sai/section-page";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

function parseSkills(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default async function EmployeesPage() {
  const companyId = await getCompanyId();
  const employees = await prisma.user.findMany({
    where: { companyId, role: "employee" },
    include: {
      department: true,
      assignedTasks: {
        where: { stage: { notIn: ["released", "archived"] } },
        include: { project: { select: { name: true } } },
      },
      knowledgeRecords: { take: 3, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <SectionPage
      title="Employees"
      subtitle="Human organization"
      description="Every employee has a profile with role, department, assigned work, activity history, performance metrics, and knowledge contributions."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => {
          const skills = parseSkills(employee.skills);
          const activeTasks = employee.assignedTasks.length;

          return (
            <Link
              key={employee.id}
              href={`/sai/employees/${employee.id}`}
              className="enterprise-glass rounded-xl border border-white/10 p-5 transition-colors hover:border-purple-400/25"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/40 to-cyan-500/40 text-sm font-bold text-white">
                  {employee.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{employee.name}</h3>
                  <p className="text-xs text-white/50">{employee.title}</p>
                </div>
                <span className={`ml-auto h-2 w-2 rounded-full ${
                  employee.status === "online" ? "bg-emerald-400" :
                  employee.status === "busy" ? "bg-amber-400" : "bg-white/20"
                }`} />
              </div>
              <div className="mt-4 space-y-1 text-xs text-white/45">
                <p>Department: <span className="text-white/70">{employee.department?.name ?? "General"}</span></p>
                <p>Workload: <span className="text-white/70">{employee.workload}%</span> · {activeTasks} active tasks</p>
                <p>Performance: <span className="text-white/70">{employee.performanceScore}</span></p>
                <p>Current: <span className="text-white/70">{employee.currentWork ?? "N/A"}</span></p>
              </div>
              {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {skills.slice(0, 3).map((s) => (
                    <span key={s} className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40">{s}</span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </SectionPage>
  );
}
