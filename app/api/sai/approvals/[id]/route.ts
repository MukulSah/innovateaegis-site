import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireFounder } from "@/lib/sai/api-auth";
import {
  getApprovalComments,
  getWorkflowApprovalById,
  processApprovalDecision,
} from "@/lib/sai/governance";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const approval = await getWorkflowApprovalById(id);
    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }
    const comments = await getApprovalComments(id);
    return NextResponse.json({ approval, comments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load approval" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await requireFounder();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const decision = body.decision as "approved" | "rejected" | "revision_required" | "escalated";
  const comments = typeof body.comments === "string" ? body.comments : "";
  const force = body.force === true;

  const valid = ["approved", "rejected", "revision_required", "escalated"];
  if (!valid.includes(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  try {
    const approval = await processApprovalDecision(
      id,
      decision,
      displayName(user.profile),
      comments,
      force,
      user.user.id,
    );
    for (const path of ["/sai/approvals", "/sai/control", "/sai", `/sai/approvals/${id}`]) {
      revalidatePath(path);
    }
    if (approval.workflowId) revalidatePath(`/sai/workflows/${approval.workflowId}`);
    return NextResponse.json({ approval });
  } catch (error) {
    const { ApprovalActivationError } = await import("@/lib/sai/approval-trail");
    if (error instanceof ApprovalActivationError) {
      return NextResponse.json(
        {
          error: error.message,
          trailId: error.trailId,
          steps: error.steps,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 },
    );
  }
}
