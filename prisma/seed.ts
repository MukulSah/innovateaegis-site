import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.userNotification.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.agentDraft.deleteMany();
  await prisma.knowledgeGraphEdge.deleteMany();
  await prisma.organizationalLearning.deleteMany();
  await prisma.gitHubActivity.deleteMany();
  await prisma.notionPage.deleteMany();
  await prisma.revenueOpportunity.deleteMany();
  await prisma.revenueMetric.deleteMany();
  await prisma.saiRecommendation.deleteMany();
  await prisma.agentCommunication.deleteMany();
  await prisma.decisionProposalInput.deleteMany();
  await prisma.decisionProposal.deleteMany();
  await prisma.objectiveInitiative.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customerFeatureRequest.deleteMany();
  await prisma.customerIssue.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.knowledgeRecord.deleteMany();
  await prisma.agentMemory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.epic.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.release.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.document.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.aIAgent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.healthMetric.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "InnovateAegis",
      slug: "innovateaegis",
      revenue: 0,
      revenueTrend: null,
    },
  });

  const departments = await Promise.all(
    ["Executive", "Engineering", "Product", "Sales", "Marketing", "Operations"].map((name) =>
      prisma.department.create({ data: { name, companyId: company.id } }),
    ),
  );

  const executive = departments.find((d) => d.name === "Executive")!;

  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: await bcrypt.hash("admin", 10),
      name: "Mukul",
      role: "owner",
      title: "Founder & CEO",
      departmentId: executive.id,
      status: "online",
      companyId: company.id,
    },
  });

  await prisma.integrationConfig.createMany({
    data: [
      { provider: "github", enabled: false, config: "{}" },
      { provider: "notion", enabled: false, config: "{}" },
      { provider: "slack", enabled: false, config: "{}" },
      { provider: "jira", enabled: false, config: "{}" },
    ],
  });

  console.log("✅ Production seed complete — empty company ready");
  console.log("   Login: admin / admin");
  console.log("   Create projects, employees, and objectives from the UI");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
