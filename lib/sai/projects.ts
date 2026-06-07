import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { logActivity } from "@/lib/sai/activity";

export interface CreateProjectInput {
  name: string;
  description?: string;
  goals?: string[];
  roadmap?: string[];
  status?: string;
  ownerId?: string;
  leadId?: string;
  objectiveId?: string;
}

export async function createProject(input: CreateProjectInput) {
  const companyId = await getCompanyId();

  const project = await prisma.project.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim(),
      goals: JSON.stringify(input.goals ?? []),
      roadmap: JSON.stringify(input.roadmap ?? []),
      status: input.status ?? "on_track",
      progress: 0,
      ownerId: input.ownerId,
      leadId: input.leadId,
      objectiveId: input.objectiveId,
      companyId,
    },
  });

  await logActivity({
    type: "project_created",
    title: `Project created: ${project.name}`,
    companyId,
    userId: input.ownerId,
    projectId: project.id,
  });

  return project;
}

export async function updateProjectProgress(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { stage: true },
  });

  if (tasks.length === 0) return;

  const completed = tasks.filter((t) => ["released", "archived"].includes(t.stage)).length;
  const progress = Math.round((completed / tasks.length) * 100);

  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });
}
