import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { getFounderSessionTimeline, type FounderSessionBucket } from "@/lib/sai/founder-timeline";

export async function GET(request: Request) {
  if (!(await requireFounder())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const bucket = searchParams.get("bucket") ?? undefined;

  try {
    const timeline = await getFounderSessionTimeline({
      projectId,
      search,
      bucket: bucket as FounderSessionBucket | undefined,
    });
    return NextResponse.json(timeline);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load timeline" },
      { status: 500 },
    );
  }
}
