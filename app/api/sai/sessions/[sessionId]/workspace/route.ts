import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/sai/api-auth";
import { loadSessionWorkspacePayload } from "@/lib/sai/session-workspace-data";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    const payload = await loadSessionWorkspacePayload(sessionId);
    if (!payload) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session workspace" },
      { status: 500 },
    );
  }
}
