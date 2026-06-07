import type { Recommendation } from "@/lib/sai/recommendations";

type Props = {
  recommendations: Recommendation[];
};

const categoryLabels: Record<string, string> = {
  priority: "Top Priorities",
  risk: "Critical Risks",
  opportunity: "Growth Opportunities",
  action: "Suggested Actions",
  attention: "Needs Attention",
};

const categoryColors: Record<string, string> = {
  priority: "text-red-300",
  risk: "text-amber-300",
  opportunity: "text-emerald-300",
  action: "text-cyan-300",
  attention: "text-purple-300",
};

export function RecommendationsPanel({ recommendations }: Props) {
  const grouped = recommendations.reduce<Record<string, Recommendation[]>>((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {});

  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          SAI Recommendation Engine
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">Daily Intelligence Brief</h2>
        <p className="mt-1 text-xs text-white/45">
          SAI analyzed projects, revenue, tasks, customers, risks, agents, and deadlines.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${categoryColors[category] ?? "text-white/50"}`}>
              {categoryLabels[category] ?? category}
            </h3>
            <ul className="space-y-2">
              {items.map((rec) => (
                <li
                  key={rec.id}
                  className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                >
                  <p className="text-sm text-white/85">{rec.title}</p>
                  <p className="mt-0.5 text-xs text-white/45">{rec.message}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
