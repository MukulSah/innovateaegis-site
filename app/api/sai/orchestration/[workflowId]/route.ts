import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  advanceOrchestration,
  getOrchestrationRun,
  pauseOrchestration,
  resumeOrchestration,
} from "@/lib/sai/orchestration";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ workflowId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { workflowId } = await params;
  try {
    const run = await getOrchestrationRun(workflowId);
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load orchestration" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workflowId } = await params;
  const body = await request.json();
  const action = body.action as "advance" | "pause" | "resume";

  try {
    const supabase = createSupabaseAdmin();
    const { data: workflow } = await supabase
      .from("workflow_runs")
      .select("*, projects(name)")
      .eq("id", workflowId)
      .single();

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const projectName = (workflow.projects as { name: string } | null)?.name ?? "Project";

    if (action === "pause") {
      await pauseOrchestration(workflowId);
    } else if (action === "resume") {
      await resumeOrchestration(workflowId, workflow.project_id, workflow.objective, projectName);
    } else {
      await advanceOrchestration(workflowId, workflow.project_id, workflow.objective, projectName);
    }

    revalidatePath("/sai/execution");
    revalidatePath(`/sai/workflows/${workflowId}`);

    const run = await getOrchestrationRun(workflowId);
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Orchestration action failed" },
      { status: 500 },
    );
  }
}
