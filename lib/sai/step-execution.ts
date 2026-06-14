import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getWorkflowRunById } from "./workflows";
import { getOrchestrationRun, resumeOrchestration } from "./orchestration";
import { guardRecoveryFromCompletedSession } from "./session-finalization-engine";

/** Resume orchestration for the current in-progress step, creating a run if missing. */
export async function triggerStepExecution(sessionId: string): Promise<boolean> {
  const guard = await guardRecoveryFromCompletedSession(sessionId);
  if (!guard.allowRecovery) return false;

  const workflow = await getWorkflowRunById(sessionId);
  if (!workflow) return false;

  const { isSessionExecutable } = await import("./session-state-engine");
  if (!(await isSessionExecutable(sessionId))) return false;

  const supabase = createSupabaseAdmin();
  let orchestration = await getOrchestrationRun(sessionId);

  if (!orchestration) {
    await supabase.from("orchestration_runs").upsert(
      {
        workflow_id: sessionId,
        status: "RUNNING",
        execution_mode: "supervised",
        started_at: new Date().toISOString(),
      },
      { onConflict: "workflow_id" },
    );
    orchestration = await getOrchestrationRun(sessionId);
  }

  if (!orchestration || orchestration.status === "COMPLETED" || orchestration.status === "PAUSED") {
    return false;
  }

  if (orchestration.status === "FAILED") {
    await supabase.from("orchestration_runs").update({ status: "RUNNING" }).eq("workflow_id", sessionId);
  }

  await resumeOrchestration(
    sessionId,
    workflow.projectId,
    workflow.objective,
    workflow.projectName ?? "Project",
  );
  return true;
}
