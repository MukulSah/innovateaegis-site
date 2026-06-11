import { NextResponse } from "next/server";
import { getActivityFeed } from "@/lib/sai/activity-feed";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "50");

  try {
    const activity = await getActivityFeed(limit);
    return NextResponse.json({ activity });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load activity feed" },
      { status: 500 },
    );
  }
}
