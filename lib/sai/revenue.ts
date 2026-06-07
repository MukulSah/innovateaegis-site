import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export async function getRevenueDashboard() {
  const companyId = await getCompanyId();

  const [company, latestMetric, opportunities, customers, products] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.revenueMetric.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.revenueOpportunity.findMany({
      where: { companyId },
      include: { product: true, customer: true },
      orderBy: { value: "desc" },
    }),
    prisma.customer.findMany({
      where: { companyId },
      orderBy: { revenue: "desc" },
    }),
    prisma.product.findMany({
      where: { companyId },
      select: { name: true, slug: true, revenue: true },
    }),
  ]);

  const pipeline = opportunities.reduce((sum, o) => sum + o.value * (o.probability / 100), 0);
  const totalCustomerRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);

  return {
    mrr: latestMetric?.mrr ?? company.revenue / 12,
    arr: latestMetric?.arr ?? company.revenue,
    pipeline,
    forecast: latestMetric?.forecast ?? pipeline * 1.2,
    growthRate: latestMetric?.growthRate ?? company.revenueTrend ?? "+0%",
    opportunities,
    customers,
    revenueByProduct: products,
    totalCustomerRevenue,
  };
}
