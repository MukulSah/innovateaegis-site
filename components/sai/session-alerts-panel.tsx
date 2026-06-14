"use client";

import { useCallback, useEffect, useState } from "react";
import { loadSessionAlertsAction } from "@/lib/sai/session-workspace-actions";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

type Alert = {
  id: string;
  type: "finalization" | "activity" | "execution";
  eventType: string;
  message: string;
  createdAt: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionAlertsPanel({ sessionId }: { sessionId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await loadSessionAlertsAction(sessionId);
      setAlerts(data as Alert[]);
    } catch {
      // best-effort
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useSaiRealtimeSync(load, ["session_finalization_events", "activity_feed", "workflow_events", "ai_retry_queue"], {
    debounceMs: 3000,
    minIntervalMs: 8000,
  });

  if (loading && !alerts.length) return null;

  return (
    <section className="enterprise-glass rounded-xl border border-amber-400/20 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
        Session Alerts
      </h4>
      <p className="mt-1 text-[10px] text-white/40">
        Finalization attempts, reconcile actions, and founder-visible session events.
      </p>
      {alerts.length === 0 ? (
        <p className="mt-3 text-xs text-white/40">No session alerts yet.</p>
      ) : (
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] uppercase ${
                    a.type === "finalization"
                      ? "bg-amber-500/15 text-amber-200"
                      : a.type === "execution"
                        ? "bg-red-500/15 text-red-200"
                        : "bg-cyan-500/10 text-cyan-200"
                  }`}
                >
                  {a.eventType.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-white/35">{formatWhen(a.createdAt)}</span>
              </div>
              <p className="mt-1">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
