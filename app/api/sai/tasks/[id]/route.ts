import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sai/activity";
import { notifyUser } from "@/lib/sai/notifications";
import { updateProjectProgress } from "@/lib/sai/projects";
import { createKnowledgeRecord } from "@/lib/sai/knowledge";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const companyId = await getCompanyId();

  const task = await prisma.task.findFirst({
    where: { id, project: { companyId } },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      dependsOn: { select: { id: true, title: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const companyId = await getCompanyId();
  const existing = await prisma.task.findFirst({
    where: { id, project: { companyId } },
  });

  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = await request.json();
  const { title, description, stage, priority, dueDate, assigneeId, isBlocker, dependsOnId } =
    body as Record<string, unknown>;

  const completedStages = ["released", "archived"];
  const newStage = typeof stage === "string" ? stage : existing.stage;
  const wasCompleted = !completedStages.includes(existing.stage);
  const nowCompleted = completedStages.includes(newStage);

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(typeof title === "string" ? { title } : {}),
      ...(typeof description === "string" ? { description } : {}),
      ...(typeof stage === "string" ? { stage } : {}),
      ...(typeof priority === "string" ? { priority } : {}),
      ...(typeof dueDate === "string" ? { dueDate: new Date(dueDate) } : {}),
      ...(typeof assigneeId === "string" ? { assigneeId } : {}),
      ...(typeof isBlocker === "boolean" ? { isBlocker } : {}),
      ...(typeof dependsOnId === "string" ? { dependsOnId } : {}),
      ...(nowCompleted ? { completedAt: new Date() } : {}),
    },
    include: {
      project: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  await logActivity({
    type: "task_updated",
    title: `Task updated: ${task.title}`,
    description: stage ? `Stage: ${newStage}` : undefined,
    companyId,
    userId: session!.id,
    projectId: existing.projectId,
    taskId: id,
  });

  if (typeof assigneeId === "string" && assigneeId !== existing.assigneeId) {
    await notifyUser({
      userId: assigneeId,
      companyId,
      title: "Task assigned to you",
      message: task.title,
      link: "/sai/workspace",
    });
  }

  if (wasCompleted && nowCompleted) {
    await createKnowledgeRecord({
      type: "engineering_notes",
      title: `Completed: ${task.title}`,
      content: task.description ?? `Task completed in ${task.project.name}`,
      summary: `Work completed on ${task.title}`,
      tags: ["task", "completed"],
      projectId: existing.projectId,
      authorId: session!.id,
    });
  }

  await updateProjectProgress(existing.projectId);
  return NextResponse.json(task);
}
