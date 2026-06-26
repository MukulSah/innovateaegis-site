import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { triggerAgentAutomation } from "@/lib/sai/agent-automation-runner";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const automationId = body.automationId as string | undefined;
  if (!automationId) {
    return NextResponse.json({ error: "automationId required" }, { status: 400 });
  }

  try {
    const result = await triggerAgentAutomation(
      automationId,
      "manual",
      (body.payload as Record<string, string>) ?? {},
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trigger failed" },
      { status: 500 },
    );
  }
}
