import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  createMemory,
  getMemories,
  validateMemoryInput,
  type MemoryFilters,
} from "@/lib/sai/memories";
import type { MemoryType } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate() {
  for (const path of ["/sai/memory", "/sai", "/sai/analytics"]) revalidatePath(path);
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const filters: MemoryFilters = {};

  const type = searchParams.get("type");
  if (type) filters.type = type as MemoryType;
  const projectId = searchParams.get("projectId");
  if (projectId) filters.projectId = projectId;
  const search = searchParams.get("search");
  if (search) filters.search = search;

  try {
    return NextResponse.json({ memories: await getMemories(filters) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load memories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = validateMemoryInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid memory data" }, { status: 400 });
  }

  try {
    const memory = await createMemory(input);
    revalidate();
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create memory" },
      { status: 500 },
    );
  }
}
