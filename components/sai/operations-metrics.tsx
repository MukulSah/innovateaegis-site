import type { OperationsMetrics } from "@/lib/sai/types";

type Props = {
  metrics: OperationsMetrics;
};

const cards: { key: keyof OperationsMetrics; label: string }[] = [
  { key: "activeWorkflows", label: "Active Workflows" },
  { key: "workflowCompletionRate", label: "Workflow Completion %" },
  { key: "generatedTasks", label: "Generated Tasks" },
  { key: "generatedRequirements", label: "Generated Requirements" },
  { key: "generatedDocuments", label: "Generated Documents" },
  { key: "decisionsRecorded", label: "Decisions Recorded" },
  { key: "knowledgeEntries", label: "Knowledge Entries" },
  { key: "agentMemoryCount", label: "Agent Memory Count" },
  { key: "searchIndexSize", label: "Search Index Size" },
  { key: "blockedWorkflows", label: "Blocked Workflows" },
];

export function OperationsMetricsPanel({ metrics }: Props) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Operations Intelligence
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">Workflow & Knowledge Metrics</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const value = metrics[card.key];
          const display =
            card.key === "workflowCompletionRate" ? `${value}%` : String(value);
          return (
            <article
              key={card.key}
              className="enterprise-glass rounded-xl border border-white/10 p-4"
            >
              <p className="text-xl font-bold text-white">{display}</p>
              <p className="mt-1 text-[11px] text-white/50">{card.label}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
