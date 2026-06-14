import { getTasks } from "./tasks";
import { getSessionState } from "./session-state-engine";
import { SDLC_WORKFLOW } from "./sdlc";
import type { BlockedTaskDetail, Task } from "./types";

async function resolveBlockReason(task: Task): Promise<Omit<BlockedTaskDetail, "taskId" | "taskName">> {
  if (task.approvalStatus === "rejected") {
    return {
      ownerAgent: task.assignedAgentName ?? null,
      blockReason: "Approval rejected — revision required",
      dependency: task.dependencies[0] ?? null,
      waitingOn: "Founder / governance revision",
      recommendedAction: "Review rejection feedback and resubmit work",
      workflowRunId: task.workflowRunId,
      workflowStepKey: task.workflowStepKey,
      status: task.status,
    };
  }

  if (task.status === "planning" && task.workflowRunId) {
    const state = await getSessionState(task.workflowRunId);
    const stepLabel = task.workflowStepKey
      ? SDLC_WORKFLOW.find((s) => s.key === task.workflowStepKey)?.label ?? task.workflowStepKey
      : null;

    if (state?.sessionStatus === "waiting_approval") {
      return {
        ownerAgent: task.assignedAgentName ?? state.currentAgentName,
        blockReason: "Waiting for founder or governance approval",
        dependency: stepLabel,
        waitingOn: "Pending approval",
        recommendedAction: "Review and approve in Approval Center",
        workflowRunId: task.workflowRunId,
        workflowStepKey: task.workflowStepKey,
        status: task.status,
      };
    }

    if (state && state.workflowStage !== task.workflowStepKey) {
      return {
        ownerAgent: task.assignedAgentName ?? state.currentAgentName,
        blockReason: "Workflow has not reached this step yet",
        dependency: state.currentDeliverable,
        waitingOn: state.currentAgentName ?? "Prior SDLC step",
        recommendedAction: `Wait for ${state.currentAgentName ?? "current agent"} to complete ${state.currentDeliverable ?? "current deliverable"}`,
        workflowRunId: task.workflowRunId,
        workflowStepKey: task.workflowStepKey,
        status: task.status,
      };
    }

    return {
      ownerAgent: task.assignedAgentName ?? null,
      blockReason: "Task not yet released for execution",
      dependency: task.dependencies[0] ?? stepLabel,
      waitingOn: "Workflow progression",
      recommendedAction: "Confirm session execution release and agent assignment",
      workflowRunId: task.workflowRunId,
      workflowStepKey: task.workflowStepKey,
      status: task.status,
    };
  }

  if (task.dependencies.length > 0) {
    return {
      ownerAgent: task.assignedAgentName ?? null,
      blockReason: "Blocked by dependency",
      dependency: task.dependencies.join(", "),
      waitingOn: "Dependency completion",
      recommendedAction: "Complete or unblock dependency tasks first",
      workflowRunId: task.workflowRunId,
      workflowStepKey: task.workflowStepKey,
      status: task.status,
    };
  }

  return {
    ownerAgent: task.assignedAgentName ?? null,
    blockReason: `Task status: ${task.status}`,
    dependency: null,
    waitingOn: null,
    recommendedAction: "Review task in Task Center",
    workflowRunId: task.workflowRunId,
    workflowStepKey: task.workflowStepKey,
    status: task.status,
  };
}

export async function getBlockedTaskDetails(): Promise<BlockedTaskDetail[]> {
  const tasks = await getTasks();
  const blocked = tasks.filter((t) => t.status === "planning" || t.approvalStatus === "rejected");

  return Promise.all(
    blocked.map(async (task) => {
      const detail = await resolveBlockReason(task);
      return {
        taskId: task.id,
        taskName: task.title,
        ...detail,
      };
    }),
  );
}

export async function getBlockedTaskSummary(): Promise<{ count: number; tasks: BlockedTaskDetail[] }> {
  const tasks = await getBlockedTaskDetails();
  return { count: tasks.length, tasks };
}
