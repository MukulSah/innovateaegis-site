import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export async function getCustomerProfiles() {
  const companyId = await getCompanyId();
  return prisma.customer.findMany({
    where: { companyId },
    include: {
      contacts: true,
      featureRequests: { orderBy: { createdAt: "desc" } },
      issues: { where: { status: "open" } },
      opportunities: true,
    },
    orderBy: { revenue: "desc" },
  });
}

export async function getCustomerById(id: string) {
  const companyId = await getCompanyId();
  return prisma.customer.findFirst({
    where: { id, companyId },
    include: {
      contacts: true,
      featureRequests: { orderBy: { createdAt: "desc" } },
      issues: { orderBy: { createdAt: "desc" } },
      opportunities: true,
    },
  });
}

export async function getTopFeatureRequests(limit = 10) {
  const companyId = await getCompanyId();
  return prisma.customerFeatureRequest.findMany({
    where: { customer: { companyId } },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function answerCustomerQuery(query: string): Promise<string | null> {
  const q = query.toLowerCase();
  const companyId = await getCompanyId();

  if (q.includes("company") && (q.includes("request") || q.includes("requested"))) {
    const match = q.match(/company\s+(\w+)/i) ?? q.match(/(\w+)\s+request/i);
    const searchTerm = match?.[1] ?? "";
    const customers = await prisma.customer.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: searchTerm } },
          { company: { contains: searchTerm } },
        ],
      },
      include: { featureRequests: true, issues: true },
    });

    if (customers.length === 0) return null;

    let response = "";
    for (const c of customers) {
      response += `**${c.name}** (${c.company ?? "N/A"})\n`;
      if (c.featureRequests.length > 0) {
        response += `Feature Requests:\n`;
        c.featureRequests.forEach((r) => {
          response += `- ${r.title}: ${r.description ?? ""}\n`;
        });
      }
      if (c.issues.length > 0) {
        response += `Open Issues:\n`;
        c.issues.forEach((i) => {
          response += `- [${i.severity}] ${i.title}\n`;
        });
      }
      response += "\n";
    }
    return response;
  }

  if (q.includes("feature") && q.includes("demand")) {
    const requests = await getTopFeatureRequests(15);
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      const key = r.title.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    let response = `**Features with Most Customer Demand:**\n\n`;
    sorted.slice(0, 8).forEach(([title, count], i) => {
      response += `${i + 1}. ${title} (${count} request${count > 1 ? "s" : ""})\n`;
    });
    return response;
  }

  return null;
}
