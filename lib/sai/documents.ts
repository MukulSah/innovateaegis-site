import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { logActivity } from "@/lib/sai/activity";
import { createKnowledgeRecord } from "@/lib/sai/knowledge";

export async function createDocument(input: {
  title: string;
  content: string;
  type: string;
  projectId?: string;
  authorId?: string;
}) {
  const companyId = await getCompanyId();

  const document = await prisma.document.create({
    data: {
      title: input.title.trim(),
      content: input.content,
      type: input.type,
      projectId: input.projectId,
      authorId: input.authorId,
      companyId,
    },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      content: input.content,
      authorId: input.authorId,
    },
  });

  await createKnowledgeRecord({
    type: input.type === "prd" ? "product" : input.type,
    title: input.title,
    content: input.content.slice(0, 2000),
    summary: `${input.type} document created`,
    tags: ["document", input.type],
    projectId: input.projectId,
    authorId: input.authorId,
  });

  await logActivity({
    type: "document_created",
    title: `Document created: ${input.title}`,
    companyId,
    userId: input.authorId,
    projectId: input.projectId,
  });

  return document;
}

export async function updateDocument(
  id: string,
  input: { title?: string; content?: string; authorId?: string },
) {
  const companyId = await getCompanyId();
  const existing = await prisma.document.findFirst({
    where: { id, companyId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  if (!existing) return null;

  const nextVersion = (existing.versions[0]?.version ?? 0) + 1;
  const content = input.content ?? existing.content;

  const updated = await prisma.document.update({
    where: { id },
    data: {
      title: input.title?.trim() ?? existing.title,
      content,
    },
  });

  if (input.content && input.content !== existing.content) {
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        version: nextVersion,
        content: input.content,
        authorId: input.authorId,
      },
    });
  }

  await logActivity({
    type: "document_updated",
    title: `Document updated: ${updated.title}`,
    companyId,
    userId: input.authorId,
    projectId: existing.projectId ?? undefined,
  });

  return updated;
}
