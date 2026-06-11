import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  advanceWorkflowStep,
  deleteWorkflowRun,
  getWorkflowRunById,
  updateWorkflowStatus,
} from "@/lib/sai/workflows";
import type { WorkflowStatus } from "@/lib/sai/types";

type Ctx = { params: Promise<{ id: string }> };

function revalidate(id: string) {
  for (const path of ["/sai/control", "/sai/tasks", "/sai", `/sai/workflows/${id}`]) {
    revalidatePath(path);
  }
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const workflow = await getWorkflowRunById(id);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workflow" },
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

  if (body.action === "advance" && typeof body.stepId === "string") {
    try {
      const workflow = await advanceWorkflowStep(
        id,
        body.stepId,
        typeof body.output === "string" ? body.output : "Step completed",
      );
      revalidate(id);
      return NextResponse.json({ workflow });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to advance workflow" },
        { status: 500 },
      );
    }
  }

  const actionStatusMap: Record<string, WorkflowStatus> = {
    pause: "paused",
    resume: "running",
  };

  const status = (actionStatusMap[body.action as string] ?? body.status) as WorkflowStatus;
  const statuses: WorkflowStatus[] = ["running", "completed", "blocked", "paused"];

  if (!statuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status or action" }, { status: 400 });
  }

  try {
    const workflow = await updateWorkflowStatus(id, status);
    revalidate(id);
    return NextResponse.json({ workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update workflow" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteWorkflowRun(id);
    revalidate(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete workflow" },
      { status: 500 },
    );
  }
}
