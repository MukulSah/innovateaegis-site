import type { HealthMetric, HealthStatus } from "@/lib/sai/types";

type Props = {
  metrics: HealthMetric[];
};

const statusStyles: Record<HealthStatus, { dot: string; bg: string; border: string; label: string }> = {
  green: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-400/20",
    label: "Healthy",
  },
  yellow: {
    dot: "bg-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-400/20",
    label: "Attention",
  },
  red: {
    dot: "bg-red-400",
    bg: "bg-red-500/10",
    border: "border-red-400/20",
    label: "Critical",
  },
};

export function OrganizationHealthPanel({ metrics }: Props) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Organization Health
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">Six-Domain Health Monitor</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const style = statusStyles[metric.status];
          return (
            <article
              key={metric.id}
              className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{metric.label}</h3>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">
                    {style.label}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${style.dot}`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white/70">{metric.score}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/55">
                {metric.explanation}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
