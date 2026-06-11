import { NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/sai/knowledge-search";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 30);

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchKnowledge(query, Number.isNaN(limit) ? 30 : limit);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}
