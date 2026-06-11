import type { CompanyOverview } from "@/lib/sai/types";

type Props = {
  data: CompanyOverview;
};

const statCards = [
  { key: "activeProjects", label: "Active Projects", icon: "▣" },
  { key: "employeesOnline", label: "Employees Online", icon: "◫", suffix: (d: CompanyOverview) => ` / ${d.totalEmployees}` },
  { key: "aiAgentsActive", label: "AI Agents Active", icon: "◇", suffix: (d: CompanyOverview) => ` / ${d.totalAgents}` },
  { key: "tasksInProgress", label: "Tasks In Progress", icon: "◆" },
  { key: "releases", label: "Released Versions", icon: "▲" },
  { key: "openIssues", label: "Open Issues", icon: "!" },
] as const;

export function CompanyOverviewPanel({ data }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
            Company Overview
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Headquarters Status</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-ring relative" />
          <span className="text-xs font-medium text-white/70">
            Health Score: <span className="text-white">{data.organizationHealthScore}</span>/100
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const value = data[card.key as keyof CompanyOverview];
          const displayValue = typeof value === "number" ? value : String(value);
          const suffix = "suffix" in card && card.suffix ? card.suffix(data) : "";

          return (
            <article
              key={card.key}
              className="enterprise-glass rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-300/60">{card.icon}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {displayValue}
                {suffix && <span className="text-sm font-normal text-white/40">{suffix}</span>}
              </p>
              <p className="mt-1 text-[11px] text-white/50">{card.label}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-4 enterprise-glass rounded-xl border border-white/10 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Current Objectives
        </p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {data.currentObjectives.map((objective) => (
            <li
              key={objective}
              className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/75"
            >
              <span className="mt-0.5 text-purple-400">→</span>
              {objective}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
