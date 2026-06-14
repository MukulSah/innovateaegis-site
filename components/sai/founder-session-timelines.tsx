"use client";

import { useCallback, useEffect, useState } from "react";
import { FounderSessionTimelinePanel } from "@/components/sai/founder-session-timeline-panel";
import type { SessionTruth } from "@/lib/sai/session-truth-engine";
import { parseJsonResponse } from "@/lib/sai/client-api";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

type Props = {
  sessionIds: string[];
  title?: string;
};

export function FounderSessionTimelines({ sessionIds, title = "Session Timelines" }: Props) {
  const [truths, setTruths] = useState<SessionTruth[]>([]);

  const refresh = useCallback(async () => {
    const fetchOne = async (id: string): Promise<SessionTruth | null> => {
      try {
        const route = `/api/sai/sessions/${id}/truth`;
        const res = await fetch(route);
        const data = await parseJsonResponse<{ truth: SessionTruth }>(res, route);
        if (res.ok && data.truth) return data.truth;
      } catch {
        // skip failed session
      }
      return null;
    };

    const results: SessionTruth[] = [];
    const batchSize = 4;
    for (let i = 0; i < sessionIds.length; i += batchSize) {
      const batch = sessionIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fetchOne));
      results.push(...batchResults.filter((t): t is SessionTruth => t !== null));
    }

    setTruths(
      results.sort((a, b) => (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0)),
    );
  }, [sessionIds]);

  useSaiRealtimeSync(refresh, [], { debounceMs: 3000, minIntervalMs: 10_000 });
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!sessionIds.length) return null;

  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {truths.map((t) => (
          <FounderSessionTimelinePanel
            key={t.sessionId}
            sessionId={t.sessionId}
            sessionNumber={t.sessionNumber}
            objective={t.objective}
            timeline={t.timeline}
            isComplete={t.isComplete}
          />
        ))}
      </div>
    </section>
  );
}
