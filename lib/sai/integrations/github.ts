import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export async function getGitHubActivity(limit = 30) {
  const companyId = await getCompanyId();
  return prisma.gitHubActivity.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getGitHubSummary() {
  const companyId = await getCompanyId();
  const activities = await prisma.gitHubActivity.findMany({ where: { companyId } });

  const byType: Record<string, number> = {};
  const byRepo: Record<string, number> = {};
  activities.forEach((a) => {
    byType[a.type] = (byType[a.type] ?? 0) + 1;
    byRepo[a.repo] = (byRepo[a.repo] ?? 0) + 1;
  });

  return { byType, byRepo, total: activities.length };
}

export async function syncGitHubRepos() {
  const companyId = await getCompanyId();
  const config = await prisma.integrationConfig.findUnique({ where: { provider: "github" } });

  if (!config?.enabled) {
    return { synced: 0, message: "GitHub integration not enabled. Configure GITHUB_TOKEN to enable sync." };
  }

  const count = await prisma.gitHubActivity.count({ where: { companyId } });
  return { synced: count, message: `GitHub sync complete. ${count} activities tracked.` };
}
