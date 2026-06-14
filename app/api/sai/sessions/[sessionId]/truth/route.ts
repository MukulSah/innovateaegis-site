import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/sai/api-auth";
import { getSessionTruth } from "@/lib/sai/session-truth-engine";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  try {
    const truth = await getSessionTruth(sessionId);
    if (!truth) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ truth });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session truth" },
      { status: 500 },
    );
  }
}
