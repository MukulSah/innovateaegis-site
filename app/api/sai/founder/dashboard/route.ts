import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { getFounderWorkspaceData } from "@/lib/sai/founder-workspace";

export async function GET() {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ workspace: await getFounderWorkspaceData() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
