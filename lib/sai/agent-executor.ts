import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAgentAIConfig } from "./agent-ai-config";
import { getCompanyAISettings } from "./ai-settings";
import { generateAICompletion } from "./ai-client";
import { getDefaultAIProvider, getProviderWithKey } from "./ai-providers";
import { recordAIUsage } from "./ai-usage";
import { getAgentById } from "./agents";
import { sendAgentMessage } from "./agent-conversations";
import { createDeliverable } from "./deliverables";
import { getDecisions } from "./decisions";
import { getDocuments } from "./documents";
import { getMemories } from "./memories";
import { getWorkflowConversations } from "./agent-conversations";
import { createRuntimeSession, updateRuntimeSession } from "./agent-runtime";
import { SDLC_WORKFLOW } from "./sdlc";
import { createReview } from "./reviews";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import type { Agent, DeliverableType, ReasoningLevel } from "./types";

const STEP_DELIVERABLE_TYPE: Record<string, DeliverableType> = {
  requirements: "Requirements Document",
  design: "Architecture Document",
  tasks: "Implementation Guide",
  assignment: "Implementation Guide",
  implementation: "Implementation Guide",
  validation: "Test Plan",
  deployment: "Deployment Plan",
  documentation: "Release Notes",
  knowledge: "Knowledge Base Article",
};

const STEP_PROMPTS: Record<string, string> = {
  requirements: `You are a Product Manager agent. Generate comprehensive requirements including user stories, acceptance criteria, and a roadmap section. Use markdown format.`,
  design: `You are a Solution Architect agent. Generate architecture document with system overview, components, API design, database design, security, and technical decisions.`,
  tasks: `You are a Project Manager agent. Generate an execution plan with milestones, dependencies, timelines, and task breakdown.`,
  assignment: `You are a Team Orchestrator agent. Generate an assignment plan distributing work across engineering, QA, DevOps, and documentation roles.`,
  implementation: `You are a Software Engineer agent. Generate implementation plan with code designs, pseudocode, technical documentation, and module structure.`,
  validation: `You are a QA agent. Generate test plan with test cases, validation reports, and risk analysis.`,
  deployment: `You are a DevOps agent. Generate deployment plan with CI/CD pipeline, rollout strategy, and monitoring checklist.`,
  documentation: `You are a Documentation agent. Generate user guides, release notes, and knowledge articles.`,
  knowledge: `You are a Knowledge Engine agent. Summarize lessons learned, decisions, and archive workflow knowledge.`,
};

export type AgentExecutionContext = {
  workflowId: string;
  projectId: string;
  projectName: string;
  objective: string;
  stepKey: string;
  taskId?: string | null;
  handoffContext?: string;
  receiverAgentId?: string | null;
};

async function gatherAgentContext(
  agent: Agent,
  ctx: AgentExecutionContext,
): Promise<string> {
  const [memories, documents, decisions, conversations] = await Promise.all([
    getMemories({ projectId: ctx.projectId }),
    getDocuments({ workflowId: ctx.workflowId }),
    getDecisions({ workflowId: ctx.workflowId }),
    getWorkflowConversations(ctx.workflowId),
  ]);

  const sections = [
    `# Company Context for ${agent.name} (${agent.role})`,
    `## Objective\n${ctx.objective}`,
    `## Project\n${ctx.projectName}`,
    agent.description ? `## Agent Role\n${agent.description}` : "",
    agent.responsibilities.length
      ? `## Responsibilities\n${agent.responsibilities.map((r) => `- ${r}`).join("\n")}`
      : "",
    memories.length
      ? `## Company Memory\n${memories.slice(0, 5).map((m) => `- ${m.title}: ${m.content.slice(0, 200)}`).join("\n")}`
      : "",
    documents.length
      ? `## Workflow Documents\n${documents.map((d) => `### ${d.title}\n${d.content.slice(0, 500)}`).join("\n\n")}`
      : "",
    decisions.length
      ? `## Previous Decisions\n${decisions.map((d) => `- ${d.title}: ${d.decision}`).join("\n")}`
      : "",
    conversations.length
      ? `## Agent Conversations\n${conversations.slice(-5).map((c) => `${c.senderAgentName}: ${c.message.slice(0, 150)}`).join("\n")}`
      : "",
    ctx.handoffContext ? `## Handoff Context\n${ctx.handoffContext}` : "",
  ];

  return sections.filter(Boolean).join("\n\n");
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
        reasoningLevel: agentConfig.reasoningLevel,
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
    maxTokens: agentConfig?.maxTokens ?? 4096,
    reasoningLevel: (agentConfig?.reasoningLevel ?? "standard") as ReasoningLevel,
    systemPrompt: agentConfig?.systemPrompt ?? "",
  };
}

