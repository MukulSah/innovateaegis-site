import Link from "next/link";
import { Card, HealthBadge, SectionHeading } from "@/components/sai/ui";
import {
  agents,
  employees,
  healthDomains,
  memoryRecords,
  metrics,
  objectives,
  projects,
  tasks,
} from "@/lib/sai/data";

const twinQuestions = [
  "Why is this project delayed?",
  "Which engineer is overloaded?",
  "Which feature generated the most value?",
  "Which product should we prioritize next?",
];

const facets = [
  { label: "Products", value: new Set(projects.map((p) => p.product)).size },
  { label: "Projects", value: projects.length },
  { label: "Employees", value: employees.length },
  { label: "Agents", value: agents.length },
  { label: "Customers", value: 38 },
  { label: "Meetings (qtr)", value: 47 },
  { label: "Open Tasks", value: tasks.filter((t) => t.stage !== "Knowledge Archived").length },
  { label: "Memory Records", value: memoryRecords.length },
  { label: "Objectives", value: objectives.length },
  { label: "Risks Tracked", value: projects.reduce((s, p) => s + p.risks.length, 0) },
];

export default function TwinPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Live Company Model"
        title="Digital Company Twin"
        description="SAI maintains a live model of the company — products, projects, employees, agents, revenue, customers, meetings, roadmaps, risks, deadlines, and documentation. Ask, and the system answers using company data."
      />

      <Card className="border-purple-400/20">
        <p className="text-xs uppercase tracking-[0.16em] text-purple-300/70">Ask the twin</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {twinQuestions.map((q) => (
            <Link
              key={q}
              href={`/os/ask?q=${encodeURIComponent(q)}`}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/75 transition-colors hover:border-purple-400/30 hover:text-white"
            >
              {q}
            </Link>
          ))}
        </div>
        <Link
          href="/os/ask"
          className="glow-btn mt-4 inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Open Ask SAI →
        </Link>
      </Card>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          What the twin tracks
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {facets.map((f) => (
            <Card key={f.label} className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{f.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/45">
                {f.label}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-white">Project state</h2>
          <div className="mt-3 space-y-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/os/projects/${p.slug}`}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-purple-400/30"
              >
                <span className="text-sm text-white/80">{p.name}</span>
                <HealthBadge status={p.health} />
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-white">Organization health</h2>
          <div className="mt-3 space-y-2">
            {healthDomains.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <span className="text-sm text-white/75">{d.label}</span>
                <HealthBadge status={d.status} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/40">
            Overall organization health score: {metrics.organizationHealthScore}/100
          </p>
        </Card>
      </section>
    </div>
  );
}
