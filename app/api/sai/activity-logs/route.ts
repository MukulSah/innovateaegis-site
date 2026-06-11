import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  createActivityLog,
  getActivityLogs,
  validateActivityLogInput,
} from "@/lib/sai/activity-logs";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 50);

  try {
    return NextResponse.json({
      activityLogs: await getActivityLogs(Number.isNaN(limit) ? 50 : limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load activity logs" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = validateActivityLogInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid activity log data" }, { status: 400 });
  }

  try {
    const activityLog = await createActivityLog(input);
    return NextResponse.json({ activityLog }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create activity log" },
      { status: 500 },
    );
  }
}
