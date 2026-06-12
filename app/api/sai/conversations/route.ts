import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireFounder } from "@/lib/sai/api-auth";
import {
  ConversationClosedError,
  sendFounderMessage,
} from "@/lib/sai/agent-conversation";
import { getSessionChat } from "@/lib/sai/session-chat";

export async function GET(request: Request) {
  const user = await requireFounder();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const objectiveId = searchParams.get("objectiveId") ?? undefined;
  const workflowRunId = searchParams.get("workflowRunId") ?? undefined;
  const artifactId = searchParams.get("artifactId") ?? undefined;

  if (!objectiveId && !workflowRunId) {
    return NextResponse.json({ error: "objectiveId or workflowRunId required" }, { status: 400 });
  }

  try {
    const messages = await getSessionChat({
      objectiveId,
      workflowRunId,
      artifactId,
    });
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load conversation" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const agentId = typeof body.agentId === "string" ? body.agentId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const objectiveId = typeof body.objectiveId === "string" ? body.objectiveId : undefined;
  const workflowRunId = typeof body.workflowRunId === "string" ? body.workflowRunId : undefined;
  const artifactId = typeof body.artifactId === "string" ? body.artifactId : undefined;

  if (!agentId || !message) {
    return NextResponse.json({ error: "agentId and message are required" }, { status: 400 });
  }
  if (!objectiveId && !workflowRunId) {
    return NextResponse.json({ error: "objectiveId or workflowRunId required" }, { status: 400 });
  }

  try {
    const result = await sendFounderMessage({
      agentId,
      message,
      objectiveId,
      workflowRunId,
      artifactId,
      founderName: displayName(user.profile),
    });

    for (const path of ["/sai/executive/ceo", "/sai/founder"]) {
      revalidatePath(path);
    }
    if (objectiveId) revalidatePath(`/sai/executive/ceo?objectiveId=${objectiveId}`);
    if (workflowRunId) revalidatePath(`/sai/workflows/${workflowRunId}`);

    return NextResponse.json({
      messages: [result.founderMessage, result.agentReply],
    });
  } catch (error) {
    if (error instanceof ConversationClosedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Agent not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 },
    );
  }
}
