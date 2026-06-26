import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAgentAIConfig } from "./agent-ai-config";
import { executeWithRetryPolicy, type AgentModelConfig } from "./ai-retry-engine";
import { buildModelAlternates, listCatalogModels, supportsModelCatalog } from "./ai-model-catalog";
import { getCompanyAISettings } from "./ai-settings";
import {
  artifactNameForStep,
  recordAIExecutionEvent,
  recordTemplateFallback,
} from "./ai-reliability";
import { getAgentTimeoutMs } from "./agent-timeouts";
import { estimatePromptTokens, estimateTokens } from "./token-estimate";
import {
  formatProviderDiagnostics,
  resolveAIProviderForAgent,
} from "./ai-provider-resolver";
import { postSystemSessionMessage } from "./executive-session-chat";
import { getAgentById } from "./agents";
import { sendAgentMessage } from "./agent-conversations";
import { createDeliverable } from "./deliverables";
import { getDecisions } from "./decisions";
import { getDocuments } from "./documents";
import { getAgentContext } from "./context-engine";
import { createRuntimeSession, updateRuntimeSession } from "./agent-runtime";
import { requestWorkflowApproval } from "./governance";
import { createSessionArtifact } from "./session-artifacts";
import {
  buildRequirementsTemplate,
  processRequirementsArtifact,
  REQUIREMENTS_PM_PROMPT,
  validateRequirementsDocument,
} from "./requirements-engine";
import { getStepGovernanceApproval, SDLC_WORKFLOW } from "./sdlc";
import { updateSessionFields } from "./session-manager";
import { updateSessionStatePointers } from "./session-state-view";
import { createReview } from "./reviews";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import type { Agent, DeliverableType, ReasoningLevel } from "./types";

const STEP_DELIVERABLE_TYPE: Record<string, DeliverableType> = {
  ceo_strategy: "Business Proposal",
  coo_execution: "Implementation Guide",
  requirements: "Requirements Document",
  execution_readiness: "Implementation Guide",
  design: "Architecture Document",
  tasks: "Implementation Guide",
  implementation: "Implementation Guide",
  validation: "Test Plan",
  deployment: "Deployment Plan",
  documentation: "Release Notes",
  knowledge: "Knowledge Base Article",
};

const STEP_PROMPTS: Record<string, string> = {
  ceo_strategy: `You are the CEO Agent. Validate the founder's objective against company goals and KPIs. Output: business objective approved, Priority (High/Medium/Low), Expected Outcome, Success Metrics. Do NOT write code, architecture, or task plans.`,
  coo_execution: `You are the COO Agent. You own session execution. Create an execution plan: project scope, agents to assign, workflow steps, timeline estimate, and resource requirements.`,
  requirements: REQUIREMENTS_PM_PROMPT,
  execution_readiness: `You are the Team Orchestrator agent. Your ONLY job is resource allocation. Review approved requirements, agent availability, and dependencies. Output execution readiness: required agents, dependencies, resources available, execution ready (yes/no).`,
  design: `You are a Solution Architect agent. Generate architecture document with system overview, components, API design, database design, security, and technical decisions.`,
  tasks: `You are a Project Manager agent. Generate an execution plan with milestones, dependencies, timelines, and task breakdown.`,
  implementation: `You are a Software Engineer agent. Generate implementation plan with code designs, pseudocode, technical documentation, and module structure.`,
  validation: `You are a QA agent. Generate test plan with test cases, validation reports, and risk analysis.`,
  deployment: `You are a DevOps agent. Generate deployment plan with CI/CD pipeline, staging rollout strategy, and monitoring checklist.`,
  documentation: `You are a Documentation agent. Generate user guides, release notes, and knowledge articles.`,
  knowledge: `You are a Knowledge Engine agent. Summarize lessons learned, decisions, and archive workflow knowledge.`,
};

export type AgentExecutionContext = {
  workflowId?: string | null;
  projectId: string;
  projectName: string;
  objective: string;
  stepKey: string;
  taskId?: string | null;
  objectiveId?: string | null;
  strategicBrief?: Record<string, unknown>;
  handoffContext?: string;
  receiverAgentId?: string | null;
};

