type TimelineEntry = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: Date;
  user: { name: string } | null;
  agent: { name: string } | null;
  project: { name: string } | null;
};

type Props = {
  entries: TimelineEntry[];
};

const typeIcons: Record<string, string> = {
  project_created: "▣",
  task_completed: "✓",
  task_created: "+",
  release_shipped: "▲",
  meeting_held: "◉",
  decision_made: "◆",
  objective_created: "◎",
  objective_achieved: "★",
  customer_feedback: "◫",
  knowledge_created: "📖",
  employee_assigned: "→",
  epic_created: "▤",
  feature_created: "▥",
};

const typeColors: Record<string, string> = {
  release_shipped: "border-emerald-400/20 bg-emerald-500/5",
  task_completed: "border-cyan-400/20 bg-cyan-500/5",
  decision_made: "border-amber-400/20 bg-amber-500/5",
  meeting_held: "border-purple-400/20 bg-purple-500/5",
  objective_achieved: "border-pink-400/20 bg-pink-500/5",
  customer_feedback: "border-blue-400/20 bg-blue-500/5",
};

export function TimelinePanel({ entries }: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-white">Organization Timeline</h2>
      <p className="mt-1 text-xs text-white/50">The living history of your company.</p>

      <div className="mt-4 space-y-2">
        {entries.map((entry) => {
          const icon = typeIcons[entry.type] ?? "·";
          const color = typeColors[entry.type] ?? "border-white/10 bg-white/[0.02]";
          const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <article
              key={entry.id}
              className={`flex gap-3 rounded-lg border p-3 ${color}`}
            >
              <span className="mt-0.5 text-sm">{icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-white/85">{entry.title}</p>
                  <span className="text-[10px] text-white/35">{date}</span>
                </div>
                {entry.description && (
                  <p className="mt-0.5 text-xs text-white/45">{entry.description}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-white/35">
                  <span className="uppercase">{entry.type.replace(/_/g, " ")}</span>
                  {entry.project && <span>· {entry.project.name}</span>}
                  {entry.user && <span>· {entry.user.name}</span>}
                  {entry.agent && <span>· {entry.agent.name}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
