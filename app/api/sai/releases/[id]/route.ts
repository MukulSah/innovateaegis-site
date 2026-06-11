import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  deleteRelease,
  getReleaseById,
  updateRelease,
  validateReleaseInput,
} from "@/lib/sai/releases";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function revalidate() {
  for (const path of ["/sai/releases", "/sai", "/sai/analytics"]) revalidatePath(path);
}

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    const release = await getReleaseById(id);
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }
    return NextResponse.json({ release });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load release" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const input = validateReleaseInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid release data" }, { status: 400 });
  }

  try {
    const release = await updateRelease(id, input);
    revalidate();
    return NextResponse.json({ release });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update release" },
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
    await deleteRelease(id);
    revalidate();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete release" },
      { status: 500 },
    );
  }
}
