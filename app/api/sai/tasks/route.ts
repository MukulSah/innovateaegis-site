import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { createTask, getTasks, validateTaskInput } from "@/lib/sai/tasks";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate() {
  for (const path of ["/sai/tasks", "/sai/control", "/sai", "/sai/analytics"]) {
    revalidatePath(path);
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ tasks: await getTasks() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const input = validateTaskInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid task data" }, { status: 400 });
  }
  try {
    const task = await createTask(input);
    revalidate();
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 500 },
    );
  }
}
