import { NextResponse } from "next/server";
import { getExecutionBoard } from "@/lib/sai/execution";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const board = await getExecutionBoard();
    return NextResponse.json({ board });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load execution board" },
      { status: 500 },
    );
  }
}
