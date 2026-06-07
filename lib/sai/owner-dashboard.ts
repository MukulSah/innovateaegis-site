import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export interface OwnerDashboard {
  projectsAtRisk: Array<{ id: string; name: string; status: string; progress: number }>;
  objectivesBehind: Array<{ id: string; title: string; targetDate: string | null; status: string }>;
  upcomingReleases: Array<{ id: string; version: string; releaseDate: string | null; project: string | null }>;
  openDecisions: Array<{ id: string; title: string; createdAt: string }>;
  recentActivity: Array<{ id: string; title: string; type: string; createdAt: string }>;
  criticalBlockers: Array<{ id: string; title: string; project: string; assignee: string | null; dueDate: string | null }>;
  isEmpty: boolean;
}

export async function getOwnerDashboard(): Promise<OwnerDashboard> {
  const companyId = await getCompanyId();
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    projectsAtRisk,
    objectivesBehind,
    upcomingReleases,
    openDecisions,
    recentActivity,
    criticalBlockers,
    projectCount,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { companyId, status: { in: ["at_risk", "delayed"] } },
      select: { id: true, name: true, status: true, progress: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.objective.findMany({
      where: {
        companyId,
        status: { notIn: ["completed", "cancelled"] },
        targetDate: { lt: now },
      },
      select: { id: true, title: true, targetDate: true, status: true },
      orderBy: { targetDate: "asc" },
      take: 10,
    }),
    prisma.release.findMany({
      where: {
        companyId,
        status: { in: ["planned", "in_progress"] },
        releaseDate: { lte: weekFromNow },
      },
      include: { project: { select: { name: true } } },
      orderBy: { releaseDate: "asc" },
      take: 10,
    }),
    prisma.decision.findMany({
      where: { companyId },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { companyId },
      select: { id: true, title: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
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
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.project.count({ where: { companyId } }),
  ]);

  return {
    projectsAtRisk,
    objectivesBehind: objectivesBehind.map((o) => ({
      ...o,
      targetDate: o.targetDate?.toISOString() ?? null,
    })),
    upcomingReleases: upcomingReleases.map((r) => ({
      id: r.id,
      version: r.version,
      releaseDate: r.releaseDate?.toISOString() ?? null,
      project: r.project?.name ?? null,
    })),
    openDecisions: openDecisions.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
    recentActivity: recentActivity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    criticalBlockers: criticalBlockers.map((t) => ({
      id: t.id,
      title: t.title,
      project: t.project.name,
      assignee: t.assignee?.name ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
    })),
    isEmpty: projectCount === 0,
  };
}
