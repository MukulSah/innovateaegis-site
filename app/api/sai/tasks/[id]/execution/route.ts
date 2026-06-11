import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireAuth } from "@/lib/sai/api-auth";
import {
  getTaskExecutionLogs,
  logTaskExecution,
  validateExecutionInput,
} from "@/lib/sai/task-execution";

type Ctx = { params: Promise<{ id: string }> };

function revalidate() {
  for (const path of ["/sai/tasks", "/sai/execution", "/sai", "/sai/control"]) {
    revalidatePath(path);
  }
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const logs = await getTaskExecutionLogs(id);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load execution logs" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const input = validateExecutionInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid execution data" }, { status: 400 });
  }

  try {
    const log = await logTaskExecution(
      id,
      displayName(user.profile),
      input.action,
      input.notes,
      input.progressPercentage,
    );
    revalidate();
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log execution" },
      { status: 500 },
    );
  }
}
