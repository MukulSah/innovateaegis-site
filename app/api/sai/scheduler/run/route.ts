import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { runAutomationEngine } from "@/lib/sai/session-automation";

function isSchedulerAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return Promise.resolve(true);
  }
  return getSession().then((session) => session?.role === "owner");
}

/** Combined scheduler — run duties, automations, and activate scheduled sessions. */
export async function POST(request: Request) {
  if (!(await isSchedulerAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutomationEngine();
    const { tickAutonomousSessions } = await import("@/lib/sai/session-execution-driver");
    const autonomous = await tickAutonomousSessions().catch(() => ({
      queueProcessed: 0,
      sessionsResumed: [] as string[],
    }));
    return NextResponse.json({
      ok: true,
      ...result,
      autonomous,
      total:
        result.dutySessions.length +
        result.automationSessions.length +
        result.agentAutomationSessions.length +
        result.scheduledSessions.length +
        result.recurringSessions.length +
        result.eventSessions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scheduler failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
