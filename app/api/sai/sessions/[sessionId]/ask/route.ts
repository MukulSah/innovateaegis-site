import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/sai/api-auth";
import { answerSessionCosQuestion } from "@/lib/sai/session-brief";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const result = await answerSessionCosQuestion(sessionId, question);
    if (!result.brief) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session ask failed" },
      { status: 500 },
    );
  }
}
