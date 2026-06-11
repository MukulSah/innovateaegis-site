import type {
  AgentIntelligenceSection,
  CompanyHealthCenter,
  ExecutiveAlert,
  HealthDimension,
  HealthTrend,
  IntelligenceCard,
} from "@/lib/sai/founder-workspace.types";
import type { Agent } from "@/lib/sai/types";
import type { AgentIntelligenceRecord, IntelligenceType } from "./types";
import {
  FOUNDER_ALERT_TYPES,
  FOUNDER_DECISION_TYPES,
  FOUNDER_HEALTH_TYPES,
  FOUNDER_OPPORTUNITY_TYPES,
  FOUNDER_PRIORITY_TYPES,
  FOUNDER_RECOMMENDATION_TYPES,
} from "./types";

function trendFromScore(score: number): HealthTrend {
  if (score >= 80) return "up";
  if (score < 50) return "down";
  return "stable";
}

export function recordToIntelligenceCard(record: AgentIntelligenceRecord): IntelligenceCard {
  const meta = record.metadata ?? {};
  return {
    id: record.id,
    cardType: record.intelligenceType,
    raisedBy: record.agentName,
    title: record.title,
    description: record.summary,
    impact: record.impact,
    status: record.status,
    confidence: record.confidence,
    createdAt: record.createdAt,
    recommendation: record.recommendation || undefined,
    riskAssessment: record.reasoning || undefined,
    requiredInvestment:
      typeof meta.requiredInvestment === "string" ? meta.requiredInvestment : undefined,
    timeline: typeof meta.timeline === "string" ? meta.timeline : undefined,
    relatedData:
      record.relatedProjectIds.length > 0
        ? `${record.relatedProjectIds.length} related project(s)`
        : undefined,
  };
}

export function filterRecordsByTypes(
  records: AgentIntelligenceRecord[],
  types: IntelligenceType[],
): AgentIntelligenceRecord[] {
  return records.filter((r) => types.includes(r.intelligenceType));
}

export function recordsToExecutiveAlerts(records: AgentIntelligenceRecord[]): ExecutiveAlert[] {
  return filterRecordsByTypes(records, FOUNDER_ALERT_TYPES)
    .slice(0, 8)
    .map((record) => ({
      id: record.id,
      severity: (record.impact === "critical"
        ? "critical"
        : record.impact === "high"
          ? "high"
          : record.impact === "medium"
            ? "medium"
            : "low") as ExecutiveAlert["severity"],
      sourceAgent: record.agentName,
      title: record.title,
      impact: record.impact,
      requiredAction: record.recommendation || record.reasoning || "Review and direct next steps",
      createdAt: record.createdAt,
    }));
}

const HEALTH_DIMENSION_LABELS: Record<string, string> = {
  product: "Product Health",
  operations: "Operational Health",
  project: "Project Health",
  infrastructure: "Infrastructure Health",
  customer: "Customer Health",
  revenue: "Revenue Health",
  team: "Team Health",
};

export function buildHealthCenterFromIntelligence(
  healthRecords: AgentIntelligenceRecord[],
  recommendations: IntelligenceCard[],
): CompanyHealthCenter {
  const recActions = recommendations.slice(0, 2).map((r) => r.title);
  const dimensionKeys = Object.keys(HEALTH_DIMENSION_LABELS);

  const dimensions: HealthDimension[] = dimensionKeys.map((key) => {
    const signals = healthRecords.filter(
      (r) => (r.metadata?.healthDimension as string) === key || r.title.toLowerCase().includes(key),
    );
    const score =
      signals.length > 0
        ? Math.round(
            signals.reduce((sum, s) => sum + (s.confidence ?? 70), 0) / signals.length,
          )
        : 75;
    const contributors = [...new Set(signals.map((s) => s.agentName))].slice(0, 3);

    return {
      key,
      label: HEALTH_DIMENSION_LABELS[key],
      score,
      trend: trendFromScore(score),
      contributors,
      recommendedActions: recActions,
    };
  });

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );

  return {
    dimensions,
    overallScore,
    overallTrend: trendFromScore(overallScore),
  };
}

export function buildAgentIntelligencePanel(
  agents: Agent[],
  records: AgentIntelligenceRecord[],
): AgentIntelligenceSection[] {
  return agents.map((agent) => {
    const agentRecords = records.filter((r) => r.agentId === agent.id);
    const cards = agentRecords.map(recordToIntelligenceCard);

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      priorities: cards.filter((c) => FOUNDER_PRIORITY_TYPES.includes(c.cardType as IntelligenceType)),
      risks: cards.filter(
        (c) =>
          FOUNDER_ALERT_TYPES.includes(c.cardType as IntelligenceType) ||
          c.impact === "critical",
      ),
      opportunities: cards.filter((c) =>
        FOUNDER_OPPORTUNITY_TYPES.includes(c.cardType as IntelligenceType),
      ),
      recommendations: cards.filter((c) =>
        FOUNDER_RECOMMENDATION_TYPES.includes(c.cardType as IntelligenceType),
      ),
    };
  });
}

export {
  FOUNDER_ALERT_TYPES,
  FOUNDER_DECISION_TYPES,
  FOUNDER_HEALTH_TYPES,
  FOUNDER_OPPORTUNITY_TYPES,
  FOUNDER_PRIORITY_TYPES,
  FOUNDER_RECOMMENDATION_TYPES,
};
