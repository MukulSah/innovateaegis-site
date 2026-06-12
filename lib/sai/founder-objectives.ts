import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { executeAgentWork } from "./agent-executor";
import { findAgentForRole, getAgents } from "./agents";
import { recordActivityFeed } from "./activity-feed";
import { requestWorkflowApproval } from "./governance";
import { notifyFounder } from "./notifications";
import { createProjectObjective, linkObjectiveWorkflow } from "./project-objectives";
import { addTimelineEvent } from "./project-timeline";
import { getProjectGovernance } from "./governance";
import {
  assertNoActiveSession,
  getNextSessionNumber,
  resolveExecutiveAgents,
  updateSessionFields,
} from "./session-manager";
import { SDLC_WORKFLOW, SESSION_START_STEP_INDEX } from "./sdlc";
import { recommendAssignment } from "./task-assignment";
import { assignAgentsToTask } from "./task-assignments";
import { createTask } from "./tasks";
import { getEmployees } from "./employees";
import { syncAgentGroupMembers } from "./agent-groups";
import { syncProjectTaskCounts } from "./projects";
import { addProjectMemory } from "./project-memory";
import { startOrchestration, shouldAutoOrchestrate } from "./orchestration";
import { getWorkflowRunById } from "./workflows";
import { appendTrailStep } from "./approval-trail";
import { parseCooExecutionPlan } from "./coo-execution-plan";
import { nullableUuid, findEmptyUuidFields } from "./nullable-uuid";
import { transitionSessionState } from "./session-state";
import type { ProjectObjective, WorkflowRun } from "./types";

async function logTrailStep(
  trailId: string | undefined,
  step: {
    key: string;
    label: string;
    status: "completed" | "failed";
    error?: string;
    table?: string;
    field?: string;
    value?: string;
  },
) {
  if (!trailId) return;
  await appendTrailStep(trailId, step);
}

export class FounderObjectiveStepError extends Error {
  constructor(
    public readonly step: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FounderObjectiveStepError";
  }
}

