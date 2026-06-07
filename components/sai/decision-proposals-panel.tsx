type Proposal = {
  id: string;
  title: string;
  question: string;
  status: string;
  finalRecommendation: string | null;
  agentInputs: Array<{
    analysis: string;
    recommendation: string;
    agent: { name: string; role: string };
  }>;
};

type Props = {
  proposals: Proposal[];
};

export function DecisionProposalsPanel({ proposals }: Props) {
  const pending = proposals.filter((p) => p.status === "pending");

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Company Decision Engine
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">Multi-Agent Decision Support</h2>
        <p className="mt-1 text-xs text-white/45">
          Agents provide analysis before major decisions. Owner receives final recommendation.
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-white/45">No pending decisions awaiting approval.</p>
      ) : (
        pending.map((proposal) => (
          <article
            key={proposal.id}
            className="enterprise-glass rounded-xl border border-amber-400/15 p-5"
          >
            <h3 className="text-sm font-semibold text-white">{proposal.title}</h3>
            <p className="mt-1 text-xs text-white/55">{proposal.question}</p>

            <div className="mt-4 space-y-3">
              {proposal.agentInputs.map((input) => (
                <div key={input.agent.name} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-purple-300/70">
                    {input.agent.name} — {input.agent.role}
                  </p>
                  <p className="mt-1 text-xs text-white/55">{input.analysis}</p>
                  <p className="mt-2 text-xs font-medium text-cyan-300/80">
                    Recommends: {input.recommendation}
                  </p>
                </div>
              ))}
            </div>

            {proposal.finalRecommendation && (
              <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-300">
                  SAI Final Recommendation
                </p>
                <p className="mt-1 text-sm text-white/80">{proposal.finalRecommendation}</p>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}
