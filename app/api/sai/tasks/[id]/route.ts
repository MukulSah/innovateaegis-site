import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { deleteTask, updateTask, validateTaskInput } from "@/lib/sai/tasks";

type Ctx = { params: Promise<{ id: string }> };

function revalidate() {
  for (const path of ["/sai/tasks", "/sai/control", "/sai", "/sai/analytics"]) {
    revalidatePath(path);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const input = validateTaskInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid task data" }, { status: 400 });
  }
  try {
    const task = await updateTask(id, input);
    revalidate();
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update task" },
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
    await deleteTask(id);
    revalidate();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete task" },
      { status: 500 },
    );
  }
}
