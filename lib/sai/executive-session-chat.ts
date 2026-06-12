import { appendSessionChat } from "./session-chat";
import type { Agent } from "./types";

/** Post a message from an executive or agent into the permanent session narrative. */
export async function postSessionChatMessage(input: {
  workflowRunId: string;
  projectId?: string | null;
  speakerType: "founder" | "agent" | "system";
  speakerName: string;
  speakerRole?: string | null;
  message: string;
  agentId?: string | null;
  stepKey?: string | null;
  artifactName?: string | null;
}): Promise<void> {
  try {
    const { touchSessionActivity } = await import("./session-manager");
    await touchSessionActivity(input.workflowRunId);
    await appendSessionChat({
      workflowRunId: input.workflowRunId,
      projectId: input.projectId,
      speakerType: input.speakerType,
      speakerName: input.speakerName,
      speakerRole: input.speakerRole,
      message: input.message,
      agentId: input.agentId,
      stepKey: input.stepKey,
      artifactName: input.artifactName,
      messageKind: "chat",
    });
  } catch {
    // Session chat is best-effort
  }
}

export async function postAgentSessionMessage(
  agent: Pick<Agent, "id" | "name" | "role">,
  workflowRunId: string,
  message: string,
  opts?: { projectId?: string; stepKey?: string; artifactName?: string },
): Promise<void> {
  await postSessionChatMessage({
    workflowRunId,
    projectId: opts?.projectId,
    speakerType: "agent",
    speakerName: agent.name,
    speakerRole: agent.role,
    message,
    agentId: agent.id,
    stepKey: opts?.stepKey,
    artifactName: opts?.artifactName,
  });
}

export async function postExecutiveMessage(
  agent: Pick<Agent, "id" | "name" | "role">,
  workflowRunId: string,
  message: string,
  opts?: { projectId?: string; stepKey?: string; artifactName?: string },
): Promise<void> {
  await postAgentSessionMessage(agent, workflowRunId, message, opts);
}

export async function postSystemSessionMessage(
  workflowRunId: string,
  message: string,
  opts?: { projectId?: string; stepKey?: string; artifactName?: string },
): Promise<void> {
  await postSessionChatMessage({
    workflowRunId,
    projectId: opts?.projectId,
    speakerType: "system",
    speakerName: "System",
    speakerRole: "SAI Runtime",
    message,
    stepKey: opts?.stepKey,
    artifactName: opts?.artifactName,
  });
}
