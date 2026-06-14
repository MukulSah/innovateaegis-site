"use server";

import { revalidatePath } from "next/cache";
import { displayName } from "./api-auth";
import { getCurrentUser } from "./current-user.server";
import { isFounder } from "./current-user.types";
import { processApprovalDecision } from "./governance";

export type ApprovalDecision = "approved" | "rejected" | "revision_required" | "escalated";

export async function decideApprovalAction(
  approvalId: string,
  decision: ApprovalDecision,
  comments = "",
) {
  const ctx = await getCurrentUser();
  if (!ctx || !isFounder(ctx.profile)) {
    throw new Error("Unauthorized — founder access required");
  }

  const approval = await processApprovalDecision(
    approvalId,
    decision,
    displayName(ctx.profile),
    comments,
    false,
    ctx.user.id,
  );

  for (const path of [
    "/sai/founder",
    "/sai/sessions",
    "/sai/approvals",
    "/sai/control",
    "/sai",
  ]) {
    revalidatePath(path);
  }
  if (approval.workflowId) {
    revalidatePath(`/sai/sessions/${approval.workflowId}`);
    revalidatePath(`/sai/workflows/${approval.workflowId}`);
  }

  return approval;
}