function wrapStep<T>(step: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    if (error instanceof FounderObjectiveStepError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[founder-objectives] ${step} failed:`, error);
    throw new FounderObjectiveStepError(step, message, error);
  });
}

function parseStrategicBrief(output: string): Record<string, unknown> {
  const priorityMatch = output.match(/priority[:\s]*(high|medium|low|critical)/i);
  const outcomeMatch = output.match(/expected outcome[:\s]*(.+?)(?:\n|$)/i);
  const metricMatch = output.match(/success metric[s]?[:\s]*(.+?)(?:\n|$)/i);
  return {
    raw: output.slice(0, 5000),
    priority: priorityMatch?.[1]?.toLowerCase() ?? "high",
    expectedOutcome: outcomeMatch?.[1]?.trim() ?? "",
    successMetric: metricMatch?.[1]?.trim() ?? "",
    approvedAt: null,
  };
}

export async function submitFounderObjective(
  projectId: string,
  objective: string,
  actor?: { userId?: string | null; name: string },
) {
  await wrapStep("session_check", () => assertNoActiveSession(projectId));

  const supabase = createSupabaseAdmin();
  const { data: projectRow } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();
  const projectName = projectRow?.name ?? "Project";

  const objectiveRecord = await wrapStep("create_objective", () =>
    createProjectObjective(
      projectId,
      objective,
      objective,
      null,
      nullableUuid(actor?.userId),
      "pending_ceo",
    ),
  );

  try {
    const { appendSessionChat } = await import("./session-chat");
    await appendSessionChat({
      objectiveId: objectiveRecord.id,
      projectId,
      speakerType: "founder",
      speakerName: actor?.name ?? "Founder",
      speakerRole: "Founder",
      message: objective,
      stepKey: "objective_submitted",
      messageKind: "chat",
    });
  } catch {
    // Session chat is best-effort
  }

  const agents = await wrapStep("resolve_ceo", async () => {
    const list = await getAgents();
    const ceo = findAgentForRole(list, ["CEO", "Chief Executive"]);
    if (!ceo) {
      throw new FounderObjectiveStepError(
        "resolve_ceo",
        "CEO Agent not found — create one in Agent Factory.",
      );
    }
    return { list, ceo };
  });

  const { ceo } = agents;

  const { output } = await wrapStep("ceo_strategy", () =>
    executeAgentWork(ceo.id, {
      workflowId: null,
      projectId,
      projectName,
      objective,
      stepKey: "ceo_strategy",
      objectiveId: objectiveRecord.id,
    }),
  );

  const strategicBrief = parseStrategicBrief(output);

  await wrapStep("persist_brief", async () => {
    const { error } = await supabase
      .from("project_objectives")
      .update({ strategic_brief: strategicBrief, status: "pending_founder" })
      .eq("id", objectiveRecord.id);
    if (error) throw new Error(error.message);
  });

  const { approval } = await wrapStep("strategic_approval", () =>
    requestWorkflowApproval({
      workflowId: null,
      projectId,
      approvalType: "strategic_objective",
      title: `Strategic objective: ${objective}`,
      description: `CEO Agent recommends priority: ${strategicBrief.priority}. Review and approve to activate session.`,
      requestedBy: ceo.name,
      artifactContent: output,
      context: { objectiveId: objectiveRecord.id },
    }),
  );

  await wrapStep("notify_founder", async () => {
    await notifyFounder(
      `Approval Required: Strategic Objective`,
      `Project: ${projectName}\nAgent: ${ceo.name}\nArtifact: strategic_brief_v1\nPriority: ${strategicBrief.priority}\n\nApprove strategy to activate COO session.`,
      "APPROVAL",
      { severity: "HIGH", entityType: "approval", entityId: approval.id },
    );

    await addTimelineEvent({
      projectId,
      eventType: "ceo_strategy_complete",
      title: `CEO validated strategy: ${objective}`,
      description: `Priority: ${strategicBrief.priority}`,
      actorName: ceo.name,
      metadata: { objectiveId: objectiveRecord.id },
    });
  });

  const { getObjectiveArtifacts } = await import("./session-artifacts");
  const artifacts = await getObjectiveArtifacts(objectiveRecord.id);
  const ceoArtifact = artifacts.find((a) => a.stepKey === "ceo_strategy") ?? null;

  const updated = await getObjectiveById(objectiveRecord.id);
  return {
    objective: updated!,
    ceoOutput: output,
    ceoAgent: { id: ceo.id, name: ceo.name, role: ceo.role },
    projectName,
    strategicBrief,
    artifact: ceoArtifact,
    approvalId: approval.id,
  };
}

export async function getObjectiveById(id: string): Promise<ProjectObjective | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_objectives")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    projectId: data.project_id,
    title: data.title,
    description: data.description,
    status: data.status,
    workflowRunId: data.workflow_run_id,
    strategicBrief: (data.strategic_brief as Record<string, unknown>) ?? {},
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}

export async function activateSession(
  objectiveId: string,
  actor?: { userId?: string | null; name: string },
  trailId?: string,
): Promise<WorkflowRun> {
  const objective = await getObjectiveById(objectiveId);
  if (!objective) {
    await logTrailStep(trailId, {
      key: "session_activation_failed",
      label: "Session Activation Failed",
      status: "failed",
      error: "Objective not found",
    });
    throw new Error("Objective not found");
  }
  if (objective.status !== "pending_founder" && objective.status !== "pending_ceo") {
    await logTrailStep(trailId, {
      key: "session_activation_failed",
      label: "Session Activation Failed",
      status: "failed",
      error: "Objective is not awaiting activation",
    });
    throw new Error("Objective is not awaiting activation");
  }

  try {
    await assertNoActiveSession(objective.projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Active session exists";
    await logTrailStep(trailId, {
      key: "session_activation_failed",
      label: "Session Activation Failed",
      status: "failed",
      error: message,
    });
    throw error;
  }

  const supabase = createSupabaseAdmin();
  const [agents, employees, projectRow, executives] = await Promise.all([
    getAgents(),
    getEmployees(),
    supabase.from("projects").select("name").eq("id", objective.projectId).maybeSingle(),
    resolveExecutiveAgents(),
  ]);

  await syncAgentGroupMembers(agents);
  const projectName = projectRow.data?.name ?? "Project";
  const { workflowMode } = await getProjectGovernance(objective.projectId);
  const sessionNumber = await getNextSessionNumber(objective.projectId);
  const actorName = actor?.name ?? "Founder";

  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo) {
    await logTrailStep(trailId, {
      key: "coo_not_found",
      label: "COO Agent Not Found",
      status: "failed",
      error: "Create a COO agent in Agent Factory",
    });
    throw new Error("COO Agent not found — create one in Agent Factory.");
  }

  await logTrailStep(trailId, {
    key: "coo_resolved",
    label: "COO Agent Resolved",
    status: "completed",
  });

  const runPayload = {
    project_id: objective.projectId,
    name: `Session #${sessionNumber}`,
    objective: objective.title,
    owner: actorName,
    status: "running",
    workflow_mode: workflowMode,
    governance_status: "normal",
    current_step_index: SESSION_START_STEP_INDEX,
    session_number: sessionNumber,
    executive_sponsor_agent_id: nullableUuid(executives.ceo?.id),
    session_owner_agent_id: coo.id,
    current_stage: "Requirements",
    session_status: "pending_coo",
    strategic_brief: objective.strategicBrief,
    created_by: nullableUuid(actor?.userId),
  };

  const emptyUuid = findEmptyUuidFields(runPayload, [
    "project_id",
    "executive_sponsor_agent_id",
    "session_owner_agent_id",
    "created_by",
  ]);
  if (emptyUuid) {
    await logTrailStep(trailId, {
      key: "session_creation_failed",
      label: "Session Creation Failed",
      status: "failed",
      error: `invalid input syntax for type uuid: "${emptyUuid.value}"`,
      table: "workflow_runs",
      field: emptyUuid.field,
      value: emptyUuid.value,
    });
    throw new Error(`invalid input syntax for type uuid: "${emptyUuid.value}"`);
  }

  const { data: run, error: runError } = await supabase
    .from("workflow_runs")
    .insert(runPayload)
    .select("*, projects(name)")
    .single();

  if (runError) {
    await logTrailStep(trailId, {
      key: "session_creation_failed",
      label: "Session Creation Failed",
      status: "failed",
      error: runError.message,
      table: "workflow_runs",
      field: runError.message.includes("created_by") ? "created_by" : undefined,
    });
    throw new Error(runError.message);
  }

  await logTrailStep(trailId, {
    key: "session_created",
    label: "Session Created",
    status: "completed",
  });

  await linkObjectiveWorkflow(objectiveId, run.id);
  await supabase
    .from("project_objectives")
    .update({ status: "active", strategic_brief: { ...objective.strategicBrief, approvedAt: new Date().toISOString() } })
    .eq("id", objectiveId);

  await transitionSessionState(run.id, "pending_coo", "planning", coo.id);

  await logTrailStep(trailId, {
    key: "coo_turn_started",
    label: "COO Turn Started",
    status: "completed",
  });

  let cooOutput: string;
  try {
    const result = await executeAgentWork(coo.id, {
      workflowId: run.id,
      projectId: objective.projectId,
      projectName,
      objective: objective.title,
      stepKey: "coo_execution",
      strategicBrief: objective.strategicBrief,
    });
    cooOutput = result.output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "COO turn failed";
    await logTrailStep(trailId, {
      key: "coo_turn_failed",
      label: "COO Turn Failed",
      status: "failed",
      error: message,
    });
    throw error;
  }

  await logTrailStep(trailId, {
    key: "coo_turn_completed",
    label: "COO Turn Completed",
    status: "completed",
  });

  const cooPlan = parseCooExecutionPlan(cooOutput, {
    project: projectName,
    objective: objective.title,
    strategicBrief: objective.strategicBrief,
  });

  const { postExecutiveMessage } = await import("./executive-session-chat");
  const { runCooExecutionReadinessReview } = await import("./execution-readiness");
  const readiness = await runCooExecutionReadinessReview({
    sessionId: run.id,
    projectId: objective.projectId,
    cooAgentId: coo.id,
  });

  await updateSessionFields(run.id, {
    currentStage: readiness.ready ? "Requirements" : "Execution Readiness",
    sessionStatus: readiness.ready ? "executing" : "planning",
    strategicBrief: {
      ...objective.strategicBrief,
      cooPlan,
      cooPlanRaw: cooOutput.slice(0, 2000),
      executionReadiness: {
        status: readiness.status,
        ready: readiness.ready,
        gaps: readiness.gaps,
        checkedAt: new Date().toISOString(),
      },
    },
  });

  if (!readiness.ready) {
    await postExecutiveMessage(
      coo,
      run.id,
      `Execution NOT READY. Release blocked until: ${readiness.gaps.join(", ")}. Configure resources in Resource Center.`,
      { projectId: objective.projectId, stepKey: "execution_readiness", artifactName: "coo_execution_readiness_v1" },
    );
  }

  const { runCeoSessionMonitor } = await import("./ceo-monitor");
  const successMetric = String(objective.strategicBrief.successMetric ?? "objective completion");
  if (ceo) {
    await postExecutiveMessage(
      ceo,
      run.id,
      `Objective approved. Success metric: ${successMetric}. Monitoring session execution as executive sponsor.`,
      { projectId: objective.projectId, stepKey: "ceo_strategy", artifactName: "strategic_brief_v1" },
    );
  }
  await postExecutiveMessage(
    coo,
    run.id,
    `Execution plan created. Required agents: ${cooPlan.requiredAgents.join(", ")}. Recommendation: ${cooPlan.recommendation}.`,
    { projectId: objective.projectId, stepKey: "coo_execution", artifactName: "coo_execution_plan_v1" },
  );
  try {
    await runCeoSessionMonitor(run.id, { event: "session_activated" });
  } catch {
    // CEO monitoring is best-effort at activation
  }

  for (let i = 0; i < SDLC_WORKFLOW.length; i++) {
    const step = SDLC_WORKFLOW[i];
    const roleAgent = findAgentForRole(agents, step.matchRoles);
    const recommendation = recommendAssignment(
      {
        title: step.taskTitle,
        description: step.taskDescription,
        workflowStepKey: step.key,
        projectId: objective.projectId,
      },
      agents,
      employees,
    );
    const assignedAgentId = roleAgent?.id ?? recommendation.agentId;
    const isPreDone = step.skipOnSessionActivate || step.passiveOnly;
    const isFirstActive = i === SESSION_START_STEP_INDEX;

    await supabase.from("workflow_run_steps").insert({
      workflow_run_id: run.id,
      step_key: step.key,
      step_label: step.label,
      step_order: i,
      assigned_agent_id: assignedAgentId,
      status: isPreDone ? "completed" : isFirstActive ? "in_progress" : "pending",
      started_at: isPreDone || isFirstActive ? new Date().toISOString() : null,
      completed_at: isPreDone ? new Date().toISOString() : null,
    });

    if (!isPreDone) {
      const task = await createTask({
        projectId: objective.projectId,
        title: step.taskTitle,
        description: `${step.taskDescription}\n\nObjective: ${objective.title}`,
        priority: i < SESSION_START_STEP_INDEX + 3 ? "high" : "medium",
        dependencies: [],
        acceptanceCriteria: [`Complete ${step.label}`],
        objectiveId,
        assignedAgentId,
        assignedEmployeeId: recommendation.employeeId,
        status: step.taskStatus,
        evidence: "",
        comments: [recommendation.reason],
        approvalStatus: step.governanceApproval || step.approvalType ? "pending" : "none",
        workflowRunId: run.id,
        workflowStepKey: step.key,
      });

      await supabase.from("project_deliverables").insert({
        project_id: objective.projectId,
        workflow_run_id: run.id,
        workflow_step_key: step.key,
        deliverable_type: step.deliverableType,
        title: step.deliverableTitle,
        content: `Pending: ${step.taskDescription}`,
      });

      await assignAgentsToTask(task.id, step.key, agents);
    }
  }

  await addProjectMemory({
    projectId: objective.projectId,
    memoryType: "decision",
    title: `Session #${sessionNumber} activated`,
    summary: objective.title,
    sourceType: "session",
    sourceId: run.id,
  });

  await recordActivityFeed({
    actor: coo.name,
    action: "session_activated",
    targetType: "workflow",
    targetId: run.id,
    description: objective.title,
  });

  if (readiness.ready) {
    try {
      const { releaseExecution } = await import("./execution-release");
      await releaseExecution({
        sessionId: run.id,
        projectId: objective.projectId,
        cooAgentId: coo.id,
      });
      await transitionSessionState(run.id, "planning", "executing", coo.id);
      await logTrailStep(trailId, {
        key: "execution_released",
        label: "Execution Release Completed",
        status: "completed",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execution release failed";
      await logTrailStep(trailId, {
        key: "execution_release_failed",
        label: "Execution Release Failed",
        status: "failed",
        error: message,
      });
      const { recordExecutionReleaseFailure } = await import("./execution-release");
      await recordExecutionReleaseFailure({
        sessionId: run.id,
        projectId: objective.projectId,
        cooAgentId: coo.id,
        reason: message,
      });
    }
  }

  const useAI = await shouldAutoOrchestrate();
  if (useAI && workflowMode !== "manual" && readiness.ready) {
    const pmAgent = findAgentForRole(agents, ["Product Manager", "PM"]);
    if (pmAgent) {
      try {
        const { executeAgentWork } = await import("./agent-executor");
        await executeAgentWork(pmAgent.id, {
          workflowId: run.id,
          projectId: objective.projectId,
          projectName,
          objective: objective.title,
          stepKey: "requirements",
          strategicBrief: objective.strategicBrief,
        });
      } catch {
        await logTrailStep(trailId, {
          key: "orchestration_started",
          label: "Orchestration Started",
          status: "completed",
        });
        await startOrchestration(run.id, objective.projectId, objective.title, projectName, workflowMode);
      }
    }
  }

  await logTrailStep(trailId, {
    key: "session_activation_completed",
    label: "Session Activation Completed",
    status: "completed",
  });

  await syncProjectTaskCounts(objective.projectId);
  return (await getWorkflowRunById(run.id))!;
}
