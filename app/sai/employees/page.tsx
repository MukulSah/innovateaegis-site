import { SectionPage } from "@/components/sai/section-page";
import { employees } from "@/lib/sai/data";

export default function EmployeesPage() {
  return (
    <SectionPage
      title="Employees"
      subtitle="Human organization"
      description="Every employee has a profile with role, department, assigned work, activity history, performance metrics, and knowledge contributions."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <article
            key={employee.id}
            className="enterprise-glass rounded-xl border border-white/10 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/40 to-cyan-500/40 text-sm font-bold text-white">
                {employee.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{employee.name}</h3>
                <p className="text-xs text-white/50">{employee.role}</p>
              </div>
              <span className={`ml-auto h-2 w-2 rounded-full ${
                employee.status === "online" ? "bg-emerald-400" :
                employee.status === "busy" ? "bg-amber-400" : "bg-white/20"
              }`} />
            </div>
            <div className="mt-4 space-y-1 text-xs text-white/45">
              <p>Department: <span className="text-white/70">{employee.department}</span></p>
              <p>Current work: <span className="text-white/70">{employee.currentWork}</span></p>
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}
