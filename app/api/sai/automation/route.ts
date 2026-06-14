import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import {
  fireAutomationEvent,
  getAutomationRules,
  triggerAutomationRule,
} from "@/lib/sai/session-automation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rules = await getAutomationRules();
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load automation rules" },
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

  try {
    if (body.action === "trigger" && body.ruleId) {
      const result = await triggerAutomationRule(body.ruleId, body.payload ?? {});
      return NextResponse.json(result);
    }
    if (body.action === "fire_event" && body.eventType) {
      const sessions = await fireAutomationEvent(body.eventType, body.payload ?? {});
      return NextResponse.json({ sessions });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Automation action failed" },
      { status: 500 },
    );
  }
}
