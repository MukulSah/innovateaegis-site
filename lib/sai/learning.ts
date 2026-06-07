import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export async function getOrganizationalLearnings(limit = 20) {
  const companyId = await getCompanyId();
  return prisma.organizationalLearning.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getLearningsForProject(projectName: string) {
  const companyId = await getCompanyId();
  const project = await prisma.project.findFirst({
    where: { companyId, name: { contains: projectName } },
  });
  if (!project) return [];

  return prisma.organizationalLearning.findMany({
    where: { companyId, projectId: project.id },
    orderBy: { createdAt: "desc" },
  });
}
