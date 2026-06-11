import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireAuth } from "@/lib/sai/api-auth";
import { processReviewDecision } from "@/lib/sai/reviews";
import type { ReviewStatus } from "@/lib/sai/types";

type Ctx = { params: Promise<{ id: string }> };

const validStatuses: ReviewStatus[] = ["PENDING", "APPROVED", "CHANGES_REQUESTED", "REJECTED"];

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = body.status as ReviewStatus;
  const comments = typeof body.comments === "string" ? body.comments : "";

  if (!validStatuses.includes(status) || status === "PENDING") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const review = await processReviewDecision(id, status, comments, displayName(user.profile));
    revalidatePath("/sai/execution");
    revalidatePath("/sai");
    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process review" },
      { status: 500 },
    );
  }
}
