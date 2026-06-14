import { getWorkflowApprovals } from "./governance";
import { getSessionArtifacts } from "./session-artifacts";
import { getSessionIntelligence } from "./session-intelligence";
import { getSessionTruth } from "./session-truth-engine";
import { analyzeSessionRecovery } from "./session-recovery";

export type ExecutiveRoleBrief = {
  role: "CEO" | "COO" | "Product Manager";
  summary: string;
  available: boolean;
  artifactName: string | null;
  updatedAt: string | null;
};

export type SessionExecutiveBrief = {
  sessionId: string;
  sessionNumber: number | null;
  projectName: string;
  objective: string;
  status: string;
  stage: string | null;
  progress: number;
  outputSummary: string | null;
  deliveryOutcome: string | null;
  executionHealth: number;
  pendingApprovalCount: number;
  executives: {
    ceo: ExecutiveRoleBrief;
    coo: ExecutiveRoleBrief;
    productManager: ExecutiveRoleBrief;
  };
  intelligenceOutcome: string | null;
  generatedAt: string;
};

function pickArtifactSummary(
  artifacts: Awaited<ReturnType<typeof getSessionArtifacts>>,
  matchers: { stepKeys?: string[]; names?: string[] },
): { summary: string; artifactName: string | null; updatedAt: string | null } | null {
  const matches = artifacts.filter((a) => {
    const step = a.stepKey.toLowerCase();
    const name = (a.artifactName ?? "").toLowerCase();
    const stepHit = matchers.stepKeys?.some((k) => step.includes(k.toLowerCase())) ?? false;
    const nameHit = matchers.names?.some((n) => name.includes(n.toLowerCase())) ?? false;
    return stepHit || nameHit;
  });

  if (!matches.length) return null;

  const latest = matches.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  const summary =
    latest.outputSummary?.trim() ||
    latest.decision?.trim() ||
    latest.inputSummary?.trim() ||
    "Artifact recorded — open workspace for full content.";

  return {
    summary: summary.slice(0, 600),
    artifactName: latest.artifactName,
    updatedAt: latest.createdAt,
  };
}

function buildRoleBrief(
  role: ExecutiveRoleBrief["role"],
  picked: ReturnType<typeof pickArtifactSummary>,
): ExecutiveRoleBrief {
  return {
    role,
    summary: picked?.summary ?? `No ${role} outcome recorded yet for this session.`,
    available: Boolean(picked),
    artifactName: picked?.artifactName ?? null,
    updatedAt: picked?.updatedAt ?? null,
  };
}

export async function getSessionExecutiveBrief(sessionId: string): Promise<SessionExecutiveBrief | null> {
  const [truth, artifacts, intelligence, pendingApprovals] = await Promise.all([
    getSessionTruth(sessionId),
    getSessionArtifacts(sessionId),
    getSessionIntelligence(sessionId),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
  ]);

  if (!truth) return null;

  const completedSteps = truth.timeline.filter((s) => s.status === "completed").length;
  const progress = truth.timeline.length
    ? Math.round((completedSteps / truth.timeline.length) * 100)
    : 0;

  const ceoPick = pickArtifactSummary(artifacts, {
    stepKeys: ["ceo", "strategy", "executive_sponsor"],
    names: ["ceo_strategy", "strategy"],
  });
  const cooPick = pickArtifactSummary(artifacts, {
    stepKeys: ["coo", "execution", "routing"],
    names: ["coo_execution", "execution"],
  });
  const pmPick = pickArtifactSummary(artifacts, {
    stepKeys: ["requirements", "product", "pm"],
    names: ["requirements", "prd"],
  });

  const latestArtifact = artifacts.length ? artifacts[artifacts.length - 1] : undefined;
  const outputSummary =
    truth.currentDeliverable ||
    intelligence?.outcomeSummary ||
    latestArtifact?.outputSummary?.slice(0, 280) ||
    null;

  return {
    sessionId,
    sessionNumber: truth.sessionNumber,
    projectName: truth.projectName,
    objective: truth.objective,
    status: truth.sessionStatus,
    stage: truth.currentStage ?? truth.workflowStage,
    progress,
    outputSummary,
    deliveryOutcome: intelligence?.outcomeSummary ?? outputSummary,
    executionHealth: truth.executionHealth,
    pendingApprovalCount: pendingApprovals.length,
    executives: {
      ceo: buildRoleBrief("CEO", ceoPick),
      coo: buildRoleBrief("COO", cooPick),
      productManager: buildRoleBrief("Product Manager", pmPick),
    },
    intelligenceOutcome: intelligence?.outcomeSummary ?? null,
    generatedAt: new Date().toISOString(),
  };
}

