import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { answerCustomerQuery } from "@/lib/sai/customers";
import { formatDigitalTwinFocusAnswer } from "@/lib/sai/digital-twin";
import { searchCompanyKnowledge } from "@/lib/sai/knowledge";
import { searchNotionContent } from "@/lib/sai/integrations/notion";
import { getCompanyOverview } from "@/lib/sai/queries";
import { generateRecommendations } from "@/lib/sai/recommendations";

export async function askSAI(query: string): Promise<string> {
  const q = query.toLowerCase().trim();

  if (q.includes("focus on today") || q.includes("should i work") || q.includes("what should i")) {
    return await formatDigitalTwinFocusAnswer();
  }

  const customerAnswer = await answerCustomerQuery(query);
  if (customerAnswer) return customerAnswer;

  if (q.includes("notion")) {
    const notionResults = await searchNotionContent(query.replace("notion", "").trim() || "roadmap");
    if (notionResults.length > 0) {
      let response = `**From Notion (External Memory):**\n\n`;
      notionResults.forEach((page) => {
        response += `**${page.title}** [${page.pageType}]\n${page.content.slice(0, 200)}...\n\n`;
      });
      return response;
    }
  }

  if (q.includes("prioritize") && (q.includes("sentra") || q.includes("unite"))) {
    return await explainDecisionProposal();
  }

  if (q.includes("recommend") || q.includes("priority") || q.includes("priorities")) {
    const recs = await generateRecommendations();
    let response = `**SAI Recommendations:**\n\n`;
    recs.slice(0, 8).forEach((r) => {
      response += `- **${r.title}**: ${r.message}\n`;
    });
    return response;
  }

  if (q.includes("delay") || (q.includes("sentra") && q.includes("why"))) {
    return await explainProjectDelay("Sentra");
  }

  if (q.includes("overload") || q.includes("overloaded")) {
    return await explainWorkload();
  }

  if (q.includes("finish") && (q.includes("week") || q.includes("completed"))) {
    return await explainWeeklyCompletions();
  }

  if (q.includes("decision") && q.includes("hygyr")) {
    return await explainDecisionsForProject("HYGYR");
  }

  if (q.includes("blocker") || q.includes("critical")) {
    return await explainBlockers();
  }

  if (q.includes("open bug") || q.includes("bugs") || q.includes("issues")) {
    return await explainOpenIssues();
  }

  if (q.includes("at risk") || q.includes("risk")) {
    return await explainAtRiskProjects();
  }

  if (q.includes("work on today") || q.includes("should i work")) {
    return await recommendTodayWork();
  }

  if (q.includes("roadmap") && q.includes("unite")) {
    return await explainUniteRoadmap();
  }

  if (q.length > 2) {
    const search = await searchCompanyKnowledge(query);
    if (search.totalResults > 0) {
      return formatSearchAsAnswer(query, search);
    }
  }

  const overview = await getCompanyOverview();
  return `I've analyzed your query against the company database.

**Current Snapshot:**
- ${overview.activeProjects} active projects
- ${overview.employeesOnline}/${overview.totalEmployees} employees online
- ${overview.aiAgentsActive} AI agents active
- Organization Health: ${overview.organizationHealthScore}/100
- Revenue: ${overview.revenue} (${overview.revenueTrend})
- ${overview.openIssues} critical blockers open

Try asking:
- "Why is Sentra delayed?"
- "Which engineer is overloaded?"
- "Show all critical blockers"
- "What did we finish this week?"
- "Which decisions affected HYGYR?"`;
}

