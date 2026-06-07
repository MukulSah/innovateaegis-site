type TaskNode = {
  id: string;
  title: string;
  stage: string;
  assignee: { name: string } | null;
  agent: { name: string } | null;
};

type FeatureNode = {
  id: string;
  title: string;
  tasks: TaskNode[];
};

type EpicNode = {
  id: string;
  title: string;
  features: FeatureNode[];
};

type Props = {
  projectName: string;
  objectiveTitle?: string | null;
  epics: EpicNode[];
  releases: Array<{ version: string; status: string }>;
};

export function ExecutionGraph({ projectName, objectiveTitle, epics, releases }: Props) {
  return (
    <div className="enterprise-glass rounded-xl border border-white/10 p-5">
      <h3 className="text-sm font-semibold text-white">Execution Graph — {projectName}</h3>
      {objectiveTitle && (
        <p className="mt-1 text-xs text-purple-300/70">Objective → {objectiveTitle}</p>
      )}

      <div className="mt-4 space-y-4">
        {epics.map((epic) => (
          <div key={epic.id} className="border-l-2 border-purple-500/30 pl-4">
            <p className="text-sm font-medium text-white">▣ Epic: {epic.title}</p>
            {epic.features.map((feature) => (
              <div key={feature.id} className="mt-2 ml-4 border-l border-cyan-500/20 pl-3">
                <p className="text-xs font-medium text-cyan-300/80">→ Feature: {feature.title}</p>
                {feature.tasks.map((task) => (
                  <div key={task.id} className="mt-1 ml-4 flex items-center gap-2 text-[11px] text-white/55">
                    <span>↓</span>
                    <span className="text-white/75">{task.title}</span>
                    <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase">
                      {task.stage.replace(/_/g, " ")}
                    </span>
                    {(task.assignee || task.agent) && (
                      <span className="text-white/35">
                        ({task.assignee?.name ?? task.agent?.name})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {releases.length > 0 && (
          <div className="border-l-2 border-emerald-500/30 pl-4">
            <p className="text-sm font-medium text-emerald-300">▲ Releases</p>
            {releases.map((r) => (
              <p key={r.version} className="mt-1 ml-4 text-xs text-white/55">
                {r.version} — {r.status}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
