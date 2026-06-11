import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { executeAgentWork } from "@/lib/sai/agent-executor";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;
  const body = await request.json();

  const workflowId = typeof body.workflowId === "string" ? body.workflowId : "";
  const stepKey = typeof body.stepKey === "string" ? body.stepKey : "requirements";

  if (!workflowId) {
    return NextResponse.json({ error: "workflowId required" }, { status: 400 });
  }

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

    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("workflow_run_id", workflowId)
      .eq("workflow_step_key", stepKey)
      .maybeSingle();

    const result = await executeAgentWork(agentId, {
      workflowId,
      projectId: workflow.project_id,
      projectName: (workflow.projects as { name: string } | null)?.name ?? "Project",
      objective: workflow.objective,
      stepKey,
      taskId: task?.id ?? null,
    });

    revalidatePath(`/sai/agents/${agentId}/workspace`);
    revalidatePath("/sai/execution");
    revalidatePath("/sai");

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent execution failed" },
      { status: 500 },
    );
  }
}
