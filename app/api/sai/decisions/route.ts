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
  const decisions = await prisma.decision.findMany({
    where: { companyId },
    include: {
      owner: { select: { name: true } },
      projects: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(decisions);
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { title, reason, impact, alternatives, projectIds, meetingId } = body as {
    title?: string;
    reason?: string;
    impact?: string;
    alternatives?: string[];
    projectIds?: string[];
    meetingId?: string;
  };

  if (!title?.trim() || !reason?.trim()) {
    return NextResponse.json({ error: "Title and reason are required" }, { status: 400 });
  }

  const companyId = await getCompanyId();
  const decision = await prisma.decision.create({
    data: {
      title: title.trim(),
      reason: reason.trim(),
      impact,
      alternatives: JSON.stringify(alternatives ?? []),
      ownerId: session!.id,
      meetingId,
      companyId,
      projects: projectIds?.length ? { connect: projectIds.map((id) => ({ id })) } : undefined,
    },
    include: { projects: { select: { name: true } } },
  });

  await createKnowledgeRecord({
    type: "project_decision",
    title: `Decision: ${decision.title}`,
    content: reason,
    summary: impact ?? reason.slice(0, 150),
    tags: ["decision"],
    authorId: session!.id,
    decisionId: decision.id,
  });

  await logActivity({
    type: "decision_created",
    title: `Decision: ${decision.title}`,
    companyId,
    userId: session!.id,
    meetingId,
  });

  return NextResponse.json(decision, { status: 201 });
}
