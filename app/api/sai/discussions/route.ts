import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  createEntityDiscussion,
  getEntityDiscussions,
  validateDiscussionInput,
} from "@/lib/sai/discussions";
import type { DiscussionEntityType } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as DiscussionEntityType;
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
  }

  try {
    const discussions = await getEntityDiscussions(entityType, entityId);
    return NextResponse.json({ discussions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load discussions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = validateDiscussionInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid discussion data" }, { status: 400 });
  }

  try {
    const discussion = await createEntityDiscussion(input);
    revalidatePath("/sai/inbox");
    return NextResponse.json({ discussion }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create discussion" },
      { status: 500 },
    );
  }
}