async function resolveModelConfigs(
  agentId: string,
  workflowId?: string | null,
): Promise<{
  primary: AgentModelConfig | null;
  fallback: AgentModelConfig | null;
  diagnostics: string;
}> {
  const [{ primary, fallback }, agentConfig, companySettings] = await Promise.all([
    resolveAIProviderForAgent(agentId),
    getAgentAIConfig(agentId),
    getCompanyAISettings(),
  ]);

  const sessionAi = workflowId
    ? await (await import("./launch-ai-options")).getSessionAiConfig(workflowId)
    : null;

  const buildConfig = async (
    resolved: NonNullable<typeof primary>,
  ): Promise<AgentModelConfig> => {
    const agentOverride = agentConfig?.model?.trim() || null;
    const baseModel = resolved.model;
    const model =
      agentOverride ??
      (sessionAi?.mode === "fixed" && sessionAi.model ? sessionAi.model : null) ??
      (sessionAi?.model ? sessionAi.model : null) ??
      baseModel;

    const poolSource =
      sessionAi?.modelPool && sessionAi.modelPool.length > 0
        ? sessionAi.modelPool
        : resolved.modelPool;

    const autoRotate = sessionAi
      ? sessionAi.autoRotate
      : (companySettings.autoModelRotation ?? true) && resolved.autoRotateModels;

    let catalogIds: string[] | undefined;

    if (
      autoRotate &&
      supportsModelCatalog(resolved.providerName) &&
      resolved.apiKey &&
      poolSource.length < 2
    ) {
      try {
        const catalog = await listCatalogModels({
          providerName: resolved.providerName,
          apiKey: resolved.apiKey,
          endpoint: resolved.endpoint,
        });
        catalogIds = catalog.map((m) => m.id);
      } catch (error) {
        console.warn("[agent-executor] model catalog fetch failed:", error);
      }
    }

    const modelAlternates = buildModelAlternates(model, poolSource, autoRotate, catalogIds);

    return {
      providerName: resolved.providerName,
      apiKey: resolved.apiKey,
      endpoint: resolved.endpoint,
      model,
      temperature: agentConfig?.temperature ?? 0.7,
      maxTokens: agentConfig?.maxTokens ?? 4096,
      reasoningLevel: (agentConfig?.reasoningLevel ?? "standard") as ReasoningLevel,
      systemPrompt: agentConfig?.systemPrompt ?? "",
      modelAlternates,
    };
  };

  return {
    primary: primary ? await buildConfig(primary) : null,
    fallback: fallback ? await buildConfig(fallback) : null,
    diagnostics: formatProviderDiagnostics(primary),
  };
}

