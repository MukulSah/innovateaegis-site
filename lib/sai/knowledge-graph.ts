import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export async function getKnowledgeGraph(limit = 40) {
  const companyId = await getCompanyId();
  return prisma.knowledgeGraphEdge.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function buildKnowledgeGraph() {
  const companyId = await getCompanyId();

  await prisma.knowledgeGraphEdge.deleteMany({ where: { companyId } });

  const edges: Array<{
    sourceType: string;
    sourceId: string;
    sourceLabel: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
    relation: string;
  }> = [];

  const customers = await prisma.customer.findMany({
    where: { companyId },
    include: { featureRequests: true },
  });

  for (const customer of customers) {
    for (const req of customer.featureRequests) {
      edges.push({
        sourceType: "customer",
        sourceId: customer.id,
        sourceLabel: customer.name,
        targetType: "feature_request",
        targetId: req.id,
        targetLabel: req.title,
        relation: "requested",
      });
    }
  }

  const tasks = await prisma.task.findMany({
    where: { project: { companyId } },
    include: {
      assignee: true,
      feature: true,
      project: true,
    },
    take: 50,
  });

  for (const task of tasks) {
    if (task.feature) {
      edges.push({
        sourceType: "feature",
        sourceId: task.feature.id,
        sourceLabel: task.feature.title,
        targetType: "task",
        targetId: task.id,
        targetLabel: task.title,
        relation: "has_task",
      });
    }
    if (task.assignee) {
      edges.push({
        sourceType: "task",
        sourceId: task.id,
        sourceLabel: task.title,
        targetType: "engineer",
        targetId: task.assignee.id,
        targetLabel: task.assignee.name,
        relation: "assigned_to",
      });
    }
    if (task.project) {
      edges.push({
        sourceType: "project",
        sourceId: task.project.id,
        sourceLabel: task.project.name,
        targetType: "task",
        targetId: task.id,
        targetLabel: task.title,
        relation: "contains",
      });
    }
  }

  const decisions = await prisma.decision.findMany({
    where: { companyId },
    include: { projects: true },
  });

  for (const decision of decisions) {
    for (const project of decision.projects) {
      edges.push({
        sourceType: "decision",
        sourceId: decision.id,
        sourceLabel: decision.title,
        targetType: "project",
        targetId: project.id,
        targetLabel: project.name,
        relation: "affects",
      });
    }
  }

  const releases = await prisma.release.findMany({
    where: { companyId, status: "released" },
    include: { project: true },
  });

  for (const release of releases) {
    if (release.project) {
      edges.push({
        sourceType: "release",
        sourceId: release.id,
        sourceLabel: release.version,
        targetType: "project",
        targetId: release.project.id,
        targetLabel: release.project.name,
        relation: "shipped_for",
      });
    }
  }

  if (edges.length > 0) {
    await prisma.knowledgeGraphEdge.createMany({
      data: edges.map((e) => ({ ...e, companyId })),
    });
  }

  return edges.length;
}

export async function queryKnowledgeGraph(entityLabel: string) {
  const companyId = await getCompanyId();
  return prisma.knowledgeGraphEdge.findMany({
    where: {
      companyId,
      OR: [
        { sourceLabel: { contains: entityLabel } },
        { targetLabel: { contains: entityLabel } },
      ],
    },
    take: 20,
  });
}
