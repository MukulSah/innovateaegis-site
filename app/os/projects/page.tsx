import Link from "next/link";
import { ObjectiveCreator } from "@/components/sai/objective-creator";
import {
  Card,
  HealthBadge,
  ProgressBar,
  SectionHeading,
} from "@/components/sai/ui";
import { projects, TASK_STAGES } from "@/lib/sai/data";

const statusStyle: Record<string, string> = {
  planning: "text-sky-300 border-sky-400/30",
  active: "text-emerald-300 border-emerald-400/30",
  "at-risk": "text-rose-300 border-rose-400/30",
  shipped: "text-violet-300 border-violet-400/30",
};

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Execution"
        title="Projects & Objectives"
        description="The owner creates objectives. SAI creates requirements, plans, architecture, tasks, assignments, test plans, tracks progress, verifies completion, deploys releases, and stores knowledge."
      />

      <ObjectiveCreator />

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          Active Projects
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/os/projects/${p.slug}`}>
              <Card className="h-full transition-colors hover:border-purple-400/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                      {p.product}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-white">{p.name}</h3>
                  </div>
                  <HealthBadge status={p.health} />
                </div>
                <p className="mt-2 text-xs leading-6 text-white/55">{p.summary}</p>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={p.progress} />
                  <span className="text-xs font-semibold text-white/70">{p.progress}%</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${statusStyle[p.status]}`}
                  >
                    {p.status}
                  </span>
                  <span className="text-xs text-white/45">Owner: {p.owner}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          Task Lifecycle
        </h2>
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {TASK_STAGES.map((stage, i) => (
              <span key={stage} className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  {stage}
                </span>
                {i < TASK_STAGES.length - 1 && (
                  <span className="text-white/25">→</span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/50">
            Every task flows through this lifecycle. Open a project to see its live board.
          </p>
        </Card>
      </section>
    </div>
  );
}
