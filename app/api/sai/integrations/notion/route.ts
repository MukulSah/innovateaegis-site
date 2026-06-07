import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getNotionConfig,
  getNotionPages,
  pushDocumentToNotion,
  syncNotionPages,
} from "@/lib/sai/integrations/notion";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const [config, pages] = await Promise.all([getNotionConfig(), getNotionPages()]);
  return NextResponse.json({ config, pages });
}

export async function POST(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  const { action, databaseId, documentId } = body as {
    action?: string;
    databaseId?: string;
    documentId?: string;
  };

  if (action === "configure") {
    const config = JSON.stringify({ databaseId });
    await prisma.integrationConfig.upsert({
      where: { provider: "notion" },
      create: { provider: "notion", enabled: Boolean(process.env.NOTION_API_KEY), config },
      update: { config, enabled: Boolean(process.env.NOTION_API_KEY) },
    });
    return NextResponse.json({ message: "Notion configuration saved" });
  }

  if (action === "push" && documentId) {
    const result = await pushDocumentToNotion(documentId);
    return NextResponse.json(result);
  }

  const result = await syncNotionPages();
  return NextResponse.json(result);
}
