import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireAdmin } from "@/lib/sai/api-auth";
import { getWorkflowRuns, launchWorkflow } from "@/lib/sai/workflows";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate(workflowId?: string) {
  for (const path of ["/sai/control", "/sai/tasks", "/sai/projects", "/sai", "/sai/memory"]) {
    revalidatePath(path);
  }
  if (workflowId) revalidatePath(`/sai/workflows/${workflowId}`);
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ workflows: await getWorkflowRuns() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workflows" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const objective = typeof body.objective === "string" ? body.objective.trim() : "";

  if (!projectId || !objective) {
    return NextResponse.json({ error: "projectId and objective are required" }, { status: 400 });
  }

  try {
    const workflow = await launchWorkflow(projectId, objective, "SDLC Workflow", {
      userId: user.user.id,
      name: displayName(user.profile),
    });
    revalidate(workflow.id);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to launch workflow" },
      { status: 500 },
    );
  }
}
