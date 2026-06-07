import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { createDocument } from "@/lib/sai/documents";

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const projectId = searchParams.get("projectId");
  const companyId = await getCompanyId();

  const documents = await prisma.document.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
      ...(projectId ? { projectId } : {}),
    },
    include: {
      author: { select: { name: true } },
      project: { select: { name: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { title, content, type, projectId } = body as {
    title?: string;
    content?: string;
    type?: string;
    projectId?: string;
  };

  if (!title?.trim() || !content?.trim() || !type?.trim()) {
    return NextResponse.json({ error: "Title, content, and type are required" }, { status: 400 });
  }

  const document = await createDocument({
    title,
    content,
    type,
    projectId,
    authorId: session!.id,
  });

  return NextResponse.json(document, { status: 201 });
}
