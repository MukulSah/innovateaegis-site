"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClientApiError } from "@/lib/sai/client-api";
import type { SessionExecutiveBrief } from "@/lib/sai/session-brief";
import type { FounderSessionRow } from "@/lib/sai/founder-timeline";
import { loadSessionBriefAction } from "@/lib/sai/session-workspace-actions";

type Props = {
  session: FounderSessionRow;
  onClose: () => void;
};

function ExecutiveCard({ brief }: { brief: SessionExecutiveBrief["executives"]["ceo"] }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/80">{brief.role}</p>
        <span className={`text-[10px] ${brief.available ? "text-emerald-300" : "text-white/35"}`}>
          {brief.available ? "Reported" : "Pending"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/75">{brief.summary}</p>
      {brief.artifactName && (
        <p className="mt-2 text-[10px] text-white/35">{brief.artifactName}</p>
      )}
    </article>
  );
}

export function SessionRegistryQuickView({ session, onClose }: Props) {
  const [brief, setBrief] = useState<SessionExecutiveBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const brief = await loadSessionBriefAction(session.id);
        if (!brief) throw new Error("Session not found");
        if (!cancelled) setBrief(brief);
      } catch (err) {
        if (!cancelled) setError(formatClientApiError(err, "Session brief"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#080818] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-cyan-300/70">
              Session #{session.sessionNumber ?? "—"} · {session.projectName}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">{session.objective}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/50 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        {loading && <p className="mt-6 text-sm text-white/45">Loading session status and executive outcomes…</p>}
        {error && <p className="mt-6 text-sm text-red-300">{error}</p>}

        {brief && (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase text-white/40">Status</p>
                <p className="mt-1 text-sm capitalize text-white">{brief.status.replace(/_/g, " ")}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase text-white/40">Progress</p>
                <p className="mt-1 text-sm text-white">{brief.progress}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase text-white/40">Health</p>
                <p className="mt-1 text-sm text-white">{brief.executionHealth}%</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Current Output</h3>
              <p className="mt-2 text-sm text-white/70">
                {brief.outputSummary ?? brief.deliveryOutcome ?? "No output captured yet — execution in progress."}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Executive Session Outcome</h3>
              <p className="mt-1 text-xs text-white/45">
                CEO, COO, and Product Manager reports for this session.
              </p>
              <div className="mt-3 grid gap-3">
                <ExecutiveCard brief={brief.executives.ceo} />
                <ExecutiveCard brief={brief.executives.coo} />
                <ExecutiveCard brief={brief.executives.productManager} />
              </div>
            </div>

            {brief.intelligenceOutcome && (
              <div>
                <h3 className="text-sm font-semibold text-white">Organizational Intelligence</h3>
                <p className="mt-2 text-sm text-white/70">{brief.intelligenceOutcome}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/sai/sessions/${session.id}`}
            className="glow-btn rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
          >
            Open Full Workspace
          </Link>
          <Link
            href={`/sai/sessions/${session.id}?tab=approvals`}
            className="rounded-lg border border-amber-400/30 px-4 py-2 text-xs text-amber-200 hover:bg-amber-500/10"
          >
            Approvals
          </Link>
        </div>
      </div>
    </div>
  );
}
