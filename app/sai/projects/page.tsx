import { CreateProjectForm } from "@/components/sai/create-project-form";
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

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const user = sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value);

  const [projects, objectives] = await Promise.all([
    getProjects(),
    getObjectives(),
  ]);

  const firstProjectId = projects[0]?.id ?? "";
  const firstGraph = firstProjectId ? await getProjectExecutionGraph(firstProjectId) : null;

  const serializedObjectives = objectives.map((o) => ({
    ...o,
    targetDate: o.targetDate?.toISOString() ?? null,
  }));

  return (
    <SectionPage
      title="Projects"
      subtitle="Product execution"
      description="Create projects, set objectives, and track delivery from planning through release."
    >
      {user?.role === "owner" && (
        <div className="mb-6">
          <CreateProjectForm />
        </div>
      )}

      <ObjectivesPanel
        objectives={serializedObjectives}
        isOwner={user?.role === "owner"}
      />

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold text-white">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-white/40">No projects yet. Create your first project above.</p>
        ) : (
          projects.map((project) => (
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
          ))
        )}
      </div>

      {firstGraph && firstGraph.epics.length > 0 && (
        <div className="mt-8">
          <ExecutionGraph
            projectName={firstGraph.name}
            objectiveTitle={firstGraph.objectiveRef?.title}
            epics={firstGraph.epics}
            releases={firstGraph.releases}
          />
        </div>
      )}
    </SectionPage>
  );
}
