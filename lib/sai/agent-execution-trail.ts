import { recordActivityFeed } from "./activity-feed";
import { recordWorkflowEvent } from "./workflow-events";

export type AgentExecutionTrailEvent =
  | "agent_execution_requested"
  | "agent_execution_started"
  | "agent_execution_completed"
  | "agent_execution_failed";

const EVENT_LABELS: Record<AgentExecutionTrailEvent, string> = {
  agent_execution_requested: "Agent execution requested",
  agent_execution_started: "Agent execution started",
  agent_execution_completed: "Agent execution completed",
  agent_execution_failed: "Agent execution failed",
};

export async function recordAgentExecutionTrail(input: {
  sessionId: string;
  projectId?: string | null;
  agentId?: string | null;
  agentName: string;
  stepKey: string;
  event: AgentExecutionTrailEvent;
  detail?: string;
}): Promise<void> {
  const label = EVENT_LABELS[input.event];
  const description = input.detail
    ? `${input.agentName} · ${input.stepKey} — ${input.detail}`
    : `${input.agentName} · ${input.stepKey}`;

  await recordActivityFeed({
    actor: input.agentName,
    action: input.event,
    targetType: "workflow",
    targetId: input.sessionId,
    description,
  });

  await recordWorkflowEvent({
    workflowId: input.sessionId,
    eventType: input.event,
    actor: input.agentName,
    title: label,
    description,
  });
}
