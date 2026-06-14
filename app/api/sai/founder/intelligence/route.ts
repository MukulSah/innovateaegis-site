import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { answerFounderIntelligenceQuestion } from "@/lib/sai/founder-intelligence";

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : null;

  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const result = await answerFounderIntelligenceQuestion(question, projectId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Intelligence query failed" },
      { status: 500 },
    );
  }
}
