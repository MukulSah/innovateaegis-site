import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { createObjectiveWithExecution } from "@/lib/sai/execution";
import { logActivity } from "@/lib/sai/activity";

const STRATEGY_TEMPLATES: Record<string, { initiatives: string[]; metrics: string[] }> = {
  acquisition: {
    initiatives: [
      "Identify target customer segments",
      "Launch outbound sales campaign",
      "Create product demo pipeline",
      "Develop case studies and social proof",
      "Implement referral program",
    ],
    metrics: ["New customers signed", "Pipeline value", "Conversion rate", "CAC"],
  },
  default: {
    initiatives: [
      "Define success criteria",
      "Allocate resources",
      "Execute in sprints",
      "Measure outcomes weekly",
    ],
    metrics: ["Progress %", "Tasks completed", "Timeline adherence"],
  },
};

export async function createAutonomousObjective(input: {
  title: string;
  businessGoal: string;
  priority?: string;
  targetDate?: Date;
  successMetrics?: string[];
  impactScore?: number;
  ownerId?: string;
}) {
  const isAcquisition = input.title.toLowerCase().includes("acquire") ||
    input.title.toLowerCase().includes("customer");

  const template = isAcquisition ? STRATEGY_TEMPLATES.acquisition : STRATEGY_TEMPLATES.default;

  const result = await createObjectiveWithExecution({
    ...input,
    successMetrics: template.metrics,
    impactScore: isAcquisition ? 85 : 70,
  });

  const companyId = await getCompanyId();

  for (let i = 0; i < template.initiatives.length; i++) {
    await prisma.objectiveInitiative.create({
      data: {
        title: template.initiatives[i],
        description: `Initiative ${i + 1} for: ${input.title}`,
        status: i === 0 ? "in_progress" : "planned",
        objectiveId: result.objective.id,
        ownerId: input.ownerId,
        sortOrder: i,
      },
    });
  }

  await prisma.saiRecommendation.create({
    data: {
      category: "action",
      title: `Autonomous objective launched: ${input.title}`,
      message: `SAI created strategy with ${template.initiatives.length} initiatives and ${result.taskCount} tasks. Owner supervises — SAI coordinates.`,
      severity: "medium",
      companyId,
    },
  });

  await logActivity({
    type: "objective_created",
    title: `Autonomous objective: ${input.title}`,
    description: `Strategy with ${template.initiatives.length} initiatives auto-generated`,
    companyId,
    userId: input.ownerId,
    objectiveId: result.objective.id,
  });

  return result;
}

export async function getObjectiveWithInitiatives(objectiveId: string) {
  return prisma.objective.findUnique({
    where: { id: objectiveId },
    include: {
      initiatives: { orderBy: { sortOrder: "asc" } },
      projects: {
        include: {
          tasks: { where: { stage: { notIn: ["archived"] } } },
        },
      },
    },
  });
}
