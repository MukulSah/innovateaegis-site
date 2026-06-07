import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sai/activity";
import { notifyUser } from "@/lib/sai/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: taskId } = await params;
  const companyId = await getCompanyId();
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { companyId } },
    include: { assignee: true },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const { content } = (await request.json()) as { content?: string };
  if (!content?.trim()) {
    return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      content: content.trim(),
      authorId: session!.id,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  await logActivity({
    type: "task_comment",
    title: `Comment on: ${task.title}`,
    companyId,
    userId: session!.id,
    projectId: task.projectId,
    taskId,
  });

  if (task.assigneeId && task.assigneeId !== session!.id) {
    await notifyUser({
      userId: task.assigneeId,
      companyId,
      title: "New comment on your task",
      message: content.trim().slice(0, 100),
      link: "/sai/workspace",
    });
  }

  return NextResponse.json(comment, { status: 201 });
}
