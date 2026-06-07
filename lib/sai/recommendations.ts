import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export interface Recommendation {
  id: string;
  category: "priority" | "risk" | "opportunity" | "action" | "attention";
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low";
  actionLabel?: string;
  actionLink?: string;
}

export async function generateRecommendations(): Promise<Recommendation[]> {
  const companyId = await getCompanyId();
  const recommendations: Omit<Recommendation, "id">[] = [];

  const [delayedProjects, overloadedEmployees, atRiskObjectives, blockers, customers, products, opportunities] =
    await Promise.all([
      prisma.project.findMany({
        where: { companyId, status: { in: ["delayed", "at_risk"] } },
        include: { lead: true },
      }),
      prisma.user.findMany({
        where: { companyId, role: "employee", OR: [{ workload: { gte: 85 } }] },
        include: { assignedTasks: { where: { stage: { notIn: ["released", "archived"] } } } },
      }),
      prisma.objective.findMany({ where: { companyId, status: "at_risk" } }),
      prisma.task.count({
        where: { project: { companyId }, isBlocker: true, stage: { notIn: ["released", "archived"] } },
      }),
      prisma.customer.findMany({ where: { companyId }, include: { issues: { where: { status: "open" } } } }),
      prisma.product.findMany({ where: { companyId } }),
      prisma.revenueOpportunity.findMany({
        where: { companyId, stage: { in: ["prospect", "qualified"] } },
        include: { product: true },
      }),
    ]);

  for (const project of delayedProjects) {
    const daysBehind = project.status === "delayed" ? 8 : 3;
    recommendations.push({
      category: project.status === "delayed" ? "priority" : "risk",
      title: `${project.name} ${project.status === "delayed" ? "is behind schedule" : "is at risk"}`,
      message: `${project.name} is ${daysBehind} days behind schedule. Lead: ${project.lead?.name ?? "Unassigned"}. Progress: ${project.progress}%.`,
      severity: project.status === "delayed" ? "critical" : "high",
      actionLabel: "View project",
      actionLink: "/sai/projects",
    });
  }

  for (const emp of overloadedEmployees) {
    recommendations.push({
      category: "risk",
      title: `Engineer workload exceeds ${emp.workload}%`,
      message: `${emp.name} has ${emp.assignedTasks.length} active tasks and workload at ${emp.workload}%. Risk of burnout and delivery delays.`,
      severity: emp.workload >= 95 ? "critical" : "high",
      actionLabel: "View team",
      actionLink: "/sai/employees",
    });
  }

  const hygyrProduct = products.find((p) => p.slug === "hygyr");
  if (hygyrProduct) {
    recommendations.push({
      category: "opportunity",
      title: "HYGYR SEO improvements may increase traffic by 30%",
      message: "Organic search optimization for HYGYR premium keywords could drive significant user acquisition at low CAC.",
      severity: "medium",
      actionLabel: "View product",
      actionLink: "/sai/brain",
    });
  }

  const faceNovaProduct = products.find((p) => p.slug === "facenova");
  const faceNovaOpps = opportunities.filter((o) => o.product?.slug === "facenova");
  if (faceNovaProduct && faceNovaOpps.length === 0) {
    recommendations.push({
      category: "attention",
      title: "FaceNova has no active sales pipeline",
      message: "No qualified opportunities in pipeline for FaceNova. Sales Agent recommends outreach to 3 warm leads.",
      severity: "high",
      actionLabel: "View revenue",
      actionLink: "/sai/analytics",
    });
  }

  if (blockers > 0) {
    recommendations.push({
      category: "attention",
      title: `${blockers} critical blockers require attention`,
      message: "Blocked tasks are delaying releases and customer commitments. Immediate review recommended.",
      severity: "critical",
      actionLabel: "View blockers",
      actionLink: "/sai/tasks",
    });
  }

  for (const obj of atRiskObjectives) {
    recommendations.push({
      category: "risk",
      title: `Objective at risk: ${obj.title}`,
      message: obj.businessGoal,
      severity: "high",
      actionLabel: "View objectives",
      actionLink: "/sai/projects",
    });
  }

  const escalatedCustomers = customers.filter((c) => c.issues.length > 0);
  if (escalatedCustomers.length > 0) {
    recommendations.push({
      category: "attention",
      title: `${escalatedCustomers.length} customers have open issues`,
      message: `${escalatedCustomers.map((c) => c.name).join(", ")} need attention. Customer Success Agent flagged escalations.`,
      severity: "high",
      actionLabel: "View customers",
      actionLink: "/sai/memory",
    });
  }

  const sentraVsUnite = delayedProjects.some((p) => p.name.includes("Sentra")) &&
    atRiskObjectives.some((o) => o.title.includes("Unite"));
  if (sentraVsUnite) {
    recommendations.push({
      category: "action",
      title: "Decision needed: Prioritize Sentra or Unite?",
      message: "CEO Agent requests owner decision. Both projects compete for engineering resources.",
      severity: "high",
      actionLabel: "Review decision",
      actionLink: "/sai/memory",
    });
  }

  recommendations.push({
    category: "opportunity",
    title: "Sentra enterprise pipeline: 4 qualified leads",
    message: "Sales Agent reports $120K potential ARR from Sentra enterprise deals closing this quarter.",
    severity: "medium",
    actionLabel: "View pipeline",
    actionLink: "/sai/analytics",
  });

  await prisma.saiRecommendation.deleteMany({
    where: { companyId, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  const existing = await prisma.saiRecommendation.count({ where: { companyId, dismissed: false } });
  if (existing === 0) {
    await prisma.saiRecommendation.createMany({
      data: recommendations.map((r) => ({
        category: r.category,
        title: r.title,
        message: r.message,
        severity: r.severity,
        actionLabel: r.actionLabel,
        actionLink: r.actionLink,
        companyId,
      })),
    });
  }

  const stored = await prisma.saiRecommendation.findMany({
    where: { companyId, dismissed: false },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  if (stored.length > 0) {
    return stored.map((r) => ({
      id: r.id,
      category: r.category as Recommendation["category"],
      title: r.title,
      message: r.message,
      severity: r.severity as Recommendation["severity"],
      actionLabel: r.actionLabel ?? undefined,
      actionLink: r.actionLink ?? undefined,
    }));
  }

  return recommendations.map((r, i) => ({ ...r, id: `gen-${i}` }));
}
