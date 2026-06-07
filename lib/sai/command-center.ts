import { generateRecommendations } from "@/lib/sai/recommendations";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export interface CommandCenterBriefing {
  requiresAttention: Array<{ title: string; message: string; severity: string; link?: string }>;
  blocked: Array<{ title: string; project: string; assignee: string | null }>;
  behindSchedule: Array<{ name: string; progress: number; status: string }>;
  opportunities: Array<{ title: string; message: string }>;
  pendingDecisions: Array<{ id: string; title: string; question: string }>;
  topPriorities: Array<{ title: string; message: string }>;
  summary: string;
}

export async function getCommandCenterBriefing(): Promise<CommandCenterBriefing> {
  const companyId = await getCompanyId();
  const recommendations = await generateRecommendations();

  const [blockers, delayedProjects, pendingDecisions] = await Promise.all([
    prisma.task.findMany({
      where: {
        project: { companyId },
        isBlocker: true,
        stage: { notIn: ["released", "archived"] },
      },
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      take: 10,
    }),
    prisma.project.findMany({
      where: { companyId, status: { in: ["delayed", "at_risk"] } },
      orderBy: { progress: "asc" },
    }),
    prisma.decisionProposal.findMany({
      where: { companyId, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const requiresAttention = recommendations
    .filter((r) => r.category === "attention" || r.severity === "critical")
    .map((r) => ({
      title: r.title,
      message: r.message,
      severity: r.severity,
      link: r.actionLink,
    }));

  const opportunities = recommendations
    .filter((r) => r.category === "opportunity")
    .map((r) => ({ title: r.title, message: r.message }));

  const topPriorities = recommendations
    .filter((r) => r.category === "priority" || r.category === "action")
    .slice(0, 5)
    .map((r) => ({ title: r.title, message: r.message }));

  const criticalCount = recommendations.filter((r) => r.severity === "critical").length;
  const summary =
    criticalCount > 0
      ? `SAI detected ${criticalCount} critical items requiring your attention today. ${blockers.length} tasks are blocked. ${delayedProjects.length} projects are behind schedule.`
      : `Company operations are stable. ${opportunities.length} growth opportunities identified. Review recommendations below.`;

  return {
    requiresAttention,
    blocked: blockers.map((t) => ({
      title: t.title,
      project: t.project.name,
      assignee: t.assignee?.name ?? null,
    })),
    behindSchedule: delayedProjects.map((p) => ({
      name: p.name,
      progress: p.progress,
      status: p.status,
    })),
    opportunities,
    pendingDecisions: pendingDecisions.map((d) => ({
      id: d.id,
      title: d.title,
      question: d.question,
    })),
    topPriorities,
    summary,
  };
}
