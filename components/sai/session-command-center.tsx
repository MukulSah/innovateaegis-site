import type { CooSessionView } from "@/lib/sai/coo-dashboard";
import type { ExecutionHealthSnapshot } from "@/lib/sai/execution-health";
import type { StrategicHealthSnapshot } from "@/lib/sai/strategic-health";
import type { SessionHandoff } from "@/lib/sai/types";
import type { WorkflowApproval } from "@/lib/sai/types";

type Props = {
  session: CooSessionView;
  health: ExecutionHealthSnapshot;
  strategicHealth?: StrategicHealthSnapshot | null;
  pendingApprovals: WorkflowApproval[];
  handoffs: SessionHandoff[];
  blockedItems: string[];
};

export function SessionCommandCenter({
  session,
  health,
  strategicHealth,
  pendingApprovals,
  handoffs,
  blockedItems,
}: Props) {
  return (
    <section className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
      <header className="border-b border-white/10 pb-4">
        <p className="text-[10px] uppercase tracking-wider text-cyan-300/80">Session Command Center</p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Session #{session.sessionNumber} — {session.projectName}
        </h2>
        <p className="mt-1 text-sm text-white/60">{session.objective}</p>
      </header>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Current Stage</dt>
          <dd className="text-sm font-medium text-white">{session.currentStage ?? "—"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Current Agent</dt>
          <dd className="text-sm font-medium text-white">{session.currentAgentName ?? "—"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Next Agent</dt>
          <dd className="text-sm font-medium text-white">{session.nextAgentName ?? "—"}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <dt className="text-[10px] text-white/40">Progress</dt>
          <dd className="text-sm font-medium text-white">{session.progress}%</dd>
        </div>
        {session.currentDeliverable && (
          <div className="rounded-lg bg-white/[0.04] p-3">
            <dt className="text-[10px] text-white/40">Current Deliverable</dt>
            <dd className="font-mono text-sm text-purple-300">{session.currentDeliverable}</dd>
          </div>
        )}
        {session.currentArtifact && (
          <div className="rounded-lg bg-white/[0.04] p-3">
            <dt className="text-[10px] text-white/40">Current Artifact</dt>
            <dd className="font-mono text-sm text-cyan-300">{session.currentArtifact}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/50">
          {session.sessionStatus.replace("_", " ")}
        </span>
        <span className="text-xs text-emerald-300/90">Execution Health: {health.score}%</span>
        {strategicHealth && (
          <span className="text-xs text-purple-300/90">Strategic Health: {strategicHealth.score}%</span>
        )}
        {strategicHealth?.behindSchedule && (
          <span className="text-xs text-amber-200/90">
            Behind schedule ({strategicHealth.currentProgress}% vs {strategicHealth.expectedProgress}%)
          </span>
        )}
        <span className="text-xs text-white/45">
          Pending Approvals: {health.pendingApprovals}
        </span>
        <span className="text-xs text-white/45">Failed Turns: {health.failedTurns}</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Recent Handoffs</h3>
          <ul className="mt-2 space-y-2">
            {handoffs.length === 0 ? (
              <li className="text-sm text-white/40">No handoffs yet.</li>
            ) : (
              handoffs.slice(0, 5).map((h) => (
                <li key={h.id} className="rounded-lg border border-white/5 p-3 text-xs text-white/70">
                  <p className="font-mono text-purple-300">{h.artifactName ?? h.toStepKey}</p>
                  <p className="mt-1">{h.reason}</p>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Approvals Waiting</h3>
          <ul className="mt-2 space-y-2">
            {pendingApprovals.length === 0 ? (
              <li className="text-sm text-white/40">None pending.</li>
            ) : (
              pendingApprovals.slice(0, 5).map((a) => (
                <li key={a.id} className="rounded-lg border border-amber-400/15 p-3 text-xs text-white/70">
                  {a.title}
                </li>
              ))
            )}
          </ul>
          {blockedItems.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-red-300/70">Blocked</h3>
              <ul className="mt-2 space-y-1">
                {blockedItems.map((item) => (
                  <li key={item} className="text-xs text-red-200/80">
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