export async function answerSessionCosQuestion(
  sessionId: string,
  question: string,
  tabContext?: string,
): Promise<{ answer: string; brief: SessionExecutiveBrief | null }> {
  const [brief, pendingApprovals, artifacts, recovery] = await Promise.all([
    getSessionExecutiveBrief(sessionId),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
    getSessionArtifacts(sessionId),
    analyzeSessionRecovery(sessionId),
  ]);

  if (!brief) {
    return { answer: "Session not found.", brief: null };
  }

  const context = {
    session: brief,
    pendingApprovals: pendingApprovals.map((a) => ({
      id: a.id,
      type: a.approvalType,
      title: a.title,
      description: a.description,
      requestedBy: a.requestedBy,
      priority: a.priority,
      artifactPreview: (a.artifactContent ?? "").slice(0, 300),
    })),
    recovery: recovery
      ? {
          recommendedAction: recovery.recommendedAction,
          isStalled: recovery.isStalled,
          stallReasons: recovery.stallReasons,
          progress: recovery.progress,
          progressLabel: recovery.progressLabel,
          canResume: recovery.canResume,
          needsFounderReview: recovery.needsFounderReview,
          validationSummary: recovery.validationSummary,
        }
      : null,
    recentArtifacts: artifacts.slice(-6).map((a) => ({
      name: a.artifactName ?? a.stepKey,
      stepKey: a.stepKey,
      summary: (a.outputSummary ?? "").slice(0, 200),
      createdAt: a.createdAt,
    })),
  };

  const { resolveDefaultProviderConfig } = await import("./ai-provider-resolver");
  const { generateAICompletion } = await import("./ai-client");
  const provider = await resolveDefaultProviderConfig();

  const systemPrompt = `You are COS AI — the session-scoped intelligence agent for InnovateAegis.
You advise the founder on ONE session using ONLY the LIVE SESSION DATA provided.
${tabContext ? `The founder is viewing the "${tabContext}" tab — tailor your answer to that context.` : ""}
When asked about approvals, list every pending approval with type, title, and what blocks next.
When asked about outcomes, cite CEO/COO/Product Manager summaries from executives.
When asked what to do next, use recovery.recommendedAction and pendingApprovals.
Never invent data. If missing, say "Not captured yet in this session."`;

  const userPrompt = `LIVE SESSION DATA:\n${JSON.stringify(context, null, 2)}\n\nFOUNDER QUESTION:\n${question}`;

  if (provider?.apiKey) {
    try {
      const result = await generateAICompletion({
        providerName: provider.providerName,
        apiKey: provider.apiKey,
        endpoint: provider.endpoint,
        model: provider.model,
        systemPrompt,
        userPrompt,
        maxTokens: 1400,
        temperature: 0.2,
        timeoutMs: 60_000,
      });
      return { answer: result.content, brief };
    } catch {
      // fall through to deterministic
    }
  }

  return { answer: buildSessionDeterministicAnswer(question, brief, pendingApprovals, recovery), brief };
}

function buildSessionDeterministicAnswer(
  question: string,
  brief: SessionExecutiveBrief,
  pendingApprovals: Awaited<ReturnType<typeof getWorkflowApprovals>>,
  recovery: Awaited<ReturnType<typeof analyzeSessionRecovery>> | null,
): string {
  const q = question.toLowerCase();
  const lines: string[] = [
    `Session #${brief.sessionNumber ?? "—"} (${brief.projectName})`,
    `Objective: ${brief.objective}`,
    `Status: ${brief.status} · Stage: ${brief.stage ?? "—"} · Progress: ${brief.progress}%`,
    `Execution health: ${brief.executionHealth}%`,
  ];

  if (pendingApprovals.length > 0 || q.includes("approv") || q.includes("pending") || q.includes("block")) {
    lines.push(
      `Pending approvals (${pendingApprovals.length}):`,
      ...pendingApprovals.map(
        (a) =>
          `- ${a.title} (${a.approvalType}, ${a.priority} priority) — requested by ${a.requestedBy}. Approve in Session Center or Founder Workspace to unblock.`,
      ),
    );
  } else if (brief.pendingApprovalCount > 0) {
    lines.push(
      `Session shows ${brief.pendingApprovalCount} pending review(s) — open Approvals tab in workspace.`,
    );
  } else {
    lines.push("No workflow approvals pending for this session.");
  }

  if (q.includes("ceo") || q.includes("strategy") || q.includes("outcome") || lines.length <= 6) {
    lines.push(`CEO: ${brief.executives.ceo.summary}`);
  }
  if (q.includes("coo") || q.includes("execution") || q.includes("operat") || lines.length <= 7) {
    lines.push(`COO: ${brief.executives.coo.summary}`);
  }
  if (q.includes("product") || q.includes("pm") || q.includes("requirement") || lines.length <= 8) {
    lines.push(`Product Manager: ${brief.executives.productManager.summary}`);
  }
  if (q.includes("next") || q.includes("action") || q.includes("do") || recovery?.isStalled) {
    lines.push(
      `Recommended action: ${recovery?.recommendedAction ?? "Open session workspace for controls."}`,
      recovery?.isStalled
        ? `Stall reasons: ${recovery.stallReasons.join("; ") || "unknown"}`
        : "",
    );
  }
  if (q.includes("output") || q.includes("deliver") || q.includes("result")) {
    lines.push(`Output: ${brief.outputSummary ?? brief.deliveryOutcome ?? "Pending execution."}`);
  }

  return lines.filter(Boolean).join("\n\n");
}
