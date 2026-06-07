import type {
  AIAgent,
  CompanyOverview,
  Employee,
  HealthMetric,
  HealthStatus,
  MemoryRecord,
  Project,
} from "@/lib/sai/types";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function formatRevenue(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export async function getCompanyOverview(): Promise<CompanyOverview> {
  const companyId = await getCompanyId();

  const [
    company,
    activeProjects,
    employees,
    agents,
    releases,
    openIssues,
    objectives,
    healthMetrics,
  ] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.project.count({
      where: { companyId, status: { not: "completed" } },
    }),
    prisma.user.findMany({
      where: { companyId, role: { in: ["owner", "employee"] } },
    }),
    prisma.aIAgent.findMany({ where: { companyId } }),
    prisma.release.count({
      where: { companyId, status: "released" },
    }),
    prisma.task.count({
      where: {
        project: { companyId },
        stage: { notIn: ["released", "archived"] },
        isBlocker: true,
      },
    }),
    prisma.objective.findMany({
      where: { companyId, status: { not: "completed" } },
      orderBy: { impactScore: "desc" },
      take: 6,
    }),
    prisma.healthMetric.findMany({ where: { companyId } }),
  ]);

  const employeesOnline = employees.filter((e) => e.status !== "offline").length;
  const aiAgentsActive = agents.filter((a) => a.status !== "idle").length;
  const organizationHealthScore =
    healthMetrics.length > 0
      ? Math.round(
          healthMetrics.reduce((sum, m) => sum + m.score, 0) / healthMetrics.length,
        )
      : 0;

  return {
    activeProjects,
    employeesOnline,
    totalEmployees: employees.length,
    aiAgentsActive,
    totalAgents: agents.length,
    revenue: formatRevenue(company.revenue),
    revenueTrend: company.revenueTrend ?? "",
    releases,
    openIssues,
    currentObjectives: objectives.map((o) => o.title),
    organizationHealthScore,
  };
}

export async function getHealthMetrics(): Promise<HealthMetric[]> {
  const companyId = await getCompanyId();
  const metrics = await prisma.healthMetric.findMany({
    where: { companyId },
    orderBy: { slug: "asc" },
  });

  return metrics.map((m) => ({
    id: m.slug,
    label: m.label,
    status: m.status as HealthStatus,
    score: m.score,
    explanation: m.explanation,
  }));
}

