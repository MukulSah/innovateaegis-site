import Link from "next/link";
import { Card, SectionHeading } from "@/components/sai/ui";
import { agents } from "@/lib/sai/data";
import type { AgentCategory } from "@/lib/sai/types";

const categoryLabels: Record<AgentCategory, string> = {
  executive: "Executive",
  product: "Product",
  engineering: "Engineering",
  quality: "Quality",
  operations: "Operations",
  security: "Security",
  knowledge: "Knowledge",
  growth: "Growth",
  people: "People",
};

const order: AgentCategory[] = [
  "executive",
  "product",
  "engineering",
  "operations",
  "quality",
  "security",
  "knowledge",
  "growth",
  "people",
];

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Digital Workforce"
        title="AI Agents"
        description="Agents act as digital employees. Each agent has a name, role, responsibilities, memory, performance metrics, and assigned projects. Agents collaborate with human employees."
      />

      {order.map((cat) => {
        const group = agents.filter((a) => a.category === cat);
        if (group.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-purple-300/70">
              {categoryLabels[cat]}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {group.map((a) => (
                <Link key={a.id} href={`/os/agents/${a.slug}`}>
                  <Card className="h-full transition-colors hover:border-cyan-400/30">
                    <div className="flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-sm font-bold text-cyan-200">
                        AI
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {a.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white">{a.name}</h3>
                    <p className="text-xs text-white/50">{a.role}</p>
                    <p className="mt-2 text-sm text-white/65">{a.tagline}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-white/45">
                      <span>{a.metrics.tasksHandled} tasks handled</span>
                      <span>{Math.round(a.metrics.accuracy * 100)}% accuracy</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
