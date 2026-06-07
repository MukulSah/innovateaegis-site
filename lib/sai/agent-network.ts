import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export async function getAgentCommunications(limit = 30) {
  const companyId = await getCompanyId();
  return prisma.agentCommunication.findMany({
    where: { companyId },
    include: {
      fromAgent: { select: { slug: true, name: true, role: true } },
      toAgent: { select: { slug: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAgentNetworkByType() {
  const messages = await getAgentCommunications(50);
  return {
    discussions: messages.filter((m) => m.type === "discussion"),
    recommendations: messages.filter((m) => m.type === "recommendation"),
    decisions: messages.filter((m) => m.type === "decision"),
    escalations: messages.filter((m) => m.type === "escalation"),
  };
}

export async function getDecisionProposals() {
  const companyId = await getCompanyId();
  return prisma.decisionProposal.findMany({
    where: { companyId },
    include: {
      agentInputs: {
        include: { agent: { select: { slug: true, name: true, role: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
