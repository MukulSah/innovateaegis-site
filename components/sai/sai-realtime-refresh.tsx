"use client";

import { useDebouncedRouterRefresh } from "@/lib/sai/use-debounced-router-refresh";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

/** Client wrapper that refreshes server-rendered SAI pages on Realtime changes. */
export function SaiRealtimeRefresh({ children }: { children: React.ReactNode }) {
  const refreshPage = useDebouncedRouterRefresh(15_000);

  useSaiRealtimeSync(refreshPage, [], { debounceMs: 2000, minIntervalMs: 5000 });

  return <>{children}</>;
}