function buildTemplateOutput(agent: Agent, ctx: AgentExecutionContext, stepKey: string): string {
  const step = SDLC_WORKFLOW.find((s) => s.key === stepKey);
  if (stepKey === "ceo_strategy") {
    return `# Strategic Brief

## Objective
${ctx.objective}

## Business Assessment
This objective aligns with company priorities for ${ctx.projectName}. It impacts product delivery, user outcomes, and operational focus.

## Priority
High

## Expected Outcome
Measurable improvement against the stated objective with clear success criteria.

## Success Metrics
- Primary KPI tied to objective completion
- User-facing quality metric improvement
- Delivery timeline adherence

## Recommendation
Proceed — COO may activate execution session after founder approval.

_Generated by ${agent.name} (template mode — AI provider unavailable or timed out)._`;
  }
  if (stepKey === "requirements") {
    return buildRequirementsTemplate({
      projectName: ctx.projectName,
      objective: ctx.objective,
      contextMarkdown: ctx.handoffContext,
    });
  }
  return `# ${step?.deliverableTitle ?? "Work Output"}

Objective: ${ctx.objective}
Project: ${ctx.projectName}

Generated by ${agent.name} (template mode — AI provider unavailable or timed out).`;
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

  const { assertStepToolAccess, healAgentToolForStep } = await import("./tool-permissions");
  try {
    await assertStepToolAccess(agentId, ctx.stepKey);
  } catch (toolError) {
    const message = toolError instanceof Error ? toolError.message : "Tool access denied";
    if (message.includes("Tool access denied") || message.includes("lacks permission")) {
      const healed = await healAgentToolForStep(agentId, ctx.stepKey);
      if (healed) {
        await assertStepToolAccess(agentId, ctx.stepKey);
      } else {
        throw toolError;
      }
    } else if (!message.includes("does not exist")) {
      throw toolError;
    }
  }

  if (ctx.workflowId) {
    const { isSessionExecutable } = await import("./session-state-engine");
    if (!(await isSessionExecutable(ctx.workflowId))) {
      throw new Error("SESSION_NOT_EXECUTABLE");
    }
  }

  const { primary: modelConfig, fallback: fallbackConfig, diagnostics } =
    await resolveModelConfigs(agentId, ctx.workflowId);
  const step = SDLC_WORKFLOW.find((s) => s.key === ctx.stepKey);

  const automationCtx = ctx.workflowId
    ? await (await import("./automation-executor")).loadAutomationContext(ctx.workflowId)
    : null;

  const requestedArtifact = artifactNameForStep(ctx.stepKey);
  let contextBundle;
  try {
    if (automationCtx) {
      const block = await (
        await import("./automation-executor")
      ).buildAutomationContextBlock(automationCtx, ctx.objective);
      contextBundle = {
        markdown: block,
        sources: ["automation"],
        loadedAt: new Date().toISOString(),
        promptLength: block.length,
        estimatedInputTokens: estimateTokens(block),
      };
    } else {
      contextBundle = await getAgentContext(agent, ctx);
    }
  } catch (error) {
    console.warn("[agent-executor] context load failed, using minimal context:", error);
    contextBundle = {
      markdown: `# Objective\n${ctx.objective}\n\n# Project\n${ctx.projectName}`,
      sources: ["objective"],
      loadedAt: new Date().toISOString(),
      promptLength: ctx.objective.length + ctx.projectName.length + 20,
      estimatedInputTokens: estimateTokens(`${ctx.objective}${ctx.projectName}`),
    };
  }
  const contextBlock = contextBundle.markdown;

  const session = await createRuntimeSession({
    agentId,
    workflowId: ctx.workflowId ?? null,
    taskId: ctx.taskId,
    modelProvider: modelConfig?.providerName ?? "template",
    modelName: modelConfig?.model ?? "template",
  });

  const supabaseForContext = createSupabaseAdmin();
  await supabaseForContext
    .from("agent_runtime_sessions")
    .update({ context_loaded_at: contextBundle.loadedAt })
    .eq("id", session.id);

  try {
    let output: string;
    let inputTokens = 0;
    let outputTokens = 0;

    let usedAI = false;
    const systemPrompt = modelConfig
      ? automationCtx
        ? (await import("./automation-executor")).getAutomationSystemPrompt(
            automationCtx.automationKind ?? "custom",
            modelConfig.systemPrompt,
          )
        : buildSystemPrompt(agent, ctx.stepKey, modelConfig.systemPrompt, modelConfig.reasoningLevel)
      : "";
    const userPrompt = `${contextBlock}\n\n## Your Task\n${step?.taskDescription ?? "Complete assigned work for: " + ctx.objective}\n\nGenerate the complete deliverable now.`;
    const timeoutMs = getAgentTimeoutMs(ctx.stepKey, agent);
    const promptLength = systemPrompt.length + userPrompt.length;
    const estimatedInputTokens = estimatePromptTokens(systemPrompt, userPrompt);

    if (modelConfig?.apiKey) {
      const retryResult = await executeWithRetryPolicy({
        primary: modelConfig,
        fallback: fallbackConfig,
        systemPrompt,
        userPrompt,
        agentName: agent.name,
        agentId,
        workflowId: ctx.workflowId,
        runtimeSessionId: session.id,
        timeoutMs,
        onStatusMessage: ctx.workflowId
          ? async (message) => {
              await postSystemSessionMessage(ctx.workflowId!, message, {
                projectId: ctx.projectId,
                stepKey: ctx.stepKey,
                artifactName: requestedArtifact,
              });
            }
          : undefined,
      });

      if (retryResult.ok) {
        output = retryResult.content;
        inputTokens = retryResult.inputTokens;
        outputTokens = retryResult.outputTokens;
        usedAI = true;

        await recordAIExecutionEvent({
          workflowRunId: ctx.workflowId,
          projectId: ctx.projectId,
          agentId,
          agentName: agent.name,
          stepKey: ctx.stepKey,
          artifactRequested: requestedArtifact,
          provider: retryResult.provider,
          model: retryResult.model,
          attemptCount: retryResult.attemptCount,
          success: true,
          usedFallback: retryResult.usedFallback,
          usedTemplate: false,
          timedOut: false,
          promptLength: retryResult.promptLength,
          estimatedInputTokens: retryResult.estimatedInputTokens,
          responseTimeMs: retryResult.responseTimeMs,
          timeoutMs: retryResult.timeoutMs,
        });
      } else {
        console.error(
          `[agent-executor] AI retries exhausted for ${ctx.stepKey}:`,
          retryResult.errors.join("; "),
        );

        const { isFreeExecutionMode, enqueueAIRecovery, getActiveQueueForSession } =
          await import("./recovery-queue");
        const freeMode = await isFreeExecutionMode();
        const existingQueue = ctx.workflowId
          ? await getActiveQueueForSession(ctx.workflowId)
          : null;
        const useTemplateFromQueue = existingQueue?.status === "template_fallback";

        if (
          freeMode &&
          ctx.workflowId &&
          !useTemplateFromQueue
        ) {
          await enqueueAIRecovery({
            ctx,
            agentId,
            runtimeSessionId: session.id,
            modelConfig,
            errors: retryResult.errors,
          });
          await updateRuntimeSession(session.id, {
            status: "FAILED",
            errorMessage: "AI_RECOVERY_QUEUED",
            reasoning: "Queued for intelligent recovery — provider throttling",
          });
          throw new Error("AI_RECOVERY_QUEUED");
        }

        output = buildTemplateOutput(agent, ctx, ctx.stepKey);
        if (ctx.workflowId) {
          await recordTemplateFallback({
            workflowRunId: ctx.workflowId,
            projectId: ctx.projectId,
            agentId,
            agentName: agent.name,
            agentRole: agent.role,
            stepKey: ctx.stepKey,
            artifactRequested: requestedArtifact,
            provider: retryResult.lastProvider,
            model: retryResult.lastModel,
            attemptCount: retryResult.attemptCount,
            errors: [...retryResult.errors, diagnostics],
            timedOut: retryResult.timedOut,
            output,
            promptLength: retryResult.promptLength,
            estimatedInputTokens: retryResult.estimatedInputTokens,
            responseTimeMs: retryResult.responseTimeMs,
            timeoutMs: retryResult.timeoutMs,
            failureReason: retryResult.failureReason,
          });
        }
      }
    } else {
      output = buildTemplateOutput(agent, ctx, ctx.stepKey);
      if (ctx.workflowId) {
        await recordTemplateFallback({
          workflowRunId: ctx.workflowId,
          projectId: ctx.projectId,
          agentId,
          agentName: agent.name,
          agentRole: agent.role,
          stepKey: ctx.stepKey,
          artifactRequested: requestedArtifact,
          provider: "none",
          model: "unconfigured",
          attemptCount: 0,
          errors: ["No AI provider configured", diagnostics],
          timedOut: false,
          output,
          promptLength,
          estimatedInputTokens,
          timeoutMs,
          failureReason: "No AI provider configured",
        });
      }
    }

    const deliverableType = STEP_DELIVERABLE_TYPE[ctx.stepKey] ?? "Knowledge Base Article";
    const artifactName = artifactNameForStep(ctx.stepKey);

    let deliverable: { id: string } | null = null;
    if (ctx.workflowId) {
      deliverable = await createDeliverable({
        workflowId: ctx.workflowId,
        projectId: ctx.projectId,
        taskId: ctx.taskId,
        title: step?.deliverableTitle ?? `${agent.role} Output`,
        type: deliverableType,
        status: "DRAFT",
        owner: agent.name,
        content: output,
      });
    }

    const sessionArtifact = await createSessionArtifact({
      workflowRunId: ctx.workflowId ?? null,
      objectiveId: ctx.objectiveId ?? null,
      runtimeSessionId: session.id,
      agentId,
      stepKey: ctx.stepKey,
      inputSummary: `Sources: ${contextBundle.sources.join(", ")}`,
      outputSummary: output.slice(0, 3000),
      artifactName,
      artifactType: step?.deliverableType ?? "document",
      artifactRefId: deliverable?.id ?? null,
      projectId: ctx.projectId,
    });

    if (ctx.workflowId) {
      await updateSessionFields(ctx.workflowId, {
        currentStage: step?.label ?? ctx.stepKey,
      });
      await updateSessionStatePointers({
        sessionId: ctx.workflowId,
        currentAgentId: agentId,
        workflowStage: ctx.stepKey,
        currentStage: step?.label ?? ctx.stepKey,
        currentArtifactId: sessionArtifact.id,
        currentArtifact: artifactName,
        currentDeliverable: artifactName,
      });
    }

    if (ctx.stepKey === "requirements" && ctx.workflowId) {
      validateRequirementsDocument(output);
      await processRequirementsArtifact({
        sessionId: ctx.workflowId,
        projectId: ctx.projectId,
        projectName: ctx.projectName,
        objective: ctx.objective,
        artifactId: sessionArtifact.id,
        content: output,
        agentId,
        agentName: agent.name,
      });
    }

    const governanceApproval = getStepGovernanceApproval(ctx.stepKey);
    const { shouldSkipGovernanceForAutomation } = await import("./automation-executor");
    if (
      governanceApproval &&
      ctx.workflowId &&
      !shouldSkipGovernanceForAutomation(automationCtx, governanceApproval)
    ) {
      const { isSessionExecutable } = await import("./session-state-engine");
      if (await isSessionExecutable(ctx.workflowId)) {
        await requestWorkflowApproval({
          workflowId: ctx.workflowId,
          projectId: ctx.projectId,
          approvalType: governanceApproval,
          title: step?.deliverableTitle ?? ctx.stepKey,
          description: `${agent.name} completed ${step?.label ?? ctx.stepKey}`,
          requestedBy: agent.name,
          artifactContent: output,
          context: ctx.stepKey === "deployment" ? { releaseType: "major" } : {},
        });
      }
    }

    if (ctx.receiverAgentId && ctx.workflowId) {
      const { isSessionExecutable } = await import("./session-state-engine");
      if (!(await isSessionExecutable(ctx.workflowId))) {
        return { sessionId: session.id, output, usedAI: !!modelConfig };
      }

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
          entityId: deliverable?.id ?? session.id,
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
      targetType: ctx.workflowId ? "workflow" : "objective",
      targetId: ctx.workflowId ?? ctx.objectiveId ?? session.id,
      description: `${step?.label ?? ctx.stepKey} completed`,
    });

    if (ctx.workflowId || ctx.objectiveId) {
      try {
        const { appendSessionChat } = await import("./session-chat");
        await appendSessionChat({
          workflowRunId: ctx.workflowId ?? null,
          objectiveId: ctx.objectiveId ?? null,
          projectId: ctx.projectId,
          speakerType: "agent",
          speakerName: agent.name,
          speakerRole: agent.role,
          message: output.slice(0, 4000),
          artifactName: artifactName,
          stepKey: ctx.stepKey,
          agentId,
          artifactId: sessionArtifact.id,
          messageKind: "artifact",
        });
      } catch {
        // Session chat is best-effort
      }
    }

    const supabase = createSupabaseAdmin();
    if (ctx.taskId) {
      await supabase
        .from("tasks")
        .update({ progress_percentage: 100, status: step?.taskStatus ?? "in_progress" })
        .eq("id", ctx.taskId);
    }

    if (ctx.workflowId) {
      try {
        const { generateAgentIntelligence } = await import("./agent-intelligence");
        await generateAgentIntelligence(agentId);
      } catch {
        // Intelligence refresh is best-effort after agent execution
      }

      if (automationCtx) {
        const metrics = await (
          await import("./automation-executor")
        ).postAutomationActions(automationCtx, output, ctx.workflowId, ctx.projectId);
        if (automationCtx.automationId) {
          const { logAutomationRun } = await import("./agent-automations");
          await logAutomationRun(
            automationCtx.automationId,
            ctx.workflowId,
            automationCtx.triggerType ?? "execution",
            "success",
            "Automation step completed",
            metrics,
          );
        }
      }
    }

    return { sessionId: session.id, output, usedAI };
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
