import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { updateDocument } from "@/lib/sai/documents";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const companyId = await getCompanyId();

  const document = await prisma.document.findFirst({
    where: { id, companyId },
    include: {
      author: { select: { name: true } },
      project: { select: { name: true } },
      versions: { orderBy: { version: "desc" } },
    },
  });

  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return NextResponse.json(document);
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { title, content } = body as { title?: string; content?: string };

  const updated = await updateDocument(id, {
    title,
    content,
    authorId: session!.id,
  });

  if (!updated) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return NextResponse.json(updated);
}
