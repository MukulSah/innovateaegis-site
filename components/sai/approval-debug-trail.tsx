import type { ApprovalTrailStep } from "@/lib/sai/approval-trail";

type Props = {
  steps: ApprovalTrailStep[];
  errorMessage?: string | null;
  title?: string;
};

export function ApprovalDebugTrail({ steps, errorMessage, title = "Approval Debug" }: Props) {
  if (steps.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">{title}</h3>
      <ul className="mt-3 space-y-1.5">
        {steps.map((step, i) => (
          <li key={`${step.key}-${i}`} className="flex items-start gap-2 text-xs">
            <span
              className={
                step.status === "completed"
                  ? "text-emerald-400"
                  : step.status === "failed"
                    ? "text-red-400"
                    : "text-white/40"
              }
            >
              {step.status === "completed" ? "✓" : step.status === "failed" ? "✗" : "·"}
            </span>
            <div>
              <span className="text-white/75">{step.label}</span>
              {step.table && (
                <p className="mt-0.5 text-white/45">
                  Table: <span className="font-mono text-white/60">{step.table}</span>
                  {step.field && (
                    <>
                      {" "}
                      · Field: <span className="font-mono text-white/60">{step.field}</span>
                    </>
                  )}
                  {step.value !== undefined && (
                    <>
                      {" "}
                      · Value: <span className="font-mono text-red-300/80">&quot;{step.value}&quot;</span>
                    </>
                  )}
                </p>
              )}
              {step.error && <p className="mt-0.5 text-red-300/90">{step.error}</p>}
            </div>
          </li>
        ))}
      </ul>
      {errorMessage && (
        <p className="mt-3 border-t border-amber-400/15 pt-2 text-xs text-red-300">
          Error: {errorMessage}
        </p>
      )}
    </section>
  );
}
