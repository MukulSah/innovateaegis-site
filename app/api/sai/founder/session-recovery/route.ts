import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { canStartNewSession, getProjectSessionRecovery } from "@/lib/sai/session-recovery";

export async function GET(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    const [recovery, startCheck] = await Promise.all([
      getProjectSessionRecovery(projectId),
      canStartNewSession(projectId),
    ]);
    return NextResponse.json({ recovery, startCheck });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session recovery" },
      { status: 500 },
    );
  }
}
