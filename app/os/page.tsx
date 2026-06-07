import Link from "next/link";
import { AskSai } from "@/components/sai/ask-sai";
import { Card, HealthBadge, ProgressBar } from "@/components/sai/ui";
import {
  company,
  healthDomains,
  metrics,
  objectives,
} from "@/lib/sai/data";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const overview = [
  { label: "Active Projects", value: String(metrics.activeProjects), href: "/os/projects" },
  { label: "Employees Online", value: String(metrics.employeesOnline), href: "/os/people" },
  { label: "AI Agents Active", value: String(metrics.agentsActive), href: "/os/agents" },
  { label: "Revenue (qtr)", value: currency.format(metrics.revenue), sub: `+${metrics.revenueDeltaPct}%` },
  { label: "Releases (qtr)", value: String(metrics.releasesThisQuarter) },
  { label: "Open Issues", value: String(metrics.openIssues), href: "/os/projects" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">
          Headquarters
        </p>
        <h1 className="gradient-text mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          {company.name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
          {company.tagline}. {company.mission}
        </p>
      </div>

      {/* Ask SAI — the centerpiece */}
      <AskSai variant="card" />

      {/* Company Overview */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
          Company Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {overview.map((item) => {
            const inner = (
              <Card className="h-full p-4 transition-colors hover:border-purple-400/30">
                <p className="text-xs uppercase tracking-[0.1em] text-white/45">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                {item.sub && (
                  <p className="mt-0.5 text-xs font-semibold text-emerald-300">{item.sub}</p>
                )}
              </Card>
            );
            return item.href ? (
              <Link key={item.label} href={item.href}>
                {inner}
              </Link>
            ) : (
              <div key={item.label}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Organization Health */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
            Organization Health
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Org Health Score</span>
            <span className="text-xl font-bold text-emerald-300">
              {metrics.organizationHealthScore}
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {healthDomains.map((d) => (
            <Card key={d.key}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{d.label}</h3>
                <HealthBadge status={d.status} />
              </div>
              <div className="mt-3">
                <ProgressBar value={d.score} />
              </div>
              <p className="mt-3 text-xs leading-6 text-white/55">{d.explanation}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Current Objectives */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">
            Current Objectives
          </h2>
          <Link href="/os/projects" className="text-xs text-purple-300 hover:text-purple-200">
            View projects →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {objectives.map((o) => (
            <Card key={o.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{o.title}</h3>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-white/50">
                  {o.status}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-white/55">{o.description}</p>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={o.progress} />
                <span className="text-xs font-semibold text-white/70">{o.progress}%</span>
              </div>
              {o.projectSlug && (
                <Link
                  href={`/os/projects/${o.projectSlug}`}
                  className="mt-3 inline-flex text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Open project →
                </Link>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
