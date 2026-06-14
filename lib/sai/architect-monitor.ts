import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { getSessionState } from "./session-state-engine";
import { triggerStepExecution } from "./step-execution";

const ARCHITECT_TIMEOUT_MINUTES = 2;

function minutesSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60);
}

/** Detect architect assigned without architecture_v1 and attempt recovery. */
export async function detectArchitectExecutionFailure(sessionId: string): Promise<boolean> {
  const state = await getSessionState(sessionId);
  if (!state || state.workflowStage !== "design") return false;

  const architectAssigned =
    state.currentAgentName?.toLowerCase().includes("architect") ||
    state.workflowStage === "design";
  if (!architectAssigned) return false;

  const supabase = createSupabaseAdmin();
  const { data: architectureArtifact } = await supabase
    .from("session_artifacts")
    .select("id")
    .eq("workflow_run_id", sessionId)
    .eq("artifact_name", "architecture_v1")
    .maybeSingle();

  if (architectureArtifact) return false;

  const { data: existingFailure } = await supabase
    .from("session_artifacts")
    .select("id")
    .eq("workflow_run_id", sessionId)
    .eq("artifact_name", "architect_execution_failure_v1")
    .maybeSingle();

  if (existingFailure) return true;

  const { data: designHandoff } = await supabase
    .from("session_handoffs")
    .select("created_at")
    .eq("workflow_run_id", sessionId)
    .eq("to_step_key", "design")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: designStep } = await supabase
    .from("workflow_run_steps")
    .select("started_at")
    .eq("workflow_run_id", sessionId)
    .eq("step_key", "design")
    .maybeSingle();

  const assignedAt =
    (designHandoff?.created_at as string | undefined) ??
    (designStep?.started_at as string | undefined);

  if (!assignedAt || minutesSince(assignedAt) < ARCHITECT_TIMEOUT_MINUTES) {
    return false;
  }

  try {
    await triggerStepExecution(sessionId);
    const { data: afterRetry } = await supabase
      .from("session_artifacts")
      .select("id")
      .eq("workflow_run_id", sessionId)
      .eq("artifact_name", "architecture_v1")
      .maybeSingle();
    if (afterRetry) return false;
  } catch {
    // fall through to failure artifact
  }

  const agents = await getAgents();
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo) return false;

  await recordExecutiveArtifact({
    workflowRunId: sessionId,
    projectId: state.projectId,
    agentId: coo.id,
    stepKey: "design",
    artifactName: "architect_execution_failure_v1",
    content: `# Architect Execution Failure

## Session #${state.sessionNumber ?? "—"}
**Architect:** ${state.currentAgentName}
**Stage:** ${state.currentStage ?? "design"}

Architecture was not generated within ${ARCHITECT_TIMEOUT_MINUTES} minutes of assignment.

## Recommended Action
Re-trigger architect execution or verify AI provider configuration.`,
    artifactType: "execution_failure",
  });

  return true;
}
