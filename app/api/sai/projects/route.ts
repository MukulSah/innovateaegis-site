import { NextResponse } from "next/server";
import { requireOwner, requireSession } from "@/lib/sai/api-auth";
import { createProject } from "@/lib/sai/projects";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const companyId = await getCompanyId();
  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      lead: { select: { id: true, name: true } },
      _count: { select: { tasks: true, releases: true, documents: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const { session, error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  const { name, description, goals, roadmap, status, leadId, objectiveId } = body as {
    name?: string;
    description?: string;
    goals?: string[];
    roadmap?: string[];
    status?: string;
    leadId?: string;
    objectiveId?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const project = await createProject({
    name: name.trim(),
    description,
    goals,
    roadmap,
    status,
    ownerId: session!.id,
    leadId,
    objectiveId,
  });

  return NextResponse.json(project, { status: 201 });
}
