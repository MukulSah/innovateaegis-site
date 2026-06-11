import type { GovernanceMetrics } from "@/lib/sai/types";

type Props = { metrics: GovernanceMetrics };

export function GovernanceMetricsPanel({ metrics }: Props) {
  const cards: { key: keyof GovernanceMetrics; label: string; suffix?: string }[] = [
    { key: "pendingApprovals", label: "Approvals Pending" },
    { key: "approvedToday", label: "Approved Today" },
    { key: "autoApprovedToday", label: "Auto Approved Today" },
    { key: "escalationsToday", label: "Escalations Today" },
    { key: "averageApprovalHours", label: "Avg Approval Time", suffix: "h" },
    { key: "blockedWorkflows", label: "Blocked Workflows" },
    { key: "governanceHealth", label: "Governance Health" },
    { key: "workflowHealth", label: "Workflow Health" },
    { key: "riskExposure", label: "Risk Exposure" },
  ];

  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">Governance</p>
        <h2 className="mt-1 text-xl font-bold text-white">Approval & Risk Metrics</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.key} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-xl font-bold text-white">
              {metrics[card.key]}
              {card.suffix ?? ""}
            </p>
            <p className="mt-1 text-[11px] text-white/50">{card.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
