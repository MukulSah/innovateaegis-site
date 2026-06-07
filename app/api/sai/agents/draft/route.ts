import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { generateAgentDraft, getAgentDrafts } from "@/lib/sai/agent-drafts";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const drafts = await getAgentDrafts("pending_review");
  return NextResponse.json(drafts);
}

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { agentType, context, projectId, taskId } = body as {
    agentType?: string;
    context?: string;
    projectId?: string;
    taskId?: string;
  };

  if (!agentType || !context?.trim()) {
    return NextResponse.json({ error: "Agent type and context are required" }, { status: 400 });
  }

  try {
    const draft = await generateAgentDraft({
      agentType,
      context: context.trim(),
      projectId,
      taskId,
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate draft" },
      { status: 400 },
    );
  }
}
