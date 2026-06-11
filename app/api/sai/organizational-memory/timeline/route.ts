import { NextResponse } from "next/server";
import { getExecutiveTimeline } from "@/lib/sai/organizational-memory";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const parsed = limit ? parseInt(limit, 10) : 50;

  try {
    const timeline = await getExecutiveTimeline(parsed);
    return NextResponse.json({ timeline });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load timeline" },
      { status: 500 },
    );
  }
}
