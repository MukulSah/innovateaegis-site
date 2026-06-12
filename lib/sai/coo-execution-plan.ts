export type CooExecutionPlan = {
  project: string;
  objective: string;
  priority: string;
  successMetrics: string[];
  workflowSelected: string;
  requiredAgents: string[];
  dependencies: string[];
  risks: string;
  estimatedStages: string[];
  recommendation: string;
  raw: string;
};

export function parseCooExecutionPlan(
  output: string,
  ctx: {
    project: string;
    objective: string;
    strategicBrief: Record<string, unknown>;
  },
): CooExecutionPlan {
  const priorityMatch = output.match(/priority[:\s]*(high|medium|low|critical)/i);
  const riskMatch = output.match(/risk[s]?[:\s]*(.+?)(?:\n|$)/i);
  const recMatch = output.match(/recommendation[:\s]*(.+?)(?:\n|$)/i);

  const agentMatches = output.match(
    /(?:required agents?|agents? to assign|team)[:\s]*([\s\S]*?)(?:\n\n|\n#|$)/i,
  );
  const requiredAgents = agentMatches
    ? agentMatches[1]
        .split(/[\n,•\-]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 40)
        .slice(0, 8)
    : ["PM", "Architect", "Engineer", "QA", "DevOps"];

  const metricFromBrief = String(ctx.strategicBrief.successMetric ?? "");
  const successMetrics = metricFromBrief
    ? metricFromBrief.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
    : ["Primary KPI tied to objective completion"];

  const stageMatches = output.match(/(?:stages?|workflow steps?|timeline)[:\s]*([\s\S]*?)(?:\n\n|\n#|$)/i);
  const estimatedStages = stageMatches
    ? stageMatches[1]
        .split(/[\n,•\-]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
        .slice(0, 10)
    : ["Requirements", "Design", "Implementation", "Validation", "Deployment"];

  return {
    project: ctx.project,
    objective: ctx.objective,
    priority: priorityMatch?.[1]?.toLowerCase() ?? String(ctx.strategicBrief.priority ?? "high"),
    successMetrics,
    workflowSelected: "standard_sdlc",
    requiredAgents: requiredAgents.length > 0 ? requiredAgents : ["PM", "Architect", "Engineer", "QA", "DevOps"],
    dependencies: [],
    risks: riskMatch?.[1]?.trim() ?? "Low",
    estimatedStages,
    recommendation: recMatch?.[1]?.trim() ?? "Proceed",
    raw: output.slice(0, 5000),
  };
}
