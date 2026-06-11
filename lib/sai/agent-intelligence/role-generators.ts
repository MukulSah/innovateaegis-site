import type { AgentIntelligenceContext } from "./context";
import type { IntelligenceInput } from "./types";
import { resolveAgentRoleKind } from "./types";

function baseInput(
  ctx: AgentIntelligenceContext,
  partial: Omit<IntelligenceInput, "agentId" | "agentName">,
): IntelligenceInput {
  return {
    agentId: ctx.agent.id,
    agentName: ctx.agent.name,
    ...partial,
  };
}

function overdueTasks(ctx: AgentIntelligenceContext) {
  const now = Date.now();
  return ctx.openTasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
}

function atRiskProjects(ctx: AgentIntelligenceContext) {
  return ctx.agentProjects.filter((p) => p.healthScore < 60 || p.status === "at_risk");
}

function generateCeoIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];

  for (const objective of ctx.agent.objectives) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "current_priority",
        title: objective,
        summary: `Strategic priority from ${ctx.agent.role}: ${objective}`,
        reasoning: `CEO objective aligned with company direction. Active projects: ${ctx.agentProjects.map((p) => p.name).join(", ") || "none assigned"}.`,
        recommendation: `Maintain executive focus on ${objective} this week.`,
        confidence: ctx.agent.performanceScore,
        priority: ctx.agent.priorityLevel,
        impact: ctx.agent.priorityLevel === "critical" ? "critical" : "high",
        relatedProjectIds: ctx.agentProjects.map((p) => p.id),
      }),
    );
  }

  for (const project of atRiskProjects(ctx)) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "risk_alert",
        title: `Strategic risk: ${project.name}`,
        summary: `${project.name} health score is ${project.healthScore}. Objective: ${project.objective}`,
        reasoning: `Project health below threshold indicates strategic delivery risk affecting company direction.`,
        recommendation: `Schedule executive review for ${project.name} and reallocate resources if needed.`,
        confidence: 85,
        priority: "high",
        impact: project.healthScore < 40 ? "critical" : "high",
        relatedProjectIds: [project.id],
      }),
    );
  }

  for (const project of ctx.agentProjects.filter((p) => p.status === "on_track" && p.healthScore >= 70)) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "strategic_opportunity",
        title: `Growth opportunity: ${project.name}`,
        summary: `${project.name} is performing well (${project.healthScore}% health) with objective: ${project.objective}`,
        reasoning: `Strong project health signals readiness for accelerated investment or market expansion.`,
        recommendation: `Evaluate scaling ${project.name} — consider MSP market entry or feature expansion.`,
        confidence: 75,
        priority: "medium",
        impact: "high",
        relatedProjectIds: [project.id],
      }),
    );
  }

  if (ctx.brainRecords.length > 0) {
    const brain = ctx.brainRecords[0];
    records.push(
      baseInput(ctx, {
        intelligenceType: "executive_recommendation",
        title: `Company direction signal: ${brain.title}`,
        summary: brain.summary || brain.title,
        reasoning: `Derived from Company Brain knowledge relevant to CEO objectives.`,
        recommendation: `Review brain record "${brain.title}" for strategic alignment decisions.`,
        confidence: 70,
        priority: "medium",
        impact: "medium",
        relatedMemoryIds: [brain.id],
        metadata: { brainDomain: brain.domainSlug },
      }),
    );
  }

  return records.slice(0, 8);
}

function generateCooIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];
  const overdue = overdueTasks(ctx);

  if (ctx.agent.status === "busy" || ctx.agent.capacityStatus === "OVERLOADED") {
    records.push(
      baseInput(ctx, {
        intelligenceType: "operational_alert",
        title: "Resource constraint: COO agent at capacity",
        summary: `${ctx.agent.name} is ${ctx.agent.status} with ${ctx.openTasks.length} open tasks in scope.`,
        reasoning: `Operational bottleneck detected — agent capacity may delay cross-functional execution.`,
        recommendation: `Rebalance workload or escalate blocked items to the founder.`,
        confidence: 80,
        priority: "high",
        impact: "high",
      }),
    );
  }

  if (overdue.length > 0) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "operational_alert",
        title: `${overdue.length} overdue task${overdue.length === 1 ? "" : "s"} in operations`,
        summary: overdue.map((t) => t.title).slice(0, 3).join("; "),
        reasoning: `Missed deadlines create execution risk across dependent workflows.`,
        recommendation: `Review overdue tasks and reassign or deprioritize non-critical work.`,
        confidence: 90,
        priority: "high",
        impact: "high",
        relatedProjectIds: [...new Set(overdue.map((t) => t.projectId))],
      }),
    );
  }

  if (ctx.governance.pendingApprovals > 0) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "escalation",
        title: `${ctx.governance.pendingApprovals} governance approvals pending`,
        summary: `${ctx.governance.waitingForFounder} awaiting founder review. ${ctx.governance.blockedWorkflows} workflows blocked.`,
        reasoning: `Approval queue backlog is blocking operational execution.`,
        recommendation: `Process founder approvals to unblock ${ctx.governance.blockedWorkflows} workflows.`,
        confidence: 95,
        priority: "critical",
        impact: "high",
        status: "awaiting_approval",
      }),
    );
  }

  for (const resp of ctx.agent.responsibilities.slice(0, 2)) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "executive_recommendation",
        title: `Process improvement: ${resp}`,
        summary: `COO recommends optimizing ${resp.toLowerCase()} based on current operational data.`,
        reasoning: `Responsibility area "${resp}" reviewed against ${ctx.openTasks.length} open tasks and team capacity.`,
        recommendation: `Implement workflow improvements for ${resp.toLowerCase()}.`,
        confidence: ctx.agent.performanceScore,
        priority: "medium",
        impact: "medium",
      }),
    );
  }

  return records.slice(0, 6);
}

function generateProductManagerIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];

  for (const memory of ctx.orgMemories.filter((m) => m.memoryType === "learning" || m.tags.some((t) => t.includes("customer")))) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "customer_insight",
        title: memory.title,
        summary: memory.summary,
        reasoning: `Customer signal from organizational memory (${memory.source}).`,
        recommendation: `Evaluate product impact of: ${memory.title}`,
        confidence: 70,
        priority: memory.importance === "critical" ? "high" : "medium",
        impact: memory.importance === "critical" ? "high" : "medium",
        relatedMemoryIds: [memory.id],
        relatedProjectIds: memory.relatedProjectId ? [memory.relatedProjectId] : [],
      }),
    );
  }

  for (const project of ctx.agentProjects) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "market_insight",
        title: `Market opportunity: ${project.name}`,
        summary: project.objective,
        reasoning: `Active product initiative with ${project.progress}% progress and ${project.healthScore}% health.`,
        recommendation: `Validate market fit for ${project.name} — consider compliance module expansion.`,
        confidence: 72,
        priority: "medium",
        impact: "medium",
        relatedProjectIds: [project.id],
      }),
    );
  }

  for (const objective of ctx.agent.objectives.slice(0, 2)) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "innovation_opportunity",
        title: objective,
        summary: `Product innovation signal: ${objective}`,
        reasoning: `PM objective evaluated against ${ctx.brainRecords.length} brain records and ${ctx.orgMemories.length} memories.`,
        recommendation: `Prioritize discovery for ${objective}.`,
        confidence: ctx.agent.performanceScore,
        priority: ctx.agent.priorityLevel,
        impact: "medium",
      }),
    );
  }

  return records.slice(0, 6);
}

function generateProjectManagerIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];

  for (const project of atRiskProjects(ctx)) {
    const completion =
      project.tasksTotal > 0
        ? Math.round((project.tasksCompleted / project.tasksTotal) * 100)
        : project.progress;

    records.push(
      baseInput(ctx, {
        intelligenceType: "project_alert",
        title: `${project.name} timeline at risk`,
        summary: `Health ${project.healthScore}%, progress ${project.progress}%, task completion ${completion}%.`,
        reasoning: `Project health and progress divergence indicates timeline slippage.`,
        recommendation: `Conduct milestone review for ${project.name} and adjust delivery forecast.`,
        confidence: 88,
        priority: "high",
        impact: project.healthScore < 40 ? "critical" : "high",
        relatedProjectIds: [project.id],
      }),
    );
  }

  const blockedTasks = ctx.openTasks.filter((t) => t.status === "approval" || t.status === "planning");
  if (blockedTasks.length > 0) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "project_alert",
        title: `${blockedTasks.length} tasks awaiting progression`,
        summary: blockedTasks.map((t) => t.title).slice(0, 3).join("; "),
        reasoning: `Tasks stuck in planning or approval delay milestone delivery.`,
        recommendation: `Unblock tasks in planning/approval stages to restore timeline.`,
        confidence: 82,
        priority: "medium",
        impact: "medium",
        relatedProjectIds: [...new Set(blockedTasks.map((t) => t.projectId))],
      }),
    );
  }

  return records.slice(0, 5);
}

function generateArchitectIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];
  const reviewTasks = ctx.openTasks.filter((t) => t.status === "code_review");

  if (reviewTasks.length >= 3) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "risk_alert",
        title: "Architecture review backlog",
        summary: `${reviewTasks.length} tasks in code review — potential technical debt accumulation.`,
        reasoning: `Review queue depth signals architecture governance bottleneck.`,
        recommendation: `Schedule architecture review session and establish review SLAs.`,
        confidence: 85,
        priority: "high",
        impact: "high",
        relatedProjectIds: [...new Set(reviewTasks.map((t) => t.projectId))],
      }),
    );
  }

  for (const brain of ctx.brainRecords.filter(
    (b) => b.domainSlug?.includes("architect") || b.domainName?.toLowerCase().includes("technical"),
  )) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "executive_recommendation",
        title: `Technical recommendation: ${brain.title}`,
        summary: brain.summary || brain.title,
        reasoning: `Architecture knowledge from Company Brain requires technical governance.`,
        recommendation: `Review technical standards in "${brain.title}" for compliance.`,
        confidence: 78,
        priority: "medium",
        impact: "medium",
        relatedMemoryIds: [brain.id],
      }),
    );
  }

  const lowHealth = atRiskProjects(ctx);
  if (lowHealth.length > 0) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "risk_alert",
        title: "Database scaling risk assessment needed",
        summary: `Technical health concern across ${lowHealth.map((p) => p.name).join(", ")}.`,
        reasoning: `Low project health may indicate underlying architecture or scaling issues.`,
        recommendation: `Conduct security and scaling review before next release.`,
        confidence: 75,
        priority: "high",
        impact: "high",
        relatedProjectIds: lowHealth.map((p) => p.id),
      }),
    );
  }

  return records.slice(0, 5);
}

function generateQaIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];
  const testingTasks = ctx.openTasks.filter((t) => t.status === "testing");
  const releaseBlocked = ctx.openTasks.filter(
    (t) => t.status === "testing" && t.priority === "critical",
  );

  if (releaseBlocked.length > 0) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "escalation",
        title: "Release blocked — critical tests pending",
        summary: releaseBlocked.map((t) => t.title).join("; "),
        reasoning: `Critical-priority tasks in testing block release readiness.`,
        recommendation: `Expedite QA validation or defer non-critical scope from release.`,
        confidence: 92,
        priority: "critical",
        impact: "critical",
        relatedProjectIds: [...new Set(releaseBlocked.map((t) => t.projectId))],
      }),
    );
  }

  if (testingTasks.length > 0) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "risk_alert",
        title: `Regression risk: ${testingTasks.length} tasks in testing`,
        summary: `Coverage and regression validation needed before release.`,
        reasoning: `Active testing queue indicates release readiness must be verified.`,
        recommendation: `Complete regression suite and document coverage gaps.`,
        confidence: 80,
        priority: "medium",
        impact: "medium",
        relatedProjectIds: [...new Set(testingTasks.map((t) => t.projectId))],
      }),
    );
  }

  return records.slice(0, 4);
}

function generateDevopsIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];
  const deployTasks = ctx.openTasks.filter(
    (t) => t.workflowStepKey === "deployment" || t.title.toLowerCase().includes("deploy"),
  );

  records.push(
    baseInput(ctx, {
      intelligenceType: "health_signal",
      title: "Infrastructure health signal",
      summary: `${ctx.agentProjects.length} projects in scope, ${deployTasks.length} deployment-related tasks open.`,
      reasoning: `DevOps agent monitoring infrastructure and deployment pipeline health.`,
      recommendation:
        deployTasks.length > 2
          ? "Review deployment queue — infrastructure scaling may be needed."
          : "Infrastructure operating within normal parameters.",
      confidence: ctx.agent.performanceScore,
      priority: deployTasks.length > 2 ? "high" : "low",
      impact: deployTasks.length > 2 ? "high" : "medium",
      metadata: { healthDimension: "infrastructure" },
    }),
  );

  if (deployTasks.length > 0) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "operational_alert",
        title: "Deployment failure risk",
        summary: `${deployTasks.length} deployment tasks pending execution.`,
        reasoning: `Queued deployments increase risk of environment drift and release delays.`,
        recommendation: `Execute deployment pipeline review and validate rollback procedures.`,
        confidence: 85,
        priority: "high",
        impact: "high",
        relatedProjectIds: [...new Set(deployTasks.map((t) => t.projectId))],
      }),
    );
  }

  return records.slice(0, 4);
}

function generateGenericIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const records: IntelligenceInput[] = [];

  if (ctx.agent.approvalRequired) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "pending_decision",
        title: `Approval required: ${ctx.agent.role} actions`,
        summary: ctx.agent.description,
        reasoning: `${ctx.agent.name} requires founder approval before executing high-impact actions.`,
        recommendation: `Review and approve or reject ${ctx.agent.name}'s pending actions.`,
        confidence: null,
        priority: "high",
        impact: "high",
        status: "awaiting_approval",
      }),
    );
  }

  for (const objective of ctx.agent.objectives.slice(0, 1)) {
    records.push(
      baseInput(ctx, {
        intelligenceType: "current_priority",
        title: objective,
        summary: `${ctx.agent.role} priority: ${objective}`,
        reasoning: `Derived from agent objectives and ${ctx.openTasks.length} open tasks.`,
        recommendation: `Support ${ctx.agent.name} in advancing ${objective}.`,
        confidence: ctx.agent.performanceScore,
        priority: ctx.agent.priorityLevel,
        impact: "medium",
      }),
    );
  }

  return records.slice(0, 3);
}

export function generateRoleIntelligence(ctx: AgentIntelligenceContext): IntelligenceInput[] {
  const kind = resolveAgentRoleKind(ctx.agent.role, ctx.agent.name);

  switch (kind) {
    case "ceo":
      return generateCeoIntelligence(ctx);
    case "coo":
      return generateCooIntelligence(ctx);
    case "product_manager":
      return generateProductManagerIntelligence(ctx);
    case "project_manager":
      return generateProjectManagerIntelligence(ctx);
    case "solution_architect":
      return generateArchitectIntelligence(ctx);
    case "qa":
      return generateQaIntelligence(ctx);
    case "devops":
      return generateDevopsIntelligence(ctx);
    default:
      return generateGenericIntelligence(ctx);
  }
}
