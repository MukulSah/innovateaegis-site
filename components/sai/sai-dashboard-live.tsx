"use client";

import { useRouter } from "next/navigation";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

/** Refreshes server-rendered dashboard metrics when workflow state changes. */
export function SaiDashboardLive({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { connected } = useSaiRealtimeSync(
    () => router.refresh(),
    [
      "workflow_runs",
      "workflow_approvals",
      "activity_feed",
      "company_records",
      "session_duties",
      "session_automation_rules",
    ],
    { debounceMs: 2000, minIntervalMs: 4000 },
  );

  return (
    <>
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
        {connected ? "Live sync" : "Polling every 12s"}
      </div>
      {children}
    </>
  );
}
