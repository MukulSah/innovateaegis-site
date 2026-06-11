import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  deleteMemory,
  getMemoryById,
  updateMemory,
  validateMemoryInput,
} from "@/lib/sai/memories";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function revalidate() {
  for (const path of ["/sai/memory", "/sai", "/sai/analytics"]) revalidatePath(path);
}

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    const memory = await getMemoryById(id);
    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    return NextResponse.json({ memory });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load memory" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const input = validateMemoryInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid memory data" }, { status: 400 });
  }

  try {
    const memory = await updateMemory(id, input);
    revalidate();
    return NextResponse.json({ memory });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update memory" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await deleteMemory(id);
    revalidate();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete memory" },
      { status: 500 },
    );
  }
}
