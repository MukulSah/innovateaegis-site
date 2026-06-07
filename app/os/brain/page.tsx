import Link from "next/link";
import { Card, SectionHeading, ProgressBar } from "@/components/sai/ui";
import {
  agents,
  employees,
  memoryRecords,
  metrics,
  objectives,
  projects,
  tasks,
} from "@/lib/sai/data";

const understands = [
  { label: "Projects", value: projects.length, href: "/os/projects" },
  { label: "Tasks", value: tasks.length, href: "/os/projects" },
  { label: "Products", value: new Set(projects.map((p) => p.product)).size },
  { label: "Employees", value: employees.length, href: "/os/people" },
  { label: "AI Agents", value: agents.length, href: "/os/agents" },
  { label: "Customers", value: 38 },
  { label: "Memory Records", value: memoryRecords.length, href: "/os/memory" },
  { label: "Objectives", value: objectives.length },
];

export default function BrainPage() {
  const goalProgress = Math.round(
    objectives.reduce((s, o) => s + o.progress, 0) / objectives.length,
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Central Intelligence"
        title="SAI Brain"
        description="The central intelligence of the company. Everything reports to SAI Brain — projects, tasks, products, employees, agents, customers, revenue, documentation, meetings, and decisions."
      />

      <Card className="border-purple-400/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-purple-300/70">
              The brain continuously asks
            </p>
            <p className="mt-2 text-xl font-bold text-white">
              “Are we moving closer to company goals?”
            </p>
          </div>
          <div className="md:w-72">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Goal alignment</span>
              <span className="font-semibold text-white">{goalProgress}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={goalProgress} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/os/ask"
            className="glow-btn inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Ask SAI a question →
          </Link>
        </div>
      </Card>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          What SAI Brain understands
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {understands.map((u) => {
            const inner = (
              <Card className="p-4 transition-colors hover:border-purple-400/30">
                <p className="text-2xl font-bold text-white">{u.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/45">
                  {u.label}
                </p>
              </Card>
            );
            return u.href ? (
              <Link key={u.label} href={u.href}>
                {inner}
              </Link>
            ) : (
              <div key={u.label}>{inner}</div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <h3 className="text-sm font-semibold text-white">Revenue signal</h3>
          <p className="mt-2 text-2xl font-bold text-emerald-300">+{metrics.revenueDeltaPct}%</p>
          <p className="mt-1 text-xs text-white/50">Quarter-over-quarter growth tracked by the CEO Agent.</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white">Delivery signal</h3>
          <p className="mt-2 text-2xl font-bold text-white">{metrics.releasesThisQuarter} releases</p>
          <p className="mt-1 text-xs text-white/50">Shipped this quarter with full knowledge archival.</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white">Attention signal</h3>
          <p className="mt-2 text-2xl font-bold text-amber-300">
            {projects.filter((p) => p.health !== "green").length} projects
          </p>
          <p className="mt-1 text-xs text-white/50">Flagged yellow or red by the COO Agent.</p>
        </Card>
      </section>
    </div>
  );
}
