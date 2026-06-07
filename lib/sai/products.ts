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

export async function getProducts() {
  const companyId = await getCompanyId();
  const products = await prisma.product.findMany({
    where: { companyId },
    include: {
      projects: { select: { id: true, name: true, status: true, progress: true } },
      opportunities: { select: { title: true, value: true, stage: true } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    healthScore: p.healthScore,
    healthStatus: p.healthStatus,
    growthRate: p.growthRate,
    revenue: p.revenue,
    roadmap: parseJsonArray(p.roadmap),
    openRisks: parseJsonArray(p.openRisks),
    customerFeedback: parseJsonArray(p.customerFeedback),
    technicalDebt: p.technicalDebt,
    releaseReadiness: p.releaseReadiness,
    aiRecommendations: parseJsonArray(p.aiRecommendations),
    projects: p.projects,
    pipelineValue: p.opportunities.reduce((sum, o) => sum + o.value, 0),
  }));
}

export async function getProductBySlug(slug: string) {
  const companyId = await getCompanyId();
  const product = await prisma.product.findFirst({
    where: { slug, companyId },
    include: {
      projects: true,
      opportunities: { include: { customer: true } },
    },
  });

  if (!product) return null;

  return {
    ...product,
    roadmap: parseJsonArray(product.roadmap),
    openRisks: parseJsonArray(product.openRisks),
    customerFeedback: parseJsonArray(product.customerFeedback),
    aiRecommendations: parseJsonArray(product.aiRecommendations),
  };
}
