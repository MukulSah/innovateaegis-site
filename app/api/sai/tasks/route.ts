import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sai/activity";
import { notifyUser } from "@/lib/sai/notifications";
import { updateProjectProgress } from "@/lib/sai/projects";
import { createKnowledgeRecord } from "@/lib/sai/knowledge";

export async function GET(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const assigneeId = searchParams.get("assigneeId");
  const projectId = searchParams.get("projectId");
  const companyId = await getCompanyId();

  const tasks = await prisma.task.findMany({
    where: {
      project: { companyId },
      ...(projectId ? { projectId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(session!.role === "employee" && !assigneeId ? { assigneeId: session!.id } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      _count: { select: { comments: true, attachments: true } },
    },
    orderBy: [{ isBlocker: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const {
    title,
    description,
    projectId,
    assigneeId,
    priority,
    stage,
    dueDate,
    isBlocker,
    dependsOnId,
    featureId,
  } = body as {
    title?: string;
    description?: string;
    projectId?: string;
    assigneeId?: string;
    priority?: string;
    stage?: string;
    dueDate?: string;
    isBlocker?: boolean;
    dependsOnId?: string;
    featureId?: string;
  };

  if (!title?.trim() || !projectId) {
    return NextResponse.json({ error: "Title and project are required" }, { status: 400 });
  }

  const companyId = await getCompanyId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description,
      projectId,
      assigneeId,
      priority: priority ?? "medium",
      stage: stage ?? "backlog",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      isBlocker: isBlocker ?? false,
      dependsOnId,
      featureId,
    },
    include: {
      project: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  await logActivity({
    type: "task_created",
    title: `Task created: ${task.title}`,
    companyId,
    userId: session!.id,
    projectId,
    taskId: task.id,
  });

  if (assigneeId && assigneeId !== session!.id) {
    await notifyUser({
      userId: assigneeId,
      companyId,
      title: "New task assigned",
      message: `You were assigned: ${task.title}`,
      link: `/sai/workspace`,
    });
  }

  return NextResponse.json(task, { status: 201 });
}
