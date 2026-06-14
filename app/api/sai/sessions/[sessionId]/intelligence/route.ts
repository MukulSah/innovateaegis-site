import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/sai/api-auth";
import { extractSessionIntelligence, getSessionIntelligence } from "@/lib/sai/session-intelligence";
import { getWorkflowRunById } from "@/lib/sai/workflows";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const intelligence = await getSessionIntelligence(sessionId);
  return NextResponse.json({ intelligence });
}

export async function POST(_request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const workflow = await getWorkflowRunById(sessionId);
  if (!workflow) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const intelligence = await extractSessionIntelligence(sessionId, workflow.projectId, {
      objective: workflow.objective,
      sessionNumber: workflow.sessionNumber,
      deliveryOutcome: null,
      sessionStatus: workflow.sessionStatus,
    });
    return NextResponse.json({ intelligence });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 },
    );
  }
}
