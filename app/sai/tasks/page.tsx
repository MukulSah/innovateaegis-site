import { SectionPage } from "@/components/sai/section-page";

const sampleTasks = [
  { id: "t1", title: "Implement deployment rollback mechanism", project: "Sentra", stage: "Code Review", assignee: "Arjun Mehta" },
  { id: "t2", title: "Multi-site dashboard API endpoints", project: "FaceNova v2", stage: "In Progress", assignee: "Karthik Nair" },
  { id: "t3", title: "Premium tier pricing page", project: "HYGYR", stage: "Testing", assignee: "Priya Sharma" },
  { id: "t4", title: "API contract definitions", project: "Unite", stage: "Planning", assignee: "Solution Architect Agent" },
  { id: "t5", title: "Regression test suite v2", project: "FaceNova v2", stage: "Testing", assignee: "Rahul Verma" },
  { id: "t6", title: "CI/CD pipeline optimization", project: "Sentra", stage: "In Progress", assignee: "Sneha Patel" },
];

export default function TasksPage() {
  return (
    <SectionPage
      title="Tasks"
      subtitle="Work lifecycle"
      description="Every task flows through the complete lifecycle from backlog to knowledge archival. The Team Orchestrator Agent routes work and ensures nothing gets stuck."
    >
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Task</th>
              <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 md:table-cell">Project</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Stage</th>
              <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:table-cell">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {sampleTasks.map((task) => (
              <tr key={task.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white/85">{task.title}</td>
                <td className="hidden px-4 py-3 text-white/50 md:table-cell">{task.project}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                    {task.stage}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-white/50 sm:table-cell">{task.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPage>
  );
}
