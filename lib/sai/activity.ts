import { prisma } from "@/lib/prisma";

export async function logActivity(input: {
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  companyId: string;
  userId?: string;
  agentId?: string;
  projectId?: string;
  taskId?: string;
  objectiveId?: string;
  meetingId?: string;
}) {
  return prisma.activityLog.create({
    data: {
      type: input.type,
      title: input.title,
      description: input.description,
      metadata: JSON.stringify(input.metadata ?? {}),
      companyId: input.companyId,
      userId: input.userId,
      agentId: input.agentId,
      projectId: input.projectId,
      taskId: input.taskId,
      objectiveId: input.objectiveId,
      meetingId: input.meetingId,
    },
  });
}
