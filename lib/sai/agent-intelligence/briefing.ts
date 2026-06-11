import "server-only";

import type { ExecutiveBriefing } from "@/lib/sai/founder-workspace.types";
import type { Agent } from "@/lib/sai/types";
import type { AgentIntelligenceRecord } from "./types";
import type { IntelligenceInput } from "./types";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function buildBriefingFromIntelligence(
  ceoAgent: Agent,
  founderFirstName: string,
  records: AgentIntelligenceRecord[],
  upcomingMeetingCount: number,
  overallHealthScore: number,
): { briefing: ExecutiveBriefing; input: IntelligenceInput } {
  const priorities = records.filter((r) => r.intelligenceType === "current_priority");
  const decisions = records.filter((r) => r.intelligenceType === "pending_decision");
  const opportunities = records.filter(
    (r) =>
      r.intelligenceType === "strategic_opportunity" ||
      r.intelligenceType === "innovation_opportunity" ||
      r.intelligenceType === "market_insight",
  );
  const alerts = records.filter(
    (r) =>
      r.intelligenceType === "risk_alert" ||
      r.intelligenceType === "escalation" ||
      r.intelligenceType === "operational_alert",
  );
  const recommendations = records.filter((r) => r.intelligenceType === "executive_recommendation");

  const criticalDecisions = decisions.filter(
    (d) => d.impact === "critical" || d.impact === "high" || d.priority === "critical",
  ).length;
  const riskEscalations = alerts.filter((a) => a.impact === "critical" || a.priority === "critical").length;

  const healthTone =
    overallHealthScore >= 75
      ? "Company health is strong"
      : overallHealthScore >= 50
        ? "Company health requires attention"
        : "Company health is under pressure";

  const recommendedActions = [
    ...new Set(
      [
        ...decisions.slice(0, 2).map((d) => d.recommendation || d.title),
        ...alerts.slice(0, 1).map((a) => a.recommendation || a.title),
        ...recommendations.slice(0, 2).map((r) => r.recommendation || r.title),
      ].filter(Boolean),
    ),
  ];

  const briefing: ExecutiveBriefing = {
    greeting: `${greetingForHour(new Date().getHours())} ${founderFirstName}`,
    companyStatusSummary: `${healthTone}. Overall health score is ${overallHealthScore}. ${ceoAgent.name} has prepared your executive briefing with ${priorities.length} priorities, ${decisions.length} decisions, and ${alerts.length} alerts requiring attention.`,
    todaysFocus: [...new Set(priorities.slice(0, 6).map((p) => p.title))].slice(0, 4),
    stats: [
      { label: "Critical Decisions", count: criticalDecisions },
      { label: "Strategic Opportunities", count: opportunities.length },
      { label: "Risk Escalations", count: riskEscalations },
      { label: "Meetings Scheduled", count: upcomingMeetingCount },
    ],
    recommendedActions,
    generatedBy: ceoAgent.name,
    generatedAt: new Date().toISOString(),
  };

  const input: IntelligenceInput = {
    agentId: ceoAgent.id,
    agentName: ceoAgent.name,
    intelligenceType: "executive_briefing",
    title: `Executive Briefing — ${new Date().toLocaleDateString()}`,
    summary: briefing.companyStatusSummary,
    reasoning: `CEO agent synthesized ${records.length} intelligence records across priorities, decisions, risks, and opportunities.`,
    recommendation: recommendedActions.join(" | ") || "Review command dashboard for full intelligence.",
    confidence: ceoAgent.performanceScore,
    priority: criticalDecisions > 0 ? "critical" : "high",
    impact: riskEscalations > 0 ? "critical" : "high",
    metadata: { briefing },
    ttlDays: 1,
  };

  return { briefing, input };
}

export function parseBriefingFromRecord(
  record: AgentIntelligenceRecord,
  founderFirstName: string,
): ExecutiveBriefing {
  const meta = record.metadata?.briefing as ExecutiveBriefing | undefined;
  if (meta?.greeting) return meta;

  return {
    greeting: `${greetingForHour(new Date().getHours())} ${founderFirstName}`,
    companyStatusSummary: record.summary,
    todaysFocus: [],
    stats: [],
    recommendedActions: record.recommendation ? [record.recommendation] : [],
    generatedBy: record.agentName,
    generatedAt: record.createdAt,
  };
}
