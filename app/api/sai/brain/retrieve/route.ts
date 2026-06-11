import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/sai/api-auth";
import { retrieveMemoryContext } from "@/lib/sai/brain";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const limit = typeof body.limit === "number" ? body.limit : 20;

  try {
    const contextPackage = await retrieveMemoryContext(query, {
      limit,
      requestedBy: user?.user.id ?? null,
    });
    return NextResponse.json({ context: contextPackage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retrieval failed" },
      { status: 500 },
    );
  }
}
