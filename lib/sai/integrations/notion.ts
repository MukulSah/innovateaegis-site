import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { logActivity } from "@/lib/sai/activity";

interface NotionConfig {
  databaseId?: string;
}

function parseConfig(raw: string): NotionConfig {
  try {
    return JSON.parse(raw) as NotionConfig;
  } catch {
    return {};
  }
}

async function notionFetch(path: string, apiKey: string, method = "GET", body?: unknown) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function extractPlainText(blocks: Array<{ type: string; [key: string]: unknown }>): string {
  const parts: string[] = [];
  for (const block of blocks) {
    const data = block[block.type] as { rich_text?: Array<{ plain_text: string }> } | undefined;
    if (data?.rich_text) {
      parts.push(data.rich_text.map((t) => t.plain_text).join(""));
    }
  }
  return parts.join("\n");
}

function getPageTitle(page: { properties: Record<string, unknown> }): string {
  for (const prop of Object.values(page.properties)) {
    const p = prop as { type?: string; title?: Array<{ plain_text: string }> };
    if (p.type === "title" && p.title) {
      return p.title.map((t) => t.plain_text).join("") || "Untitled";
    }
  }
  return "Untitled";
}

export async function getNotionPages(type?: string) {
  const companyId = await getCompanyId();
  return prisma.notionPage.findMany({
    where: { companyId, ...(type ? { pageType: type } : {}) },
    orderBy: { syncedAt: "desc" },
  });
}

export async function getNotionConfig() {
  const config = await prisma.integrationConfig.findUnique({ where: { provider: "notion" } });
  const apiKey = process.env.NOTION_API_KEY;
  return {
    enabled: config?.enabled ?? false,
    hasApiKey: Boolean(apiKey),
    config: config ? parseConfig(config.config) : {},
  };
}

export async function searchNotionContent(query: string) {
  const companyId = await getCompanyId();
  return prisma.notionPage.findMany({
    where: {
      companyId,
      OR: [{ title: { contains: query } }, { content: { contains: query } }],
    },
    take: 10,
  });
}

export async function syncNotionPages() {
  const companyId = await getCompanyId();
  const apiKey = process.env.NOTION_API_KEY;
  const config = await prisma.integrationConfig.findUnique({ where: { provider: "notion" } });

  if (!apiKey) {
    return { synced: 0, message: "Set NOTION_API_KEY environment variable to enable Notion sync." };
  }

  if (!config?.enabled) {
    await prisma.integrationConfig.upsert({
      where: { provider: "notion" },
      create: { provider: "notion", enabled: true, config: config?.config ?? "{}" },
      update: { enabled: true },
    });
  }

  const notionConfig = parseConfig(config?.config ?? "{}");
  let synced = 0;

  if (notionConfig.databaseId) {
    const result = (await notionFetch(`/databases/${notionConfig.databaseId}/query`, apiKey, "POST", {
      page_size: 25,
    })) as { results: Array<{ id: string; url: string; properties: Record<string, unknown> }> };

    for (const page of result.results) {
      const blocks = (await notionFetch(`/blocks/${page.id}/children`, apiKey)) as {
        results: Array<{ type: string; [key: string]: unknown }>;
      };
      const content = extractPlainText(blocks.results);
      const title = getPageTitle(page);

      const existingPage = await prisma.notionPage.findFirst({
        where: { companyId, externalId: page.id },
      });

      if (existingPage) {
        await prisma.notionPage.update({
          where: { id: existingPage.id },
          data: { title, content, syncedAt: new Date() },
        });
      } else {
        await prisma.notionPage.create({
          data: {
            externalId: page.id,
            title,
            content,
            pageType: "wiki",
            url: page.url,
            companyId,
          },
        });
      }

      const existingDoc = await prisma.document.findFirst({
        where: { companyId, title },
      });

      if (!existingDoc) {
        await prisma.document.create({
          data: {
            title,
            content,
            type: "notion_import",
            companyId,
          },
        });
      } else if (existingDoc.content !== content) {
        const versions = await prisma.documentVersion.count({ where: { documentId: existingDoc.id } });
        await prisma.document.update({
          where: { id: existingDoc.id },
          data: { content },
        });
        await prisma.documentVersion.create({
          data: {
            documentId: existingDoc.id,
            version: versions + 1,
            content,
          },
        });
      }

      synced++;
    }
  } else {
    const search = (await notionFetch("/search", apiKey, "POST", {
      query: "",
      page_size: 25,
      filter: { property: "object", value: "page" },
    })) as { results: Array<{ id: string; url: string; properties: Record<string, unknown> }> };

    for (const page of search.results) {
      const blocks = (await notionFetch(`/blocks/${page.id}/children`, apiKey)) as {
        results: Array<{ type: string; [key: string]: unknown }>;
      };
      const content = extractPlainText(blocks.results);
      const title = getPageTitle(page);

      const existing = await prisma.notionPage.findFirst({
        where: { companyId, externalId: page.id },
      });

      if (existing) {
        await prisma.notionPage.update({
          where: { id: existing.id },
          data: { title, content, syncedAt: new Date() },
        });
      } else {
        await prisma.notionPage.create({
          data: {
            externalId: page.id,
            title,
            content,
            pageType: "wiki",
            url: page.url,
            companyId,
          },
        });
      }
      synced++;
    }
  }

  await logActivity({
    type: "integration_sync",
    title: "Notion sync completed",
    description: `Synced ${synced} pages from Notion`,
    companyId,
    metadata: { provider: "notion", synced },
  });

  return { synced, message: `Notion sync complete. ${synced} pages indexed.` };
}

export async function pushDocumentToNotion(documentId: string) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return { success: false, message: "NOTION_API_KEY not configured" };
  }

  const companyId = await getCompanyId();
  const doc = await prisma.document.findFirst({
    where: { id: documentId, companyId },
  });

  if (!doc) return { success: false, message: "Document not found" };

  const config = await prisma.integrationConfig.findUnique({ where: { provider: "notion" } });
  const notionConfig = parseConfig(config?.config ?? "{}");

  if (!notionConfig.databaseId) {
    return { success: false, message: "Configure notion.databaseId in integration settings" };
  }

  await notionFetch("/pages", apiKey, "POST", {
    parent: { database_id: notionConfig.databaseId },
    properties: {
      Name: { title: [{ text: { content: doc.title } }] },
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: doc.content.slice(0, 2000) } }],
        },
      },
    ],
  });

  return { success: true, message: `Pushed "${doc.title}" to Notion` };
}
