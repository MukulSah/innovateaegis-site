import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { logActivity } from "@/lib/sai/activity";
import { createKnowledgeRecord } from "@/lib/sai/knowledge";

interface CreateObjectiveInput {
  title: string;
  businessGoal: string;
  priority?: string;
  targetDate?: Date;
  successMetrics?: string[];
  impactScore?: number;
  ownerId?: string;
}

const EXECUTION_TEMPLATES: Record<
  string,
  { epics: Array<{ title: string; features: Array<{ title: string; tasks: string[] }> }> }
> = {
  default: {
    epics: [
      {
        title: "Discovery & Requirements",
        features: [
          {
            title: "Requirements Gathering",
            tasks: ["Stakeholder interviews", "Requirements document", "Success criteria definition"],
          },
        ],
      },
      {
        title: "Design & Architecture",
        features: [
          {
            title: "System Design",
            tasks: ["Architecture diagram", "API contracts", "Database schema", "Security review"],
          },
        ],
      },
      {
        title: "Implementation",
        features: [
          {
            title: "Core Development",
            tasks: ["Core feature implementation", "Unit tests", "Integration tests", "Code review"],
          },
        ],
      },
      {
        title: "Quality & Release",
        features: [
          {
            title: "Release Preparation",
            tasks: ["QA validation", "Release notes", "Deployment", "Knowledge archival"],
          },
        ],
      },
    ],
  },
};

export async function createObjectiveWithExecution(input: CreateObjectiveInput) {
  const companyId = await getCompanyId();
  const template = EXECUTION_TEMPLATES.default;

  const objective = await prisma.objective.create({
    data: {
      title: input.title,
      businessGoal: input.businessGoal,
      priority: input.priority ?? "medium",
      targetDate: input.targetDate,
      successMetrics: JSON.stringify(input.successMetrics ?? []),
      impactScore: input.impactScore ?? 50,
      status: "not_started",
      companyId,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: input.title,
      description: input.businessGoal,
      objective: input.businessGoal,
      status: "on_track",
      progress: 0,
      objectiveId: objective.id,
      companyId,
    },
  });

  let taskCount = 0;
  let epicOrder = 0;

  for (const epicDef of template.epics) {
    const epic = await prisma.epic.create({
      data: {
        title: epicDef.title,
        description: `Epic for ${input.title}`,
        projectId: project.id,
        sortOrder: epicOrder++,
      },
    });

    let featureOrder = 0;
    for (const featureDef of epicDef.features) {
      const feature = await prisma.feature.create({
        data: {
          title: featureDef.title,
          description: `Feature: ${featureDef.title}`,
          acceptanceCriteria: JSON.stringify([
            `All ${featureDef.title.toLowerCase()} deliverables completed`,
            "Reviewed and approved by owner",
          ]),
          epicId: epic.id,
          sortOrder: featureOrder++,
        },
      });

      const stages: Array<"backlog" | "planning" | "ready" | "assigned"> = [
        "backlog",
        "planning",
        "ready",
        "assigned",
      ];

      for (let i = 0; i < featureDef.tasks.length; i++) {
        await prisma.task.create({
          data: {
            title: featureDef.tasks[i],
            description: `Task for ${featureDef.title} in ${input.title}`,
            stage: stages[Math.min(i, stages.length - 1)],
            projectId: project.id,
            featureId: feature.id,
            priority: i === 0 ? "high" : "medium",
          },
        });
        taskCount++;
      }
    }
  }

  await prisma.milestone.createMany({
    data: [
      {
        title: "Requirements Complete",
        dueDate: input.targetDate ? new Date(input.targetDate.getTime() - 60 * 24 * 60 * 60 * 1000) : null,
        projectId: project.id,
      },
      {
        title: "MVP Ready",
        dueDate: input.targetDate ? new Date(input.targetDate.getTime() - 14 * 24 * 60 * 60 * 1000) : null,
        projectId: project.id,
      },
      {
        title: "Launch",
        dueDate: input.targetDate,
        projectId: project.id,
      },
    ],
  });

  await prisma.document.create({
    data: {
      title: `PRD: ${input.title}`,
      content: `# Product Requirements\n\n## Business Goal\n${input.businessGoal}\n\n## Success Metrics\n${(input.successMetrics ?? []).map((m) => `- ${m}`).join("\n")}\n\n## Scope\nAuto-generated from objective by Product Manager Agent.`,
      type: "prd",
      projectId: project.id,
      authorId: input.ownerId,
      companyId,
    },
  });

  await createKnowledgeRecord({
    type: "project_decision",
    title: `Objective created: ${input.title}`,
    content: `New company objective established.\n\nBusiness Goal: ${input.businessGoal}\n\nAuto-generated: ${taskCount} tasks across ${template.epics.length} epics.`,
    summary: `Objective "${input.title}" created with full execution plan.`,
    tags: ["objective", "execution", "auto-generated"],
    projectId: project.id,
    authorId: input.ownerId,
  });

  await logActivity({
    type: "objective_created",
    title: `Objective created: ${input.title}`,
    description: `Generated ${taskCount} tasks across ${template.epics.length} epics`,
    companyId,
    userId: input.ownerId,
    projectId: project.id,
    objectiveId: objective.id,
    metadata: { taskCount, epicCount: template.epics.length },
  });

  await logActivity({
    type: "project_created",
    title: `Project created: ${project.name}`,
    companyId,
    projectId: project.id,
    objectiveId: objective.id,
  });

  return { objective, project, taskCount };
}
