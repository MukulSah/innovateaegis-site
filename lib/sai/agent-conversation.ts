import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgentAIConfig } from "./agent-ai-config";
import { getCompanyAISettings } from "./ai-settings";
import { generateAICompletion } from "./ai-client";
import { getDefaultAIProvider, getProviderWithKey } from "./ai-providers";
import { getAgentById } from "./agents";
import { getAgentContext } from "./context-engine";
import type { AgentExecutionContext } from "./agent-executor";
import { getObjectiveById } from "./founder-objectives";
import { getWorkflowApprovals } from "./governance";
import { appendSessionChat, getSessionChat, type SessionChatMessage } from "./session-chat";
export class ConversationClosedError extends Error {
  constructor(message = "Conversation is closed — artifact already approved or rejected") {
    super(message);
    this.name = "ConversationClosedError";
  }
}

async function resolveModelConfig(agentId: string) {
  const [settings, agentConfig, defaultProvider] = await Promise.all([
    getCompanyAISettings(),
    getAgentAIConfig(agentId),
    getDefaultAIProvider(),
  ]);

  if (settings.modelMode === "per_agent" && agentConfig?.enabled && agentConfig.providerId) {
    const providerData = await getProviderWithKey(agentConfig.providerId);
    if (providerData?.provider.enabled) {
      return {
        providerName: providerData.provider.providerName,
        apiKey: providerData.apiKey,
        endpoint: providerData.provider.endpoint,
        model: agentConfig.model ?? providerData.provider.model,
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens,
        systemPrompt: agentConfig.systemPrompt,
      };
    }
  }

  if (!defaultProvider?.apiKey) return null;

  return {
    providerName: defaultProvider.provider.providerName,
    apiKey: defaultProvider.apiKey,
    endpoint: defaultProvider.provider.endpoint,
    model: defaultProvider.provider.model,
    temperature: agentConfig?.temperature ?? 0.7,
    maxTokens: agentConfig?.maxTokens ?? 2048,
    systemPrompt: agentConfig?.systemPrompt ?? "",
  };
}

function buildConversationalPrompt(agentRole: string, artifactName: string): string {
  return `You are the ${agentRole}. The founder is reviewing your ${artifactName || "deliverable"}.

Answer questions clearly and concisely. Clarify success metrics, priorities, and strategic decisions when asked.
Explain your reasoning when challenged. Stay in character as an executive team member.

Do NOT regenerate the full artifact unless the founder explicitly asks for revisions.
Keep responses focused and actionable — this is a live review conversation, not a document rewrite.`;
}

function formatChatHistory(messages: SessionChatMessage[]): string {
  return messages
    .filter((m) => m.messageKind === "chat" || m.messageKind === "artifact")
    .map((m) => `${m.speakerName} (${m.speakerType}): ${m.message}`)
    .join("\n\n");
}

