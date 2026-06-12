import { createSessionArtifact } from "./session-artifacts";

/** Record a lightweight executive monitoring artifact without a full agent turn. */
export async function recordExecutiveArtifact(input: {
  workflowRunId: string;
  projectId: string;
  agentId: string;
  stepKey: string;
  artifactName: string;
  content: string;
  artifactType?: string;
}): Promise<string> {
  const artifact = await createSessionArtifact({
    workflowRunId: input.workflowRunId,
    agentId: input.agentId,
    stepKey: input.stepKey,
    inputSummary: "Executive monitoring",
    outputSummary: input.content.slice(0, 3000),
    artifactName: input.artifactName,
    artifactType: input.artifactType ?? "executive_review",
    projectId: input.projectId,
  });
  return artifact.id;
}
