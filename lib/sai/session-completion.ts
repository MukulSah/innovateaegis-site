import { findAgentForRole, getAgents } from "./agents";
import { recordExecutiveArtifact } from "./executive-artifacts";
import { postExecutiveMessage } from "./executive-session-chat";
import { computeSessionHealth } from "./execution-health";
import { addProjectMemory } from "./project-memory";
import { getSessionArtifacts } from "./session-artifacts";
import { computeStrategicHealth } from "./strategic-health";
import { getWorkflowRunById } from "./workflows";

export async function generateSessionCompletionArtifacts(
  sessionId: string,
  projectId: string,
): Promise<void> {
  const agents = await getAgents();
  const ceo = findAgentForRole(agents, ["CEO", "Chief Executive"]);
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  const docAgent = findAgentForRole(agents, ["Documentation", "Knowledge"]);

  const session = await getWorkflowRunById(sessionId);
  if (!session) return;

  const [artifacts, executionHealth, strategicHealth] = await Promise.all([
    getSessionArtifacts(sessionId),
    computeSessionHealth(sessionId),
    computeStrategicHealth(sessionId),
  ]);

  const brief = session.strategicBrief as Record<string, unknown>;
  const cooPlan = brief.cooPlan as Record<string, unknown> | undefined;

  if (coo) {
    const summary = `# Execution Summary

## Session #${session.sessionNumber ?? "—"}
**Objective:** ${session.objective}

## Delivery Status
- Execution Health: ${executionHealth.score}%
- Steps Completed: ${executionHealth.completedSteps}/${executionHealth.totalSteps}
- Failed Turns: ${executionHealth.failedTurns}

## Agents Engaged
${artifacts.map((a) => `- ${a.stepKey}: ${a.artifactName}`).join("\n")}

## COO Assessment
Session execution cycle complete. All workflow steps processed.

## Recommendation
Archive session knowledge and update project memory.
`;

    await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId,
      agentId: coo.id,
      stepKey: "execution_summary",
      artifactName: "execution_summary_v1",
      content: summary,
    });

    await postExecutiveMessage(coo, sessionId, "Execution summary recorded. Session closing.", {
      projectId,
      stepKey: "execution_summary",
      artifactName: "execution_summary_v1",
    });
  }

  if (ceo) {
    const review = `# Executive Review

## Session #${session.sessionNumber ?? "—"}
**Project:** ${session.projectName}
**Objective:** ${session.objective}

## Strategic Outcomes
- Strategic Health: ${strategicHealth.score}%
- Success Metric Probability: ${strategicHealth.successMetricProbability}%
- Goal Alignment: ${strategicHealth.goalAlignment}%

## Success Metrics
${String(brief.successMetric ?? "See strategic brief")}

## Business Impact
${strategicHealth.customerImpact}

## Executive Verdict
${
  strategicHealth.score >= 70
    ? "Objective delivery aligned with company strategy."
    : "Delivery completed with strategic gaps — review lessons learned."
}

## Priority
${String(brief.priority ?? cooPlan?.priority ?? "high")}
`;

    await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId,
      agentId: ceo.id,
      stepKey: "executive_review",
      artifactName: "executive_review_v1",
      content: review,
    });

    await postExecutiveMessage(ceo, sessionId, "Executive review complete. Strategic sponsorship concluded.", {
      projectId,
      stepKey: "executive_review",
      artifactName: "executive_review_v1",
    });
  }

  if (docAgent) {
    const report = `# Session Final Report

## ${session.objective}
Session #${session.sessionNumber} · ${session.projectName}

### Summary
${session.objective} — delivery cycle archived with ${artifacts.length} artifacts.

### Artifacts
${artifacts.map((a) => `- **${a.artifactName}** (${a.stepKey})`).join("\n")}

### Metrics
- Execution: ${executionHealth.score}%
- Strategic: ${strategicHealth.score}%
`;

    await recordExecutiveArtifact({
      workflowRunId: sessionId,
      projectId,
      agentId: docAgent.id,
      stepKey: "session_final_report",
      artifactName: "session_final_report_v1",
      content: report,
    });
  }

  await addProjectMemory({
    projectId,
    memoryType: "release",
    title: `Session #${session.sessionNumber} closed`,
    summary: `${session.objective} — executive review and execution summary archived.`,
    sourceType: "session",
    sourceId: sessionId,
  });
}
