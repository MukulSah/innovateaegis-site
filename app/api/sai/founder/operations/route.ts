import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import {
  executeApprovedFounderAction,
  handleFounderOperationsMessage,
} from "@/lib/sai/founder-operations-chat";
import {
  getFounderOperationsMessages,
  saveFounderOperationsMessage,
} from "@/lib/sai/founder-operations-messages";

export async function GET() {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const messages = await getFounderOperationsMessages(user.user.id);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load messages" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const approveActionId = typeof body.approveActionId === "string" ? body.approveActionId : null;

  if (!question && !approveActionId) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const isApproval = Boolean(approveActionId && /^\s*approve\s*$/i.test(question));
    const userMessage = isApproval ? "Approve" : question;

    if (userMessage) {
      await saveFounderOperationsMessage({
        userId: user.user.id,
        role: "user",
        content: userMessage,
      });
    }

    const result = isApproval
      ? await executeApprovedFounderAction(approveActionId!, user.profile.fullName || "founder")
      : await handleFounderOperationsMessage(question, projectId, approveActionId);

    await saveFounderOperationsMessage({
      userId: user.user.id,
      role: "assistant",
      content: result.answer,
      pendingActionId: result.pendingAction?.id ?? null,
    });
    for (const path of ["/sai/founder", "/sai/executive/ceo", "/sai/executive/coo", "/sai/execution"]) {
      revalidatePath(path);
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operations chat failed" },
      { status: 500 },
    );
  }
}
