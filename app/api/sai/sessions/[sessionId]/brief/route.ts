import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/sai/api-auth";
import { getSessionExecutiveBrief } from "@/lib/sai/session-brief";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    const brief = await getSessionExecutiveBrief(sessionId);
    if (!brief) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(brief);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session brief" },
      { status: 500 },
    );
  }
}
