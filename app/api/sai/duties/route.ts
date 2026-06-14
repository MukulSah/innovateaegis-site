import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { getSessionDuties, runDuty, updateDutyStatus, createSessionDutyFromAiPrompt } from "@/lib/sai/session-duties";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const duties = await getSessionDuties();
    return NextResponse.json({ duties });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load duties" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string;
  const dutyId = body.dutyId as string;

  try {
    if (action === "run" && dutyId) {
      const result = await runDuty(dutyId, body.force === true);
      return NextResponse.json(result);
    }
    if (action === "pause" && dutyId) {
      const duty = await updateDutyStatus(dutyId, "paused");
      return NextResponse.json({ duty });
    }
    if (action === "activate" && dutyId) {
      const duty = await updateDutyStatus(dutyId, "active");
      return NextResponse.json({ duty });
    }
    if (action === "create_from_ai" && typeof body.prompt === "string" && body.prompt.trim()) {
      const duty = await createSessionDutyFromAiPrompt(body.prompt.trim());
      return NextResponse.json({ duty });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Duty action failed" },
      { status: 500 },
    );
  }
}
