import { ExecutionGraph } from "@/components/sai/execution-graph";
import { ObjectivesPanel } from "@/components/sai/objectives-panel";
import { SectionPage } from "@/components/sai/section-page";
import { cookies } from "next/headers";
import { sessionFromCookie, SAI_USER_COOKIE } from "@/lib/sai/auth";
import { getObjectives, getProjectExecutionGraph, getProjects } from "@/lib/sai/queries";

const statusStyles: Record<string, string> = {
  on_track: "text-emerald-400 bg-emerald-500/10 border-emerald-400/20",
  at_risk: "text-amber-400 bg-amber-500/10 border-amber-400/20",
  delayed: "text-red-400 bg-red-500/10 border-red-400/20",
  completed: "text-cyan-400 bg-cyan-500/10 border-cyan-400/20",
};

const taskStages = [
  "Backlog", "Planning", "Ready", "Assigned", "In Progress",
  "Code Review", "Testing", "Approval", "Released", "Knowledge Archived",
];

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const user = sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value);

  const [projects, objectives] = await Promise.all([
    getProjects(),
    getObjectives(),
  ]);

  const sentraGraph = await getProjectExecutionGraph(
    projects.find((p) => p.name.includes("Sentra"))?.id ?? projects[0]?.id ?? "",
  );

  const serializedObjectives = objectives.map((o) => ({
    ...o,
    targetDate: o.targetDate?.toISOString() ?? null,
  }));

  return (
    <SectionPage
      title="Projects"
      subtitle="Objective-driven execution"
      description="The owner creates objectives. SAI automatically generates requirements, architecture, tasks, assignments, test plans, and tracks delivery through release."
    >
      <ObjectivesPanel
        objectives={serializedObjectives}
        isOwner={user?.role === "owner"}
      />

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold text-white">Active Projects</h2>
        {projects.map((project) => (
          <article
            key={project.id}
            className="enterprise-glass rounded-xl border border-white/10 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                <p className="mt-1 text-sm text-white/55">{project.objective}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${statusStyles[project.status]}`}>
                {project.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-white/50">
              <span>Lead: <span className="text-white/80">{project.lead}</span></span>
              <span>Tasks: <span className="text-white/80">{project.tasksCompleted}/{project.tasksTotal}</span></span>
              <span>Progress: <span className="text-white/80">{project.progress}%</span></span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </article>
        ))}
      </div>

      {sentraGraph && (
        <div className="mt-8">
          <ExecutionGraph
            projectName={sentraGraph.name}
            objectiveTitle={sentraGraph.objectiveRef?.title}
            epics={sentraGraph.epics}
            releases={sentraGraph.releases}
          />
        </div>
      )}

      <div className="mt-8 enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Task Lifecycle</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {taskStages.map((stage, i) => (
            <span key={stage} className="flex items-center gap-2">
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                {stage}
              </span>
              {i < taskStages.length - 1 && <span className="text-white/20">↓</span>}
            </span>
          ))}
        </div>
      </div>
    </SectionPage>
  );
}
