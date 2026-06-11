import { NextResponse } from "next/server";
import { getMemoryStory } from "@/lib/sai/organizational-memory";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const storyKey = searchParams.get("storyKey") ?? searchParams.get("projectId");
  if (!storyKey) {
    return NextResponse.json({ error: "storyKey or projectId required" }, { status: 400 });
  }

  try {
    const steps = await getMemoryStory(storyKey);
    return NextResponse.json({ storyKey, steps });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load story" },
      { status: 500 },
    );
  }
}
