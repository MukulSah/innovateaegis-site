import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getWorkflowRunById } from "./workflows";
import { getOrchestrationRun, resumeOrchestration } from "./orchestration";
import { guardRecoveryFromCompletedSession } from "./session-finalization-engine";

type TriggerOptions = {
  /** Allow resume when session is waiting on AI capacity (founder / recovery resume). */
  forceResume?: boolean;
};

/** Resume orchestration for the current in-progress step, creating a run if missing. */
export async function triggerStepExecution(
  sessionId: string,
  options?: TriggerOptions,
): Promise<boolean> {
  const guard = await guardRecoveryFromCompletedSession(sessionId);
  if (!guard.allowRecovery) return false;

  const workflow = await getWorkflowRunById(sessionId);
  if (!workflow) return false;

  const supabase = createSupabaseAdmin();
  if (options?.forceResume) {
    await supabase
      .from("workflow_runs")
      .update({ session_status: "executing", stalled_at: null })
      .eq("id", sessionId)
      .in("session_status", ["waiting_for_ai_capacity", "stalled", "recovery"]);
  }

  const { isSessionExecutable } = await import("./session-state-engine");
  if (!(await isSessionExecutable(sessionId, options?.forceResume))) return false;

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

  if (!orchestration || orchestration.status === "PAUSED") {
    return false;
  }

  if (orchestration.status === "COMPLETED" && !options?.forceResume) {
    return false;
  }

  if (orchestration.status === "FAILED" || orchestration.status === "COMPLETED") {
    await supabase
      .from("orchestration_runs")
      .update({ status: "RUNNING", completed_at: null })
      .eq("workflow_id", sessionId);
  }

  await resumeOrchestration(
    sessionId,
    workflow.projectId,
    workflow.objective,
    workflow.projectName ?? "Project",
  );
  return true;
}
