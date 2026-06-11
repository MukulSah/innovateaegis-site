import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  deleteActivityLog,
  getActivityLogById,
} from "@/lib/sai/activity-logs";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    const activityLog = await getActivityLogById(id);
    if (!activityLog) {
      return NextResponse.json({ error: "Activity log not found" }, { status: 404 });
    }
    return NextResponse.json({ activityLog });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load activity log" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await deleteActivityLog(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete activity log" },
      { status: 500 },
    );
  }
}
