import type { ActivityLog } from "@/lib/sai/types";

type Props = {
  activity: ActivityLog[];
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function RecentActivityPanel({ activity }: Props) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Recent Activity
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">Company Activity Log</h2>
      </div>

      <div className="enterprise-glass rounded-xl border border-white/10 p-5">
        {activity.length === 0 ? (
          <p className="text-center text-sm text-white/40">
            No activity recorded yet. Actions across projects, tasks, and releases will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm text-white/85">{entry.action}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-white/35">
                    {entry.actor} · {entry.entityType}
                  </p>
                </div>
                <span className="text-[10px] text-white/35">{formatTimestamp(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
