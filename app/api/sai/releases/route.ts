import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { createRelease, getReleases, validateReleaseInput } from "@/lib/sai/releases";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate() {
  for (const path of ["/sai/releases", "/sai", "/sai/analytics"]) revalidatePath(path);
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    return NextResponse.json({ releases: await getReleases() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load releases" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = validateReleaseInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid release data" }, { status: 400 });
  }

  try {
    const release = await createRelease(input);
    revalidate();
    return NextResponse.json({ release }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create release" },
      { status: 500 },
    );
  }
}
