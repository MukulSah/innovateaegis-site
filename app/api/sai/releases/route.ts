import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sai/activity";
import { createKnowledgeRecord } from "@/lib/sai/knowledge";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const companyId = await getCompanyId();
  const releases = await prisma.release.findMany({
    where: { companyId },
    include: { project: { select: { name: true } } },
    orderBy: { releaseDate: "desc" },
  });

  return NextResponse.json(releases);
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { version, notes, status, releaseDate, projectId } = body as {
    version?: string;
    notes?: string;
    status?: string;
    releaseDate?: string;
    projectId?: string;
  };

  if (!version?.trim()) {
    return NextResponse.json({ error: "Version is required" }, { status: 400 });
  }

  const companyId = await getCompanyId();
  const release = await prisma.release.create({
    data: {
      version: version.trim(),
      notes,
      status: status ?? "planned",
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      projectId,
      companyId,
    },
    include: { project: { select: { name: true } } },
  });

  if (notes?.trim()) {
    await createKnowledgeRecord({
      type: "release_notes",
      title: `Release ${release.version}`,
      content: notes,
      summary: `Release ${release.version} scheduled`,
      tags: ["release"],
      projectId,
      authorId: session!.id,
    });
  }

  await logActivity({
    type: "release_created",
    title: `Release: ${release.version}`,
    companyId,
    userId: session!.id,
    projectId: projectId ?? undefined,
  });

  return NextResponse.json(release, { status: 201 });
}
