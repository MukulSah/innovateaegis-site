"use client";

import { useCallback, useEffect, useState } from "react";
import type { AIInfrastructureStatus } from "@/lib/sai/types";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function AIInfrastructureStatusPanel() {
  const [status, setStatus] = useState<AIInfrastructureStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const route = "/api/sai/ai-infrastructure";
      const res = await fetch(route);
      const data = await parseJsonResponse<{ status: AIInfrastructureStatus }>(res, route);
      setStatus(data.status);
    } catch {
      // panel is informational
    } finally {
      setLoading(false);
    }
  }, []);

  useSaiRealtimeSync(refresh, ["ai_retry_queue", "ai_execution_events", "company_ai_settings"]);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading && !status) {
    return (
      <section className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
        <p className="text-xs text-white/40">Loading AI infrastructure status…</p>
      </section>
    );
  }

  if (!status) return null;

  const queueActive = status.queueStatus !== "idle";

  return (
    <section className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
      <header>
        <p className="text-[10px] uppercase tracking-wider text-cyan-300/70">AI Infrastructure Status</p>
        {queueActive && (
          <p className="mt-1 text-xs font-medium text-amber-300">AI Queue Active</p>
        )}
      </header>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-white/40">Execution Mode</dt>
          <dd className="capitalize text-white">{status.executionMode}</dd>
        </div>
        <div>
          <dt className="text-white/40">Provider</dt>
          <dd className="text-white">{status.provider ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-white/40">Model</dt>
          <dd className="text-white">{status.model ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-white/40">Queue Status</dt>
          <dd className="capitalize text-white">
            {queueActive
              ? status.queueMessage ?? status.queueStatus.replace(/_/g, " ")
              : "Idle"}
          </dd>
        </div>
        <div>
          <dt className="text-white/40">Retry Count</dt>
          <dd className="text-white">{status.retryCount}</dd>
        </div>
        <div>
          <dt className="text-white/40">Template Usage</dt>
          <dd className="text-white">{status.templateUsage}</dd>
        </div>
        <div>
          <dt className="text-white/40">Provider Health</dt>
          <dd className="capitalize text-white">{status.providerHealth}</dd>
        </div>
        <div>
          <dt className="text-white/40">Next Attempt</dt>
          <dd className="text-white">{formatWhen(status.nextAttemptAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
