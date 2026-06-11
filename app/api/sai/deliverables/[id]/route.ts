import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { getDeliverableById, updateDeliverableStatus } from "@/lib/sai/deliverables";
import type { DeliverableStatus } from "@/lib/sai/types";

type Ctx = { params: Promise<{ id: string }> };

const validStatuses: DeliverableStatus[] = [
  "DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED",
];

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const deliverable = await getDeliverableById(id);
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }
    return NextResponse.json({ deliverable });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load deliverable" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = body.status as DeliverableStatus;

  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const deliverable = await updateDeliverableStatus(id, status);
    revalidatePath("/sai/execution");
    revalidatePath("/sai");
    return NextResponse.json({ deliverable });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update deliverable" },
      { status: 500 },
    );
  }
}