function buildSystemPrompt(
  agent: Agent,
  stepKey: string,
  customPrompt: string,
  reasoningLevel: ReasoningLevel,
): string {
  const stepPrompt = STEP_PROMPTS[stepKey] ?? `You are ${agent.role}. Complete the assigned work professionally.`;
  const reasoning =
    reasoningLevel === "deep"
      ? "Think step by step. Show your reasoning process before the final output."
      : reasoningLevel === "minimal"
        ? "Be concise and direct."
        : "Balance thoroughness with clarity.";

  return [
    customPrompt || stepPrompt,
    `You are ${agent.name}, ${agent.role} at InnovateAegis.`,
    reasoning,
    "Output professional markdown suitable for a deliverable document.",
  ].join("\n\n");
}

export async function executeAgentWork(
  agentId: string,
  ctx: AgentExecutionContext,
): Promise<{
  sessionId: string;
  output: string;
  usedAI: boolean;
}> {
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");

  const modelConfig = await resolveModelConfig(agentId);
  const step = SDLC_WORKFLOW.find((s) => s.key === ctx.stepKey);
  const contextBlock = await gatherAgentContext(agent, ctx);

  const session = await createRuntimeSession({
    agentId,
    workflowId: ctx.workflowId,
    taskId: ctx.taskId,
    modelProvider: modelConfig?.providerName ?? "template",
    modelName: modelConfig?.model ?? "template",
  });

  try {
    let output: string;
    let inputTokens = 0;
    let outputTokens = 0;

    if (modelConfig?.apiKey) {
      const userPrompt = `${contextBlock}\n\n## Your Task\n${step?.taskDescription ?? "Complete assigned work for: " + ctx.objective}\n\nGenerate the complete deliverable now.`;

      const result = await generateAICompletion({
        providerName: modelConfig.providerName,
        apiKey: modelConfig.apiKey,
        endpoint: modelConfig.endpoint,
        model: modelConfig.model,
        systemPrompt: buildSystemPrompt(
          agent,
          ctx.stepKey,
          modelConfig.systemPrompt,
          modelConfig.reasoningLevel,
        ),
        userPrompt,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });

      output = result.content;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;

      await recordAIUsage({
        provider: modelConfig.providerName,
        model: modelConfig.model,
        agent: agent.name,
        agentId,
        inputTokens,
        outputTokens,
        workflowId: ctx.workflowId,
        sessionId: session.id,
      });
    } else {
      output = `# ${step?.deliverableTitle ?? "Work Output"}\n\nObjective: ${ctx.objective}\n\nGenerated by ${agent.name} (template mode — configure AI provider for live generation).\n\n${contextBlock.slice(0, 1000)}`;
    }

    const deliverableType = STEP_DELIVERABLE_TYPE[ctx.stepKey] ?? "Knowledge Base Article";

    const deliverable = await createDeliverable({
      workflowId: ctx.workflowId,
      projectId: ctx.projectId,
      taskId: ctx.taskId,
      title: step?.deliverableTitle ?? `${agent.role} Output`,
      type: deliverableType,
      status: "DRAFT",
      owner: agent.name,
      content: output,
    });

    if (ctx.receiverAgentId) {
      const receiver = await getAgentById(ctx.receiverAgentId);
      await sendAgentMessage({
        workflowId: ctx.workflowId,
        senderAgentId: agentId,
        receiverAgentId: ctx.receiverAgentId,
        message: `Handoff complete for ${ctx.stepKey}. ${step?.taskTitle ?? "Work"} ready for your review.\n\n${output.slice(0, 500)}...`,
        messageType: "handoff",
      });

      await createHandoff({
        workflowId: ctx.workflowId,
        fromAgentId: agentId,
        toAgentId: ctx.receiverAgentId,
        stepKey: ctx.stepKey,
        objective: ctx.objective,
        requirements: output.slice(0, 2000),
        deliverables: step?.deliverableTitle ?? "",
        decisions: "",
        openRisks: "",
        pendingQuestions: "",
        approvalStatus: "pending",
      });

      if (receiver) {
        await requestAgentReview({
          workflowId: ctx.workflowId,
          reviewerAgentId: ctx.receiverAgentId,
          reviewerName: receiver.name,
          entityType: "deliverable",
          entityId: deliverable.id,
          content: output.slice(0, 500),
        });
      }
    }

    await updateRuntimeSession(session.id, {
      status: "COMPLETED",
      inputTokens,
      outputTokens,
      output: output.slice(0, 5000),
      reasoning: modelConfig ? `Used ${modelConfig.providerName}/${modelConfig.model}` : "Template mode",
    });

    await recordActivityFeed({
      actor: agent.name,
      action: "agent_executed",
      targetType: "workflow",
      targetId: ctx.workflowId,
      description: `${step?.label ?? ctx.stepKey} completed`,
    });

    const supabase = createSupabaseAdmin();
    if (ctx.taskId) {
      await supabase
        .from("tasks")
        .update({ progress_percentage: 100, status: step?.taskStatus ?? "in_progress" })
        .eq("id", ctx.taskId);
    }

    try {
      const { generateAgentIntelligence } = await import("./agent-intelligence");
      await generateAgentIntelligence(agentId);
    } catch {
      // Intelligence refresh is best-effort after agent execution
    }

    return { sessionId: session.id, output, usedAI: Boolean(modelConfig?.apiKey) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    await updateRuntimeSession(session.id, {
      status: "FAILED",
      errorMessage: message,
    });
    await notifyFounder(
      `Agent execution failed: ${agent.name}`,
      message,
      "SYSTEM",
      { severity: "HIGH", entityType: "agent", entityId: agentId },
    );
    throw error;
  }
}

export async function createHandoff(input: {
  workflowId: string;
  fromAgentId: string | null;
  toAgentId: string | null;
  stepKey: string;
  objective: string;
  requirements: string;
  deliverables: string;
  decisions: string;
  openRisks: string;
  pendingQuestions: string;
  approvalStatus: string;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("agent_handoffs").insert({
    workflow_id: input.workflowId,
    from_agent_id: input.fromAgentId,
    to_agent_id: input.toAgentId,
    step_key: input.stepKey,
    objective: input.objective,
    requirements: input.requirements,
    deliverables: input.deliverables,
    decisions: input.decisions,
    open_risks: input.openRisks,
    pending_questions: input.pendingQuestions,
    approval_status: input.approvalStatus,
  });
}

export async function requestAgentReview(input: {
  workflowId: string;
  reviewerAgentId: string;
  reviewerName: string;
  entityType: string;
  entityId: string;
  content: string;
}): Promise<void> {
  await createReview({
    entityType: input.entityType,
    entityId: input.entityId,
    reviewer: input.reviewerName,
    comments: `Agent review requested for workflow ${input.workflowId}`,
  });

  await sendAgentMessage({
    workflowId: input.workflowId,
    senderAgentId: null,
    receiverAgentId: input.reviewerAgentId,
    message: `Review requested: ${input.content.slice(0, 300)}`,
    messageType: "review",
  });
}
