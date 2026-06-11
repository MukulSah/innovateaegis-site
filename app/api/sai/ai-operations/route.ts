import { NextResponse } from "next/server";
import { getAIOperationsMetrics } from "@/lib/sai/ai-operations";
import { getAIUsageStats } from "@/lib/sai/ai-usage";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const [operations, usage] = await Promise.all([
      getAIOperationsMetrics(),
      getAIUsageStats(),
    ]);
    return NextResponse.json({ operations, usage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load AI operations" },
      { status: 500 },
    );
  }
}
