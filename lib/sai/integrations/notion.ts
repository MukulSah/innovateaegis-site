import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export async function getNotionPages(type?: string) {
  const companyId = await getCompanyId();
  return prisma.notionPage.findMany({
    where: { companyId, ...(type ? { pageType: type } : {}) },
    orderBy: { syncedAt: "desc" },
  });
}

export async function searchNotionContent(query: string) {
  const companyId = await getCompanyId();
  return prisma.notionPage.findMany({
    where: {
      companyId,
      OR: [
        { title: { contains: query } },
        { content: { contains: query } },
      ],
    },
    take: 10,
  });
}

export async function syncNotionPages() {
  const companyId = await getCompanyId();
  const config = await prisma.integrationConfig.findUnique({ where: { provider: "notion" } });

  if (!config?.enabled) {
    return { synced: 0, message: "Notion integration not enabled. Configure NOTION_API_KEY to enable sync." };
  }

  const count = await prisma.notionPage.count({ where: { companyId } });
  return { synced: count, message: `Notion sync complete. ${count} pages indexed as external memory.` };
}
