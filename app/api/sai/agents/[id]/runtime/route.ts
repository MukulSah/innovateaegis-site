import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { executeAgentWork } from "@/lib/sai/agent-executor";
import {
  getAgentRuntimeSessions,
  getRuntimeSession,
  pauseRuntimeSession,
  resumeRuntimeSession,
  terminateRuntimeSession,
} from "@/lib/sai/agent-runtime";
import { reassignTaskAgent } from "@/lib/sai/tasks";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const sessions = await getAgentRuntimeSessions(id);
    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load sessions" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;
  const body = await request.json();
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const action = body.action as "pause" | "resume" | "terminate" | "retry" | "reassign";

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  try {
    if (action === "reassign") {
      const taskId = typeof body.taskId === "string" ? body.taskId : "";
      const targetAgentId = typeof body.targetAgentId === "string" ? body.targetAgentId : "";
      if (!taskId || !targetAgentId) {
        return NextResponse.json({ error: "taskId and targetAgentId required" }, { status: 400 });
      }
      const task = await reassignTaskAgent(taskId, targetAgentId);
      revalidatePath(`/sai/agents/${agentId}/workspace`);
      revalidatePath(`/sai/organization/agents/${agentId}/workspace`);
      revalidatePath("/sai/organization");
      revalidatePath("/sai/execution");
      return NextResponse.json({ task });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    if (action === "retry") {
      const session = await getRuntimeSession(sessionId);
      if (!session || session.status !== "FAILED") {
        return NextResponse.json({ error: "Only failed sessions can be retried" }, { status: 400 });
      }
      if (!session.workflowId) {
        return NextResponse.json({ error: "Session has no workflow" }, { status: 400 });
      }

      const supabase = createSupabaseAdmin();
      const { data: workflow } = await supabase
        .from("workflow_runs")
        .select("*, projects(name)")
        .eq("id", session.workflowId)
        .single();

      if (!workflow) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }

      const { data: stepRow } = await supabase
        .from("tasks")
        .select("workflow_step_key")
        .eq("id", session.taskId ?? "")
        .maybeSingle();

      const stepKey = (stepRow?.workflow_step_key as string) ?? "requirements";

      const result = await executeAgentWork(agentId, {
        workflowId: session.workflowId,
        projectId: workflow.project_id,
        projectName: (workflow.projects as { name: string } | null)?.name ?? "Project",
        objective: workflow.objective,
        stepKey,
        taskId: session.taskId,
      });

      revalidatePath(`/sai/agents/${agentId}/workspace`);
      revalidatePath(`/sai/organization/agents/${agentId}/workspace`);
      revalidatePath("/sai/organization");
      revalidatePath("/sai/execution");
      revalidatePath("/sai");
      return NextResponse.json({ result });
    }

    let session;
    if (action === "pause") session = await pauseRuntimeSession(sessionId);
    else if (action === "resume") session = await resumeRuntimeSession(sessionId);
    else session = await terminateRuntimeSession(sessionId);

    revalidatePath(`/sai/agents/${agentId}/workspace`);
    revalidatePath(`/sai/organization/agents/${agentId}/workspace`);
    revalidatePath("/sai/organization");
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Runtime action failed" },
      { status: 500 },
    );
  }
}
