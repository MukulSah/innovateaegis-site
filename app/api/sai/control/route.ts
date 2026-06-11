import { NextResponse } from "next/server";
import { getControlPanelStats } from "@/lib/sai/workflows";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ stats: await getControlPanelStats() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load control panel" },
      { status: 500 },
    );
  }
}