async function explainProjectDelay(projectName: string) {
  const companyId = await getCompanyId();
  const project = await prisma.project.findFirst({
    where: { companyId, name: { contains: projectName } },
    include: {
      lead: true,
      tasks: {
        where: { stage: { notIn: ["released", "archived"] } },
        include: { assignee: true },
      },
      decisions: true,
    },
  });

  if (!project) {
    return `No project matching "${projectName}" found in the company database.`;
  }

  const blockers = project.tasks.filter((t) => t.isBlocker);
  const inReview = project.tasks.filter((t) => t.stage === "code_review");
  const delayed = project.status === "delayed";

  let response = `**${project.name}** is ${delayed ? "delayed" : project.status.replace(/_/g, " ")} (${project.progress}% complete).\n\n`;
  response += `**Lead:** ${project.lead?.name ?? "Unassigned"}\n`;
  response += `**Open tasks:** ${project.tasks.length}\n\n`;

  if (blockers.length > 0) {
    response += `**Blockers (${blockers.length}):**\n`;
    blockers.forEach((t) => {
      response += `- ${t.title} (${t.stage.replace(/_/g, " ")}) — ${t.assignee?.name ?? "Unassigned"}\n`;
    });
    response += "\n";
  }

  if (inReview.length > 0) {
    response += `**In Code Review (${inReview.length}):**\n`;
    inReview.forEach((t) => {
      response += `- ${t.title}\n`;
    });
    response += "\n";
  }

  const relatedKnowledge = await prisma.knowledgeRecord.findMany({
    where: { projectId: project.id },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  if (relatedKnowledge.length > 0) {
    response += `**From Company Memory:**\n`;
    relatedKnowledge.forEach((k) => {
      response += `- ${k.title}\n`;
    });
  }

  return response;
}

async function explainWorkload() {
  const companyId = await getCompanyId();
  const employees = await prisma.user.findMany({
    where: { companyId, role: "employee" },
    include: {
      assignedTasks: {
        where: { stage: { notIn: ["released", "archived"] } },
      },
      department: true,
    },
  });

  const sorted = employees
    .map((e) => ({ ...e, activeTasks: e.assignedTasks.length }))
    .sort((a, b) => b.activeTasks - a.activeTasks);

  const overloaded = sorted.filter((e) => e.activeTasks >= 3 || e.workload >= 80);

  if (overloaded.length === 0) {
    return "No engineers are currently overloaded. Team workload is balanced across active projects.";
  }

  let response = `**Overloaded Team Members (${overloaded.length}):**\n\n`;
  overloaded.forEach((e) => {
    response += `**${e.name}** (${e.title ?? "Engineer"}, ${e.department?.name ?? "General"})\n`;
    response += `- Active tasks: ${e.activeTasks}\n`;
    response += `- Workload score: ${e.workload}%\n`;
    response += `- Current work: ${e.currentWork ?? "N/A"}\n\n`;
  });

  return response;
}

async function explainWeeklyCompletions() {
  const companyId = await getCompanyId();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const completed = await prisma.task.findMany({
    where: {
      project: { companyId },
      completedAt: { gte: weekAgo },
    },
    include: {
      assignee: true,
      project: { select: { name: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  if (completed.length === 0) {
    const released = await prisma.task.findMany({
      where: {
        project: { companyId },
        stage: { in: ["released", "archived"] },
        updatedAt: { gte: weekAgo },
      },
      include: { assignee: true, project: { select: { name: true } } },
      take: 15,
    });

    if (released.length === 0) {
      return "No tasks were completed this week according to company records.";
    }

    let response = `**Completed This Week (${released.length} tasks):**\n\n`;
    released.forEach((t) => {
      response += `✅ ${t.title} — ${t.project.name} (${t.assignee?.name ?? "Unassigned"})\n`;
    });
    return response;
  }

  let response = `**Completed This Week (${completed.length} tasks):**\n\n`;
  completed.forEach((t) => {
    response += `✅ ${t.title} — ${t.project.name} (${t.assignee?.name ?? "Unassigned"})\n`;
  });
  return response;
}

async function explainDecisionsForProject(projectName: string) {
  const companyId = await getCompanyId();
  const decisions = await prisma.decision.findMany({
    where: {
      companyId,
      projects: { some: { name: { contains: projectName } } },
    },
    include: { owner: true, projects: true },
    orderBy: { createdAt: "desc" },
  });

  if (decisions.length === 0) {
  const knowledge = await prisma.knowledgeRecord.findMany({
    where: {
      companyId,
      type: { in: ["decision", "project_decision"] },
      OR: [
        { title: { contains: projectName } },
        { content: { contains: projectName } },
      ],
    },
    take: 5,
  });

    if (knowledge.length === 0) {
      return `No decisions found linked to ${projectName} in the company database.`;
    }

    let response = `**Decisions affecting ${projectName}:**\n\n`;
    knowledge.forEach((k) => {
      response += `**${k.title}** (${k.createdAt.toISOString().slice(0, 10)})\n${k.summary ?? k.content.slice(0, 150)}\n\n`;
    });
    return response;
  }

  let response = `**Decisions affecting ${projectName} (${decisions.length}):**\n\n`;
  decisions.forEach((d) => {
    response += `**${d.title}** — ${d.owner?.name ?? "Unknown"}\n`;
    response += `${d.reason}\n`;
    if (d.impact) response += `Impact: ${d.impact}\n`;
    response += "\n";
  });
  return response;
}

async function explainBlockers() {
  const companyId = await getCompanyId();
  const blockers = await prisma.task.findMany({
    where: {
      project: { companyId },
      isBlocker: true,
      stage: { notIn: ["released", "archived"] },
    },
    include: {
      project: { select: { name: true } },
      assignee: true,
    },
    orderBy: { priority: "desc" },
  });

  if (blockers.length === 0) {
    return "No critical blockers currently open. All projects are progressing.";
  }

  let response = `**Critical Blockers (${blockers.length}):**\n\n`;
  blockers.forEach((t) => {
    response += `🔴 **${t.title}**\n`;
    response += `   Project: ${t.project.name} | Stage: ${t.stage.replace(/_/g, " ")} | Owner: ${t.assignee?.name ?? "Unassigned"}\n\n`;
  });
  return response;
}

async function explainOpenIssues() {
  const companyId = await getCompanyId();
  const issues = await prisma.task.findMany({
    where: {
      project: { companyId },
      stage: { in: ["testing", "code_review", "in_progress"] },
      OR: [{ isBlocker: true }, { title: { contains: "bug" } }, { title: { contains: "fix" } }],
    },
    include: { project: { select: { name: true } }, assignee: true },
    take: 20,
  });

  const allOpen = await prisma.task.count({
    where: {
      project: { companyId },
      stage: { notIn: ["released", "archived"] },
    },
  });

  let response = `**${allOpen} open tasks** across the company.\n\n`;

  if (issues.length > 0) {
    response += `**Priority Issues (${issues.length}):**\n`;
    issues.forEach((t) => {
      response += `- [${t.project.name}] ${t.title} — ${t.stage.replace(/_/g, " ")} (${t.assignee?.name ?? "Unassigned"})\n`;
    });
  }

  return response;
}

async function explainAtRiskProjects() {
  const companyId = await getCompanyId();
  const projects = await prisma.project.findMany({
    where: { companyId, status: { in: ["at_risk", "delayed"] } },
    include: { lead: true, tasks: { where: { isBlocker: true } } },
  });

  if (projects.length === 0) {
    return "All projects are on track. No projects currently at risk or delayed.";
  }

  let response = `**Projects Needing Attention (${projects.length}):**\n\n`;
  projects.forEach((p) => {
    const icon = p.status === "delayed" ? "🔴" : "🟡";
    response += `${icon} **${p.name}** — ${p.status.replace(/_/g, " ")} (${p.progress}%)\n`;
    response += `   Lead: ${p.lead?.name ?? "Unassigned"} | Blockers: ${p.tasks.length}\n\n`;
  });
  return response;
}

async function recommendTodayWork() {
  const overview = await getCompanyOverview();
  const blockers = await explainBlockers();
  const atRisk = await explainAtRiskProjects();

  return `Based on real company data, here are your highest-impact actions today:

**Organization Health:** ${overview.organizationHealthScore}/100
**Revenue:** ${overview.revenue} (${overview.revenueTrend})

${atRisk}

${blockers}

**Recommended focus:** Address delayed projects first, unblock critical tasks, then review at-risk objectives.`;
}

async function explainUniteRoadmap() {
  const companyId = await getCompanyId();
  const project = await prisma.project.findFirst({
    where: { companyId, name: { contains: "Unite" } },
    include: {
      epics: { include: { features: { include: { tasks: true } } } },
      milestones: { orderBy: { dueDate: "asc" } },
    },
  });

  if (!project) {
    return "Unite Platform project not found in database.";
  }

  let response = `**${project.name} Roadmap** (${project.progress}% complete)\n\n`;

  if (project.milestones.length > 0) {
    response += `**Milestones:**\n`;
    project.milestones.forEach((m) => {
      response += `- ${m.title}${m.dueDate ? ` (${m.dueDate.toISOString().slice(0, 10)})` : ""} ${m.completed ? "✅" : ""}\n`;
    });
    response += "\n";
  }

  response += `**Execution Graph:**\n`;
  project.epics.forEach((epic) => {
    response += `\n▣ ${epic.title}\n`;
    epic.features.forEach((feature) => {
      const done = feature.tasks.filter((t) => ["released", "archived"].includes(t.stage)).length;
      response += `  → ${feature.title} (${done}/${feature.tasks.length} tasks)\n`;
    });
  });

  return response;
}

function formatSearchAsAnswer(
  query: string,
  search: Awaited<ReturnType<typeof searchCompanyKnowledge>>,
) {
  let response = `**Search results for "${query}"** (${search.totalResults} matches)\n\n`;

  if (search.projects.length > 0) {
    response += `**Projects (${search.projects.length}):**\n`;
    search.projects.forEach((p) => {
      response += `- ${p.name} — ${p.status} (${p.progress}%)\n`;
    });
    response += "\n";
  }

  if (search.tasks.length > 0) {
    response += `**Tasks (${search.tasks.length}):**\n`;
    search.tasks.forEach((t) => {
      response += `- [${t.project}] ${t.title} — ${t.stage}${t.assignee ? ` (${t.assignee})` : ""}\n`;
    });
    response += "\n";
  }

  if (search.knowledge.length > 0) {
    response += `**Knowledge (${search.knowledge.length}):**\n`;
    search.knowledge.forEach((k) => {
      response += `- ${k.title} [${k.type}] — ${k.summary}\n`;
    });
    response += "\n";
  }

  if (search.decisions.length > 0) {
    response += `**Decisions (${search.decisions.length}):**\n`;
    search.decisions.forEach((d) => {
      response += `- ${d.title}: ${d.reason}\n`;
    });
    response += "\n";
  }

  if (search.engineers.length > 0) {
    response += `**Engineers (${search.engineers.length}):**\n`;
    search.engineers.forEach((e) => {
      response += `- ${e.name} (${e.role}, ${e.department})\n`;
    });
    response += "\n";
  }

  if (search.meetings.length > 0) {
    response += `**Meetings (${search.meetings.length}):**\n`;
    search.meetings.forEach((m) => {
      response += `- ${m.title} [${m.type}]${m.date ? ` — ${m.date}` : ""}\n`;
    });
  }

  return response;
}

async function explainDecisionProposal() {
  const companyId = await getCompanyId();
  const proposal = await prisma.decisionProposal.findFirst({
    where: { companyId, status: "pending" },
    include: {
      agentInputs: { include: { agent: { select: { name: true, role: true } } } },
    },
  });

  if (!proposal) {
    return "No pending decision proposals requiring your approval.";
  }

  let response = `**${proposal.title}**\n${proposal.question}\n\n`;
  response += `**Agent Analysis:**\n`;
  proposal.agentInputs.forEach((input) => {
    response += `\n**${input.agent.name}** (${input.agent.role})\n`;
    response += `${input.analysis}\n`;
    response += `→ Recommends: ${input.recommendation}\n`;
  });

  if (proposal.finalRecommendation) {
    response += `\n**SAI Final Recommendation:**\n${proposal.finalRecommendation}`;
  }

  return response;
}
