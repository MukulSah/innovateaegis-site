"use client";

import Link from "next/link";
import type { IntelligenceCard } from "@/lib/sai/founder-workspace.types";

type Props = {
  card: IntelligenceCard;
  showDecisionActions?: boolean;
};

const impactStyles: Record<string, string> = {
  critical: "text-red-300",
  high: "text-amber-200",
  medium: "text-purple-200",
  low: "text-white/50",
};

export function FounderIntelligenceCard({ card, showDecisionActions = false }: Props) {
  return (
    <article className="enterprise-glass rounded-xl border border-white/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-purple-300/70">
            {card.cardType.replace(/_/g, " ")} · {card.raisedBy}
          </p>
          <h4 className="mt-1 text-base font-semibold text-white">{card.title}</h4>
        </div>
        <div className="text-right text-xs">
          <p className={impactStyles[card.impact] ?? "text-white/50"}>{card.impact} impact</p>
          {card.confidence != null && (
            <p className="mt-1 text-white/40">{card.confidence}% confidence</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-white/60">{card.description}</p>

      {card.recommendation && (
        <div className="mt-4 rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-3">
          <p className="text-[10px] uppercase text-cyan-300/70">Recommendation</p>
          <p className="mt-1 text-sm text-white/75">{card.recommendation}</p>
        </div>
      )}

      {(card.riskAssessment || card.requiredInvestment || card.timeline) && (
        <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          {card.riskAssessment && (
            <div>
              <dt className="text-white/40">Risk</dt>
              <dd className="text-white/65">{card.riskAssessment}</dd>
            </div>
          )}
          {card.requiredInvestment && (
            <div>
              <dt className="text-white/40">Investment</dt>
              <dd className="text-white/65">{card.requiredInvestment}</dd>
            </div>
          )}
          {card.timeline && (
            <div>
              <dt className="text-white/40">Timeline</dt>
              <dd className="text-white/65">{card.timeline}</dd>
            </div>
          )}
        </dl>
      )}

      {showDecisionActions && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs text-white/45">Review this decision in the founder inbox or session center.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/sai/founder?tab=inbox"
              className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs font-medium text-white"
            >
              Open Inbox
            </Link>
            <Link
              href="/sai/organization?section=active-sessions"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70"
            >
              View Sessions
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
