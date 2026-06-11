import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { launchWorkflow } from "@/lib/sai/workflows";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Objective title is required" }, { status: 400 });
  }

  try {
    const workflow = await launchWorkflow(projectId, title);
    revalidatePath("/sai/projects");
    revalidatePath(`/sai/projects/${projectId}`);
    revalidatePath("/sai/control");
    revalidatePath("/sai/tasks");
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to launch objective" },
      { status: 500 },
    );
  }
}
