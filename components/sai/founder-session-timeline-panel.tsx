"use client";

import Link from "next/link";
import type { SessionTimelineEvent } from "@/lib/sai/session-truth-engine";

type Props = {
  sessionNumber: number | null;
  sessionId: string;
  objective: string;
  timeline: SessionTimelineEvent[];
  isComplete: boolean;
};

function statusColor(status: SessionTimelineEvent["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
    case "in_progress":
      return "bg-purple-500/20 text-purple-200 border-purple-400/30";
    case "skipped":
      return "bg-white/5 text-white/40 border-white/10";
    default:
      return "bg-white/[0.03] text-white/35 border-white/10";
  }
}

export function FounderSessionTimelinePanel({
  sessionNumber,
  sessionId,
  objective,
  timeline,
  isComplete,
}: Props) {
  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40">Session Timeline</p>
          <h3 className="text-sm font-semibold text-white">
            Session #{sessionNumber ?? "—"}
            {isComplete && (
              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                Completed
              </span>
            )}
          </h3>
          <p className="mt-1 max-w-xl truncate text-xs text-white/50">{objective}</p>
        </div>
        <Link
          href={`/sai/sessions/${sessionId}`}
          className="text-xs text-purple-300 hover:underline"
        >
          View detail →
        </Link>
      </header>

      <ol className="mt-4 space-y-2">
        {timeline.map((step) => (
          <li
            key={step.stepKey}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${statusColor(step.status)}`}
          >
            <span>{step.label}</span>
            <span className="text-[10px] capitalize opacity-80">
              {step.status.replace("_", " ")}
              {step.durationLabel ? ` · ${step.durationLabel}` : ""}
              {step.artifactName ? ` · ${step.artifactName}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
