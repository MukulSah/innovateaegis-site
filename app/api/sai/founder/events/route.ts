import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { getFounderRealtimeEvents, getFounderSyncVersion } from "@/lib/sai/realtime-session-events";

export async function GET(request: Request) {
  if (!(await requireFounder())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  const syncOnly = searchParams.get("syncOnly") === "1";

  try {
    if (syncOnly) {
      const { tickAutonomousSessions } = await import("@/lib/sai/session-execution-driver");
      await tickAutonomousSessions().catch(() => {});
      const version = await getFounderSyncVersion();
      return NextResponse.json(version);
    }

    const result = await getFounderRealtimeEvents(since);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
