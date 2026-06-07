import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { getCommandCenterBriefing } from "@/lib/sai/command-center";
import { generateRecommendations } from "@/lib/sai/recommendations";

export interface DigitalTwinState {
  timestamp: string;
  company: {
    healthScore: number;
    revenue: string;
    activeProjects: number;
    openBlockers: number;
    employeesOnline: number;
    agentsActive: number;
  };
  briefing: Awaited<ReturnType<typeof getCommandCenterBriefing>>;
  recommendations: Awaited<ReturnType<typeof generateRecommendations>>;
  focusAreas: string[];
}

export async function getDigitalTwinState(): Promise<DigitalTwinState> {
  const companyId = await getCompanyId();

  const [company, healthMetrics, briefing, recommendations, projects, blockers, employees, agents] =
    await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
      prisma.healthMetric.findMany({ where: { companyId } }),
      getCommandCenterBriefing(),
      generateRecommendations(),
      prisma.project.count({ where: { companyId, status: { not: "completed" } } }),
      prisma.task.count({
        where: { project: { companyId }, isBlocker: true, stage: { notIn: ["released", "archived"] } },
      }),
      prisma.user.count({ where: { companyId, role: "employee", status: { not: "offline" } } }),
      prisma.aIAgent.count({ where: { companyId, status: { not: "idle" } } }),
    ]);

  const healthScore =
    healthMetrics.length > 0
      ? Math.round(healthMetrics.reduce((s, m) => s + m.score, 0) / healthMetrics.length)
      : 0;

  const focusAreas: string[] = [];

  if (briefing.blocked.length > 0) {
    focusAreas.push(`Unblock ${briefing.blocked.length} critical tasks`);
  }
  if (briefing.behindSchedule.length > 0) {
    focusAreas.push(`Review delayed project: ${briefing.behindSchedule[0].name}`);
  }
  if (briefing.pendingDecisions.length > 0) {
    focusAreas.push(`Approve decision: ${briefing.pendingDecisions[0].title}`);
  }
  if (briefing.opportunities.length > 0) {
    focusAreas.push(`Pursue opportunity: ${briefing.opportunities[0].title}`);
  }
  if (focusAreas.length === 0) {
    focusAreas.push("Review weekly objectives progress", "Check team workload balance");
  }

  return {
    timestamp: new Date().toISOString(),
    company: {
      healthScore,
      revenue: `$${company.revenue.toLocaleString()}`,
      activeProjects: projects,
      openBlockers: blockers,
      employeesOnline: employees,
      agentsActive: agents,
    },
    briefing,
    recommendations: recommendations.slice(0, 8),
    focusAreas,
  };
}

export async function formatDigitalTwinFocusAnswer(): Promise<string> {
  const state = await getDigitalTwinState();

  let response = `**What you should focus on today** (Digital Twin Analysis)\n\n`;
  response += `${state.briefing.summary}\n\n`;

  response += `**Company State:**\n`;
  response += `- Health Score: ${state.company.healthScore}/100\n`;
  response += `- Revenue: ${state.company.revenue}\n`;
  response += `- Active Projects: ${state.company.activeProjects}\n`;
  response += `- Critical Blockers: ${state.company.openBlockers}\n\n`;

  response += `**Top Focus Areas:**\n`;
  state.focusAreas.forEach((area, i) => {
    response += `${i + 1}. ${area}\n`;
  });

  if (state.briefing.topPriorities.length > 0) {
    response += `\n**SAI Priorities:**\n`;
    state.briefing.topPriorities.forEach((p) => {
      response += `- **${p.title}**: ${p.message}\n`;
    });
  }

  if (state.briefing.pendingDecisions.length > 0) {
    response += `\n**Decisions Awaiting Approval:**\n`;
    state.briefing.pendingDecisions.forEach((d) => {
      response += `- ${d.title}: ${d.question}\n`;
    });
  }

  return response;
}
