import Link from "next/link";
import { Avatar, Card, SectionHeading } from "@/components/sai/ui";
import { employees } from "@/lib/sai/data";

const presenceDot: Record<string, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-white/30",
};

export default function PeoplePage() {
  return (
    <div>
      <SectionHeading
        eyebrow="The Team"
        title="People"
        description="Human employees with a profile, role, department, assigned work, activity history, performance metrics, and knowledge contributions."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((e) => (
          <Link key={e.id} href={`/os/people/${e.slug}`}>
            <Card className="h-full transition-colors hover:border-purple-400/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar initials={e.initials} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0c0c1e] ${presenceDot[e.presence]}`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{e.name}</p>
                  <p className="truncate text-xs text-white/50">{e.role}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/55">
                  {e.department}
                </span>
                <span className="text-white/45">{e.metrics.activeTasks} active</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Done" value={String(e.metrics.tasksCompleted)} />
                <Metric label="On-time" value={`${Math.round(e.metrics.onTimeRate * 100)}%`} />
                <Metric label="Knowledge" value={String(e.metrics.knowledgeContributions)} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2">
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.08em] text-white/40">{label}</p>
    </div>
  );
}
