"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type SyncCallback = () => void;

type Options = {
  /** Wait after last event before invoking callback. */
  debounceMs?: number;
  /** Minimum time between callback invocations. */
  minIntervalMs?: number;
};

/**
 * Supabase Realtime subscriptions for SAI workspace state.
 * Debounced to avoid refresh/fetch storms on heavy pages.
 */
export function useSaiRealtimeSync(
  onChange: SyncCallback,
  tables: string[] = [],
  options: Options = {},
) {
  const debounceMs = options.debounceMs ?? 2000;
  const minIntervalMs = options.minIntervalMs ?? 4000;

  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  const lastRunRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelId = useId().replace(/:/g, "");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const defaultTables = [
      "workflow_runs",
      "workflow_approvals",
      "activity_feed",
      "ai_retry_queue",
      "founder_chat_actions",
    ];
    const watchTables = tables.length ? tables : defaultTables;

    const invoke = () => {
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      try {
        callbackRef.current();
      } catch (error) {
        console.warn("[sai-realtime-sync] callback failed:", error);
      }
    };

    const schedule = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        invoke();
      }, debounceMs);
    };

    let channel: ReturnType<ReturnType<typeof createSupabaseBrowser>["channel"]> | null = null;

    try {
      const supabase = createSupabaseBrowser();
      channel = supabase.channel(`sai-workspace-sync-${channelId}`);

      for (const table of watchTables) {
        channel = channel!.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          schedule,
        );
      }

      channel.subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });
    } catch {
      setConnected(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (channel) {
        try {
          const supabase = createSupabaseBrowser();
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [tables.join(","), channelId, debounceMs, minIntervalMs]);

  // Poll fallback every 12s when Realtime is unavailable (was 30s — pages felt dead)
  useEffect(() => {
    if (connected) return;

    const invoke = () => {
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      try {
        callbackRef.current();
      } catch {
        // ignore
      }
    };

    const id = setInterval(invoke, 12_000);
    return () => clearInterval(id);
  }, [connected, minIntervalMs]);

  return { connected };
}
