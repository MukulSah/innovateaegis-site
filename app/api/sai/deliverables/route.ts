import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { createDeliverable, getDeliverables, validateDeliverableInput } from "@/lib/sai/deliverables";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate() {
  for (const path of ["/sai/execution", "/sai", "/sai/control"]) {
    revalidatePath(path);
  }
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const deliverables = await getDeliverables({
      projectId: searchParams.get("projectId") ?? undefined,
      workflowId: searchParams.get("workflowId") ?? undefined,
      taskId: searchParams.get("taskId") ?? undefined,
      status: (searchParams.get("status") as Parameters<typeof getDeliverables>[0] extends infer T
        ? T extends { status?: infer S }
          ? S
          : never
        : never) ?? undefined,
    });
    return NextResponse.json({ deliverables });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load deliverables" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = validateDeliverableInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid deliverable data" }, { status: 400 });
  }

  try {
    const deliverable = await createDeliverable(input);
    revalidate();
    return NextResponse.json({ deliverable }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create deliverable" },
      { status: 500 },
    );
  }
}
