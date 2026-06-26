import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { reconcileSessionState } from "@/lib/sai/session-state-engine";
import { triggerStepExecution } from "@/lib/sai/step-execution";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!(await requireFounder())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;

  try {
    const result = await reconcileSessionState(sessionId);
    if (result.repaired && result.resumeExecution) {
      await triggerStepExecution(sessionId, { forceResume: true }).catch(() => {});
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reconciliation failed" },
      { status: 500 },
    );
  }
}
