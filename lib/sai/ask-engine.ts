import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { searchCompanyKnowledge } from "@/lib/sai/knowledge";

export async function askSAI(query: string): Promise<string> {
  const q = query.trim();
  if (!q) return "Please enter a question about your company data.";

  const companyId = await getCompanyId();
  const ql = q.toLowerCase();

  if (ql.includes("block") || ql.includes("blocking")) {
    const projectFilter = await extractProjectName(companyId, ql);
    return await answerBlockers(companyId, projectFilter);
  }

  if (ql.includes("overdue") && ql.includes("objective")) {
    return await answerOverdueObjectives(companyId);
  }

  if (ql.includes("workload") || ql.includes("overloaded")) {
    return await answerWorkload(companyId);
  }

  if ((ql.includes("complete") || ql.includes("finished")) && ql.includes("week")) {
    return await answerWeeklyCompletions(companyId);
  }

  if (ql.includes("risk") || ql.includes("at risk")) {
    return await answerProjectsAtRisk(companyId);
  }

  if (ql.includes("release") && (ql.includes("upcoming") || ql.includes("next"))) {
    return await answerUpcomingReleases(companyId);
  }

  const search = await searchCompanyKnowledge(q);
  if (search.totalResults > 0) {
    return formatSearchResults(q, search);
  }

  return await answerGeneralSnapshot(companyId);
}

