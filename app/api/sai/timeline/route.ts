import { NextResponse } from "next/server";
import { getCompanyTimeline } from "@/lib/sai/company-timeline";
import type { TimelineSeverity } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const workflowId = searchParams.get("workflowId") ?? undefined;
  const eventType = searchParams.get("eventType") ?? undefined;
  const severity = searchParams.get("severity") as TimelineSeverity | undefined;
  const search = searchParams.get("search") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? 100);

  try {
    const events = await getCompanyTimeline({
      projectId,
      workflowId,
      eventType,
      severity,
      search,
      limit: Number.isNaN(limit) ? 100 : limit,
    });
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load timeline" },
      { status: 500 },
    );
  }
}
