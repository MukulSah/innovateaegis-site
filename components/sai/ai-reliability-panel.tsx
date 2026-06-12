import type { AIReliabilityStatus } from "@/lib/sai/types";

type Props = {
  reliability: AIReliabilityStatus;
  compact?: boolean;
};

export function AiReliabilityPanel({ reliability, compact }: Props) {
  return (
    <section
      className={`rounded-lg border ${reliability.operationalAlert ? "border-amber-400/30 bg-amber-500/5" : "border-white/10 bg-white/[0.03]"} ${compact ? "p-3" : "p-4"}`}
    >
      <header className="mb-3">
        <p className="text-[10px] uppercase tracking-wider text-white/40">AI Reliability Status</p>
        {reliability.operationalAlert && (
          <p className="mt-1 text-xs text-amber-200">Template mode exceeds 5% — operational review recommended</p>
        )}
      </header>
      <dl className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        <div>
          <dt className="text-[10px] text-white/40">Provider</dt>
          <dd className="text-sm text-white">{reliability.providerLabel}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-white/40">Success Rate</dt>
          <dd className="text-sm font-medium text-emerald-300">{reliability.successRate}%</dd>
        </div>
        <div>
          <dt className="text-[10px] text-white/40">Retries</dt>
          <dd className="text-sm text-white">{reliability.retries}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-white/40">Fallback Usage</dt>
          <dd className="text-sm text-white">{reliability.fallbackUsage}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-white/40">Template Mode</dt>
          <dd className={`text-sm font-medium ${reliability.templateMode > 0 ? "text-amber-200" : "text-white"}`}>
            {reliability.templateMode}
          </dd>
        </div>
      </dl>
    </section>
  );
}
