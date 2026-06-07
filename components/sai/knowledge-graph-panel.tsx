type Edge = {
  id: string;
  sourceType: string;
  sourceLabel: string;
  targetType: string;
  targetLabel: string;
  relation: string;
};

type Props = {
  edges: Edge[];
};

export function KnowledgeGraphPanel({ edges }: Props) {
  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
        Knowledge Graph
      </p>
      <h2 className="mt-1 text-lg font-bold text-white">Everything connects</h2>
      <p className="mt-1 text-xs text-white/45">
        Customer → Feature → Task → Engineer → Decision → Release → Revenue
      </p>

      <div className="mt-4 space-y-2">
        {edges.slice(0, 15).map((edge) => (
          <div
            key={edge.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px]"
          >
            <span className="rounded border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-purple-200">
              {edge.sourceLabel}
            </span>
            <span className="text-white/30">—{edge.relation}→</span>
            <span className="rounded border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
              {edge.targetLabel}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