export async function getAIAgents(): Promise<AIAgent[]> {
  const companyId = await getCompanyId();
  const agents = await prisma.aIAgent.findMany({
    where: { companyId },
    include: {
      assignedTasks: {
        where: { stage: { notIn: ["released", "archived"] } },
        select: { projectId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return agents.map((agent) => {
    const projectIds = new Set(agent.assignedTasks.map((t) => t.projectId));
    return {
      id: agent.slug,
      name: agent.name,
      role: agent.role,
      responsibilities: parseJsonArray(agent.responsibilities),
      status: agent.status as AIAgent["status"],
      assignedProjects: projectIds.size,
      performanceScore: agent.performanceScore,
    };
  });
}

export async function getEmployees(): Promise<Employee[]> {
  const companyId = await getCompanyId();
  const users = await prisma.user.findMany({
    where: { companyId, role: "employee" },
    include: { department: true },
    orderBy: { name: "asc" },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.title ?? "Employee",
    department: user.department?.name ?? "General",
    status: user.status as Employee["status"],
    currentWork: user.currentWork ?? "No active assignment",
  }));
}

export async function getProjects(): Promise<Project[]> {
  const companyId = await getCompanyId();
  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      lead: true,
      tasks: { select: { stage: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((project) => {
    const tasksTotal = project.tasks.length;
    const tasksCompleted = project.tasks.filter((t) =>
      ["released", "archived"].includes(t.stage),
    ).length;

    return {
      id: project.id,
      name: project.name,
      objective: project.objective ?? project.description ?? "",
      status: project.status as Project["status"],
      progress: project.progress,
      lead: project.lead?.name ?? "Unassigned",
      tasksTotal,
      tasksCompleted,
    };
  });
}

export async function getMemoryRecords(limit = 20): Promise<MemoryRecord[]> {
  const companyId = await getCompanyId();
  const records = await prisma.knowledgeRecord.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return records.map((record) => ({
    id: record.id,
    type: mapKnowledgeType(record.type),
    title: record.title,
    summary: record.summary ?? record.content.slice(0, 200),
    date: record.createdAt.toISOString().slice(0, 10),
  }));
}

function mapKnowledgeType(
  type: string,
): MemoryRecord["type"] {
  const mapping: Record<string, MemoryRecord["type"]> = {
    product: "product",
    engineering: "engineering",
    customer: "customer",
    decision: "decision",
    business: "business",
    project_decision: "decision",
    architecture_decision: "engineering",
    engineering_notes: "engineering",
    feature_history: "product",
    release_notes: "product",
    meeting_notes: "business",
    lessons_learned: "business",
  };
  return mapping[type] ?? "business";
}

export async function getBrainStats() {
  const companyId = await getCompanyId();

  const [knowledgeCount, taskCount, projectCount, decisionCount, meetingCount] =
    await Promise.all([
      prisma.knowledgeRecord.count({ where: { companyId } }),
      prisma.task.count({ where: { project: { companyId } } }),
      prisma.project.count({ where: { companyId } }),
      prisma.decision.count({ where: { companyId } }),
      prisma.meeting.count({ where: { companyId } }),
    ]);

  return {
    dataPoints: taskCount + projectCount + decisionCount + meetingCount + knowledgeCount,
    memories: knowledgeCount,
  };
}

export async function getTasks() {
  const companyId = await getCompanyId();
  return prisma.task.findMany({
    where: { project: { companyId } },
    include: {
      project: { select: { name: true } },
      assignee: { select: { name: true } },
      agent: { select: { name: true } },
    },
    orderBy: [{ isBlocker: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });
}

export async function getReleases() {
  const companyId = await getCompanyId();
  return prisma.release.findMany({
    where: { companyId },
    include: { project: { select: { name: true } } },
    orderBy: { releaseDate: "desc" },
    take: 20,
  });
}

export async function getObjectives() {
  const companyId = await getCompanyId();
  return prisma.objective.findMany({
    where: { companyId },
    include: {
      projects: {
        select: { id: true, name: true, status: true, progress: true },
      },
    },
    orderBy: [{ priority: "asc" }, { impactScore: "desc" }],
  });
}

export async function getProjectExecutionGraph(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      objectiveRef: true,
      epics: {
        orderBy: { sortOrder: "asc" },
        include: {
          features: {
            orderBy: { sortOrder: "asc" },
            include: {
              tasks: {
                orderBy: { createdAt: "asc" },
                include: {
                  assignee: { select: { name: true } },
                  agent: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      releases: { orderBy: { releaseDate: "desc" } },
      milestones: { orderBy: { dueDate: "asc" } },
    },
  });
}

export async function getAgentBySlug(slug: string) {
  const companyId = await getCompanyId();
  return prisma.aIAgent.findFirst({
    where: { slug, companyId },
    include: {
      memories: { orderBy: { createdAt: "desc" }, take: 20 },
      assignedTasks: {
        where: { stage: { notIn: ["archived"] } },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
}

export async function getMeetings() {
  const companyId = await getCompanyId();
  return prisma.meeting.findMany({
    where: { companyId },
    include: {
      organizer: { select: { name: true } },
      project: { select: { name: true } },
      attendees: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 30,
  });
}

export async function getDecisions() {
  const companyId = await getCompanyId();
  return prisma.decision.findMany({
    where: { companyId },
    include: {
      owner: { select: { name: true } },
      projects: { select: { name: true } },
      knowledge: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getActivityTimeline(limit = 40) {
  const companyId = await getCompanyId();
  return prisma.activityLog.findMany({
    where: { companyId },
    include: {
      user: { select: { name: true } },
      agent: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getEmployeeById(id: string) {
  const companyId = await getCompanyId();
  return prisma.user.findFirst({
    where: { id, companyId, role: "employee" },
    include: {
      department: true,
      assignedTasks: {
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      },
      knowledgeRecords: { orderBy: { createdAt: "desc" }, take: 10 },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
}