async function resolveArtifactContext(artifactId?: string | null): Promise<{
  artifactName: string;
  artifactOutput: string;
  stepKey: string;
  projectId: string | null;
}> {
  if (!artifactId) {
    return { artifactName: "", artifactOutput: "", stepKey: "", projectId: null };
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("session_artifacts")
    .select("artifact_name, output_summary, step_key, objective_id, workflow_run_id")
    .eq("id", artifactId)
    .maybeSingle();

  if (!data) {
    return { artifactName: "", artifactOutput: "", stepKey: "", projectId: null };
  }

  let projectId: string | null = null;
  if (data.objective_id) {
    const objective = await getObjectiveById(data.objective_id);
    projectId = objective?.projectId ?? null;
  } else if (data.workflow_run_id) {
    const { data: wf } = await supabase
      .from("workflow_runs")
      .select("project_id")
      .eq("id", data.workflow_run_id)
      .maybeSingle();
    projectId = wf?.project_id ?? null;
  }

  return {
    artifactName: data.artifact_name ?? "",
    artifactOutput: data.output_summary ?? "",
    stepKey: data.step_key ?? "",
    projectId,
  };
}

export async function isConversationOpen(filters: {
  objectiveId?: string;
  workflowRunId?: string;
  artifactId?: string;
}): Promise<boolean> {
  if (filters.objectiveId) {
    const objective = await getObjectiveById(filters.objectiveId);
    if (!objective) return false;
    if (objective.status === "pending_founder") return true;

    const approvals = await getWorkflowApprovals({
      projectId: objective.projectId,
      status: "pending",
    });
    return approvals.some((a) => a.approvalType === "strategic_objective");
  }

  if (filters.workflowRunId && filters.artifactId) {
    const supabase = createSupabaseAdmin();
    const { data: artifact } = await supabase
      .from("session_artifacts")
      .select("step_key, workflow_run_id")
      .eq("id", filters.artifactId)
      .maybeSingle();

    if (!artifact?.workflow_run_id) return false;

    const approvals = await getWorkflowApprovals({
      workflowId: artifact.workflow_run_id,
      status: "pending",
    });
    return approvals.length > 0;
  }

  return false;
}

export async function sendFounderMessage(input: {
  agentId: string;
  message: string;
  objectiveId?: string;
  workflowRunId?: string;
  artifactId?: string;
  founderName: string;
}): Promise<{ founderMessage: SessionChatMessage; agentReply: SessionChatMessage }> {
  if (!input.objectiveId && !input.workflowRunId) {
    throw new Error("objectiveId or workflowRunId is required");
  }

  const open = await isConversationOpen({
    objectiveId: input.objectiveId,
    workflowRunId: input.workflowRunId,
    artifactId: input.artifactId,
  });
  if (!open) throw new ConversationClosedError();

  const agent = await getAgentById(input.agentId);
  if (!agent) throw new Error("Agent not found");

  const artifactCtx = await resolveArtifactContext(input.artifactId);
  let projectId = artifactCtx.projectId;
  let projectName = "Project";
  let objective = "";

  if (input.objectiveId) {
    const objectiveRecord = await getObjectiveById(input.objectiveId);
    if (!objectiveRecord) throw new Error("Objective not found");
    projectId = objectiveRecord.projectId;
    objective = objectiveRecord.title;
  }

  if (projectId) {
    const supabase = createSupabaseAdmin();
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();
    projectName = project?.name ?? "Project";
  }

  const founderMessage = await appendSessionChat({
    workflowRunId: input.workflowRunId ?? null,
    objectiveId: input.objectiveId ?? null,
    projectId,
    speakerType: "founder",
    speakerName: input.founderName,
    message: input.message,
    artifactId: input.artifactId ?? null,
    messageKind: "chat",
  });

  if (!founderMessage) throw new Error("Failed to save founder message");

  const history = await getSessionChat({
    objectiveId: input.objectiveId,
    workflowRunId: input.workflowRunId,
    artifactId: input.artifactId,
    limit: 50,
  });

  const execCtx: AgentExecutionContext = {
    workflowId: input.workflowRunId ?? null,
    projectId: projectId ?? "",
    projectName,
    objective,
    stepKey: artifactCtx.stepKey || "conversation",
    objectiveId: input.objectiveId ?? null,
  };

  const contextBundle = projectId
    ? await getAgentContext(agent, execCtx)
    : { markdown: "", sources: [] as string[], loadedAt: new Date().toISOString() };

  const modelConfig = await resolveModelConfig(input.agentId);
  let replyText: string;

  if (modelConfig?.apiKey) {
    const userPrompt = [
      contextBundle.markdown ? `## Context\n${contextBundle.markdown}` : "",
      artifactCtx.artifactOutput
        ? `## Your Artifact (${artifactCtx.artifactName})\n${artifactCtx.artifactOutput}`
        : "",
      history.length > 0 ? `## Conversation History\n${formatChatHistory(history)}` : "",
      `## Founder's Message\n${input.message}`,
      "\nRespond as the agent in a conversational tone. Do not use markdown headers unless listing items.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const basePrompt = buildConversationalPrompt(agent.role, artifactCtx.artifactName);
    const systemPrompt = modelConfig.systemPrompt
      ? `${modelConfig.systemPrompt}\n\n${basePrompt}`
      : basePrompt;

    try {
      const result = await generateAICompletion({
        providerName: modelConfig.providerName,
        apiKey: modelConfig.apiKey,
        endpoint: modelConfig.endpoint,
        model: modelConfig.model,
        systemPrompt,
        userPrompt,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
      replyText = result.content;
    } catch {
      replyText = buildFallbackReply(agent.role, input.message, artifactCtx.artifactOutput);
    }
  } else {
    replyText = buildFallbackReply(agent.role, input.message, artifactCtx.artifactOutput);
  }

  const agentReply = await appendSessionChat({
    workflowRunId: input.workflowRunId ?? null,
    objectiveId: input.objectiveId ?? null,
    projectId,
    speakerType: "agent",
    speakerName: agent.name,
    speakerRole: agent.role,
    message: replyText.slice(0, 4000),
    artifactId: input.artifactId ?? null,
    agentId: input.agentId,
    messageKind: "chat",
  });

  if (!agentReply) throw new Error("Failed to save agent reply");

  return { founderMessage, agentReply };
}

function buildFallbackReply(role: string, question: string, artifactOutput: string): string {
  const lower = question.toLowerCase();
  if (lower.includes("success metric") || lower.includes("kpi")) {
    const metricMatch = artifactOutput.match(/success metric[s]?[:\s]*(.+?)(?:\n|$)/i);
    if (metricMatch?.[1]) {
      return `For this initiative, the key success metrics are:\n\n${metricMatch[1].trim()}\n\nThese align with our strategic priorities and are measurable within the first sprint cycle.`;
    }
    return `I recommend tracking:\n\n1. Primary objective completion rate >95%\n2. User-facing quality metric improvement\n3. Operational efficiency gain\n4. Support ticket reduction\n\nThese give us clear signal on whether the initiative succeeded.`;
  }
  return `As ${role}, I stand by the strategic brief I submitted. Could you clarify which aspect you'd like me to expand on — priority, expected outcome, success metrics, or scope?`;
}
