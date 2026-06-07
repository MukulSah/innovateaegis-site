import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { logActivity } from "@/lib/sai/activity";

export interface KnowledgeSearchResult {
  query: string;
  tasks: Array<{ id: string; title: string; project: string; stage: string; assignee: string | null }>;
  documents: Array<{ id: string; title: string; type: string }>;
  meetings: Array<{ id: string; title: string; type: string; date: string | null }>;
  decisions: Array<{ id: string; title: string; reason: string; date: string }>;
  knowledge: Array<{ id: string; title: string; type: string; summary: string; date: string }>;
  engineers: Array<{ id: string; name: string; role: string; department: string }>;
  projects: Array<{ id: string; name: string; status: string; progress: number }>;
  totalResults: number;
}

export async function searchCompanyKnowledge(query: string): Promise<KnowledgeSearchResult> {
  const companyId = await getCompanyId();
  const term = query.trim();

  if (!term) {
    return emptyResult("");
  }

  const contains = { contains: term };

  const [tasks, documents, meetings, decisions, knowledge, engineers, projects] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          project: { companyId },
          OR: [
            { title: contains },
            { description: contains },
          ],
        },
        include: {
          project: { select: { name: true } },
          assignee: { select: { name: true } },
        },
        take: 15,
      }),
      prisma.document.findMany({
        where: { companyId, OR: [{ title: contains }, { content: contains }] },
        take: 10,
      }),
      prisma.meeting.findMany({
        where: {
          companyId,
          OR: [{ title: contains }, { notes: contains }, { agenda: contains }],
        },
        take: 10,
      }),
      prisma.decision.findMany({
        where: {
          companyId,
          OR: [{ title: contains }, { reason: contains }, { impact: contains }],
        },
        take: 10,
      }),
      prisma.knowledgeRecord.findMany({
        where: {
          companyId,
          OR: [{ title: contains }, { content: contains }, { summary: contains }, { tags: contains }],
        },
        take: 15,
      }),
      prisma.user.findMany({
        where: {
          companyId,
          role: "employee",
          OR: [
            { name: contains },
            { title: contains },
            { skills: contains },
            { currentWork: contains },
          ],
        },
        include: { department: true },
        take: 10,
      }),
      prisma.project.findMany({
        where: {
          companyId,
          OR: [{ name: contains }, { description: contains }, { objective: contains }],
        },
        take: 10,
      }),
    ]);

  const result: KnowledgeSearchResult = {
    query: term,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      project: t.project.name,
      stage: t.stage.replace(/_/g, " "),
      assignee: t.assignee?.name ?? null,
    })),
    documents: documents.map((d) => ({ id: d.id, title: d.title, type: d.type })),
    meetings: meetings.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type.replace(/_/g, " "),
      date: m.scheduledAt?.toISOString().slice(0, 10) ?? null,
    })),
    decisions: decisions.map((d) => ({
      id: d.id,
      title: d.title,
      reason: d.reason.slice(0, 150),
      date: d.createdAt.toISOString().slice(0, 10),
    })),
    knowledge: knowledge.map((k) => ({
      id: k.id,
      title: k.title,
      type: k.type.replace(/_/g, " "),
      summary: k.summary ?? k.content.slice(0, 120),
      date: k.createdAt.toISOString().slice(0, 10),
    })),
    engineers: engineers.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.title ?? "Employee",
      department: e.department?.name ?? "General",
    })),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status.replace(/_/g, " "),
      progress: p.progress,
    })),
    totalResults:
      tasks.length +
      documents.length +
      meetings.length +
      decisions.length +
      knowledge.length +
      engineers.length +
      projects.length,
  };

  return result;
}

export async function createKnowledgeRecord(input: {
  type: string;
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  projectId?: string;
  meetingId?: string;
  decisionId?: string;
  authorId?: string;
}) {
  const companyId = await getCompanyId();

  const record = await prisma.knowledgeRecord.create({
    data: {
      type: input.type,
      title: input.title,
      content: input.content,
      summary: input.summary,
      tags: JSON.stringify(input.tags ?? []),
      projectId: input.projectId,
      meetingId: input.meetingId,
      decisionId: input.decisionId,
      authorId: input.authorId,
      companyId,
    },
  });

  await logActivity({
    type: "knowledge_created",
    title: `Knowledge recorded: ${input.title}`,
    description: input.summary,
    companyId,
    userId: input.authorId,
    projectId: input.projectId,
  });

  return record;
}

function emptyResult(query: string): KnowledgeSearchResult {
  return {
    query,
    tasks: [],
    documents: [],
    meetings: [],
    decisions: [],
    knowledge: [],
    engineers: [],
    projects: [],
    totalResults: 0,
  };
}
