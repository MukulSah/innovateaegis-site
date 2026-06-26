import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { getAutomationRuns } from "@/lib/sai/agent-automations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const runs = await getAutomationRuns(id);
    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load runs" },
      { status: 500 },
    );
  }
}