async function answerBlockers(companyId: string, projectFilter: string | null) {
  const blockers = await prisma.task.findMany({
    where: {
      project: {
        companyId,
        ...(projectFilter ? { name: { contains: projectFilter } } : {}),
      },
      isBlocker: true,
      stage: { notIn: ["released", "archived"] },
    },
    include: {
      project: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  if (blockers.length === 0) {
    return projectFilter
      ? `No open blockers found for project matching "${projectFilter}".`
      : "No critical blockers in the system.";
  }

  let response = `**${blockers.length} open blocker(s):**\n\n`;
  blockers.forEach((t) => {
    response += `- **${t.title}** [${t.project.name}] — ${t.stage.replace(/_/g, " ")}`;
    if (t.assignee) response += ` (${t.assignee.name})`;
    if (t.dueDate) response += ` — due ${t.dueDate.toISOString().slice(0, 10)}`;
    response += "\n";
  });
  return response;
}

async function answerOverdueObjectives(companyId: string) {
  const objectives = await prisma.objective.findMany({
    where: {
      companyId,
      status: { notIn: ["completed", "cancelled"] },
      targetDate: { lt: new Date() },
    },
    orderBy: { targetDate: "asc" },
  });

  if (objectives.length === 0) return "No objectives are overdue.";

  let response = `**${objectives.length} overdue objective(s):**\n\n`;
  objectives.forEach((o) => {
    response += `- **${o.title}** — due ${o.targetDate?.toISOString().slice(0, 10) ?? "N/A"} (${o.status.replace(/_/g, " ")})\n`;
  });
  return response;
}

async function answerWorkload(companyId: string) {
  const employees = await prisma.user.findMany({
    where: { companyId, role: "employee" },
    include: {
      assignedTasks: {
        where: { stage: { notIn: ["released", "archived"] } },
      },
    },
  });

  if (employees.length === 0) return "No employees in the system. Add employees to assign work.";

  const sorted = employees
    .map((e) => ({ name: e.name, count: e.assignedTasks.length, title: e.title }))
    .sort((a, b) => b.count - a.count);

  let response = `**Team workload:**\n\n`;
  sorted.forEach((e) => {
    response += `- ${e.name} (${e.title ?? "Employee"}): ${e.count} active task(s)\n`;
  });
  response += `\nHighest: **${sorted[0].name}** with ${sorted[0].count} tasks.`;
  return response;
}

async function answerWeeklyCompletions(companyId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const completed = await prisma.task.findMany({
    where: {
      project: { companyId },
      OR: [
        { completedAt: { gte: weekAgo } },
        { stage: { in: ["released", "archived"] }, updatedAt: { gte: weekAgo } },
      ],
    },
    include: {
      assignee: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });

  if (completed.length === 0) return "No tasks completed in the last 7 days.";

  let response = `**${completed.length} task(s) completed this week:**\n\n`;
  completed.forEach((t) => {
    response += `- ${t.title} [${t.project.name}]${t.assignee ? ` — ${t.assignee.name}` : ""}\n`;
  });
  return response;
}

async function answerProjectsAtRisk(companyId: string) {
  const projects = await prisma.project.findMany({
    where: { companyId, status: { in: ["at_risk", "delayed"] } },
    include: { lead: { select: { name: true } } },
  });

  if (projects.length === 0) return "All projects are on track.";

  let response = `**${projects.length} project(s) at risk or delayed:**\n\n`;
  projects.forEach((p) => {
    response += `- **${p.name}** — ${p.status.replace(/_/g, " ")} (${p.progress}%)`;
    if (p.lead) response += ` — lead: ${p.lead.name}`;
    response += "\n";
  });
  return response;
}

async function answerUpcomingReleases(companyId: string) {
  const releases = await prisma.release.findMany({
    where: { companyId, status: { in: ["planned", "in_progress"] } },
    include: { project: { select: { name: true } } },
    orderBy: { releaseDate: "asc" },
    take: 10,
  });

  if (releases.length === 0) return "No upcoming releases scheduled.";

  let response = `**Upcoming releases:**\n\n`;
  releases.forEach((r) => {
    response += `- **${r.version}** [${r.project?.name ?? "No project"}] — ${r.releaseDate?.toISOString().slice(0, 10) ?? "TBD"} (${r.status})\n`;
  });
  return response;
}

async function answerGeneralSnapshot(companyId: string) {
  const [projects, objectives, tasks, blockers, employees] = await Promise.all([
    prisma.project.count({ where: { companyId } }),
    prisma.objective.count({ where: { companyId, status: { notIn: ["completed", "cancelled"] } } }),
    prisma.task.count({ where: { project: { companyId }, stage: { notIn: ["released", "archived"] } } }),
    prisma.task.count({ where: { project: { companyId }, isBlocker: true, stage: { notIn: ["released", "archived"] } } }),
    prisma.user.count({ where: { companyId, role: "employee" } }),
  ]);

  if (projects === 0) {
    return "Your company has no data yet. Create a project from the Projects page to get started.";
  }

  return `**Company snapshot** (from your data):

- ${projects} project(s)
- ${objectives} active objective(s)
- ${tasks} open task(s)
- ${blockers} blocker(s)
- ${employees} employee(s)

Try asking:
- "What is blocking [project name]?"
- "Which objectives are overdue?"
- "What was completed this week?"
- "Which engineer has the highest workload?"`;
}

async function extractProjectName(companyId: string, query: string): Promise<string | null> {
  const projects = await prisma.project.findMany({
    where: { companyId },
    select: { name: true },
  });
  const found = projects.find((p) => query.includes(p.name.toLowerCase()));
  return found?.name ?? null;
}

function formatSearchResults(
  query: string,
  search: Awaited<ReturnType<typeof searchCompanyKnowledge>>,
) {
  let response = `**Results for "${query}"** (${search.totalResults} matches)\n\n`;

  if (search.projects.length > 0) {
    response += `**Projects:**\n`;
    search.projects.forEach((p) => { response += `- ${p.name} (${p.status}, ${p.progress}%)\n`; });
    response += "\n";
  }
  if (search.tasks.length > 0) {
    response += `**Tasks:**\n`;
    search.tasks.forEach((t) => { response += `- [${t.project}] ${t.title} — ${t.stage}\n`; });
    response += "\n";
  }
  if (search.knowledge.length > 0) {
    response += `**Knowledge:**\n`;
    search.knowledge.forEach((k) => { response += `- ${k.title}\n`; });
    response += "\n";
  }
  if (search.documents.length > 0) {
    response += `**Documents:**\n`;
    search.documents.forEach((d) => { response += `- ${d.title} [${d.type}]\n`; });
  }

  return response;
}
