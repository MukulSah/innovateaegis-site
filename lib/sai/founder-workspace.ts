import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getIntelligenceForFounder,
  getLatestExecutiveBriefing,
  runIntelligenceEngine,
} from "./agent-intelligence";
import { parseBriefingFromRecord } from "./agent-intelligence/briefing";
import {
  buildAgentIntelligencePanel,
  buildHealthCenterFromIntelligence,
  filterRecordsByTypes,
  FOUNDER_DECISION_TYPES,
  FOUNDER_HEALTH_TYPES,
  FOUNDER_OPPORTUNITY_TYPES,
  FOUNDER_PRIORITY_TYPES,
  FOUNDER_RECOMMENDATION_TYPES,
  recordToIntelligenceCard,
  recordsToExecutiveAlerts,
} from "./agent-intelligence/presentation";
import { getAgents } from "./agents";
import { getFounderDisplayName } from "./founder";
import { getNotifications } from "./notifications";
import { getExecutiveTimeline } from "./organizational-memory";
import type {
  CompanyHealthCenter,
  ExecutiveBriefing,
  FounderActivityEntry,
  FounderDashboard,
  FounderDiscussion,
  FounderInboxItem,
  FounderMeeting,
  FounderWorkspaceData,
  FounderWorkspaceItem,
  FounderWorkspaceSection,
} from "./founder-workspace.types";

export type {
  AgentIntelligenceSection,
  CompanyHealthCenter,
  ExecutiveAlert,
  ExecutiveBriefing,
  FounderActivityEntry,
  FounderDashboard,
  FounderDiscussion,
  FounderInboxItem,
  FounderMeeting,
  FounderWorkspaceData,
  FounderWorkspaceItem,
  FounderWorkspaceSection,
  FounderWorkspaceViewTab,
  IntelligenceCard,
} from "./founder-workspace.types";
export { FOUNDER_SECTIONS, FOUNDER_VIEW_TABS } from "./founder-workspace.types";

type ItemRow = {
  id: string;
  section: FounderWorkspaceSection;
  title: string;
  content: string;
  tags: string[];
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapItem(row: ItemRow): FounderWorkspaceItem {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    version: row.version,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseDiscussionSummary(summary: string | null): {
  objective?: string;
  context?: string;
  priority?: string;
} {
  if (!summary) return {};
  try {
    const parsed = JSON.parse(summary) as Record<string, string>;
    return {
      objective: parsed.objective,
      context: parsed.context,
      priority: parsed.priority,
    };
  } catch {
    return {};
  }
}

export async function getFounderWorkspaceItems(
  section?: FounderWorkspaceSection,
): Promise<FounderWorkspaceItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("founder_workspace_items")
    .select("*")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (section) query = query.eq("section", section);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as ItemRow[]).map(mapItem);
}

export async function createFounderWorkspaceItem(input: {
  section: FounderWorkspaceSection;
  title: string;
  content?: string;
  tags?: string[];
  createdBy?: string;
}): Promise<FounderWorkspaceItem> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("founder_workspace_items")
    .insert({
      section: input.section,
      title: input.title.trim(),
      content: input.content?.trim() ?? "",
      tags: input.tags ?? [],
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapItem(data as ItemRow);
}

export async function getFounderDiscussions(): Promise<FounderDiscussion[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("founder_discussions")
    .select("*")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const meta = parseDiscussionSummary(row.summary);
    return {
      id: row.id,
      topic: row.topic,
      status: row.status,
      participantNames: row.participant_names ?? [],
      messageCount: row.message_count ?? 0,
      relatedProjectIds: row.related_project_ids ?? [],
      objective: meta.objective,
      context: meta.context,
      priority: meta.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function createFounderDiscussion(input: {
  topic: string;
  participantAgentIds: string[];
  participantNames: string[];
  objective?: string;
  context?: string;
  priority?: string;
  relatedProjectIds?: string[];
  createdBy?: string;
}): Promise<FounderDiscussion> {
  const supabase = createSupabaseAdmin();
  const summary =
    input.objective || input.context || input.priority
      ? JSON.stringify({
          objective: input.objective ?? "",
          context: input.context ?? "",
          priority: input.priority ?? "medium",
        })
      : null;

  const { data, error } = await supabase
    .from("founder_discussions")
    .insert({
      topic: input.topic.trim(),
      participant_agent_ids: input.participantAgentIds,
      participant_names: input.participantNames,
      related_project_ids: input.relatedProjectIds ?? [],
      summary,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const meta = parseDiscussionSummary(data.summary);
  return {
    id: data.id,
    topic: data.topic,
    status: data.status,
    participantNames: data.participant_names ?? [],
    messageCount: 0,
    relatedProjectIds: data.related_project_ids ?? [],
    objective: meta.objective,
    context: meta.context,
    priority: meta.priority,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function loadActiveIntelligence() {
  let records = await getIntelligenceForFounder();
  if (records.length === 0 && isSupabaseConfigured()) {
    await runIntelligenceEngine();
    records = await getIntelligenceForFounder();
  }
  return records;
}

async function getFounderInbox(): Promise<FounderInboxItem[]> {
  const { enrichNotificationsWithLinks } = await import("./notification-links");
  const notifications = await getNotifications({ recipientType: "founder", limit: 30 });
  const enriched = await enrichNotificationsWithLinks(notifications);
  return enriched.map((n) => ({
    id: n.id,
    category: n.category,
    title: n.title,
    message: n.message,
    severity: n.severity,
    isRead: n.isRead,
    createdAt: n.createdAt,
    entityType: n.entityType,
    entityId: n.entityId,
    href: n.href,
    label: n.label,
  }));
}

async function getFounderActivityTimeline(): Promise<FounderActivityEntry[]> {
  const timeline = await getExecutiveTimeline(40);
  return timeline.map((entry) => ({
    id: entry.id,
    date: entry.date,
    type: entry.memoryType,
    title: entry.title,
    participants: entry.participants,
    summary: entry.summary || entry.outcome,
    importance: entry.importance,
  }));
}

export async function getFounderDashboard(): Promise<FounderDashboard> {
  const emptyHealth: CompanyHealthCenter = {
    dimensions: [],
    overallScore: 0,
    overallTrend: "stable",
  };

  const empty: FounderDashboard = {
    briefing: {
      greeting: "Welcome",
      companyStatusSummary: "Connect your data sources to activate executive intelligence.",
      todaysFocus: [],
      stats: [],
    },
    priorities: [],
    pendingDecisions: [],
    activeDiscussions: [],
    opportunities: [],
    upcomingMeetings: [],
    recommendations: [],
    executiveAlerts: [],
    companyHealth: emptyHealth,
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createSupabaseAdmin();
  const founderName = await getFounderDisplayName();
  const founderFirstName = founderName.split(" ")[0];

  const [records, discussions, meetingsRes, briefingRecord] = await Promise.all([
    loadActiveIntelligence(),
    getFounderDiscussions(),
    supabase
      .from("meetings")
      .select("id, topic, meeting_type, scheduled_at, status, participant_names, agenda, summary")
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_at", { ascending: true })
      .limit(10),
    getLatestExecutiveBriefing(),
  ]);

  const priorities = filterRecordsByTypes(records, FOUNDER_PRIORITY_TYPES)
    .map(recordToIntelligenceCard)
    .slice(0, 8);
  const pendingDecisions = filterRecordsByTypes(records, FOUNDER_DECISION_TYPES)
    .map(recordToIntelligenceCard)
    .slice(0, 8);
  const opportunities = filterRecordsByTypes(records, FOUNDER_OPPORTUNITY_TYPES)
    .map(recordToIntelligenceCard)
    .slice(0, 6);
  const recommendations = filterRecordsByTypes(records, FOUNDER_RECOMMENDATION_TYPES)
    .map(recordToIntelligenceCard)
    .slice(0, 6);

  const upcomingMeetings: FounderMeeting[] = (meetingsRes.data ?? []).map((m) => ({
    id: m.id,
    topic: m.topic,
    meetingType: m.meeting_type,
    scheduledAt: m.scheduled_at,
    status: m.status,
    participantNames: m.participant_names ?? [],
    agenda: m.agenda ?? "",
    summary: m.summary,
  }));

  const healthRecords = filterRecordsByTypes(records, FOUNDER_HEALTH_TYPES);
  const companyHealth = buildHealthCenterFromIntelligence(healthRecords, recommendations);
  const executiveAlerts = recordsToExecutiveAlerts(records);

  const briefing: ExecutiveBriefing = briefingRecord
    ? parseBriefingFromRecord(briefingRecord, founderFirstName)
    : {
        greeting: `Welcome ${founderFirstName}`,
        companyStatusSummary:
          "Executive agents are generating intelligence. Run the intelligence engine to populate your briefing.",
        todaysFocus: [...new Set(priorities.slice(0, 6).map((p) => p.title))].slice(0, 4),
        stats: [],
      };

  return {
    briefing,
    priorities,
    pendingDecisions,
    activeDiscussions: discussions.filter((d) => d.status === "in_progress").slice(0, 6),
    opportunities,
    upcomingMeetings,
    recommendations,
    executiveAlerts,
    companyHealth,
  };
}

export async function getFounderWorkspaceData(): Promise<FounderWorkspaceData> {
  const founderName = await getFounderDisplayName();
  const [dashboard, discussions, inbox, timeline, agents, records] = await Promise.all([
    getFounderDashboard(),
    getFounderDiscussions(),
    getFounderInbox(),
    getFounderActivityTimeline(),
    getAgents(),
    loadActiveIntelligence(),
  ]);

  let meetings: FounderMeeting[] = [];
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
      .from("meetings")
      .select("id, topic, meeting_type, scheduled_at, status, participant_names, agenda, summary")
      .order("scheduled_at", { ascending: false })
      .limit(20);
    meetings = (data ?? []).map((m) => ({
      id: m.id,
      topic: m.topic,
      meetingType: m.meeting_type,
      scheduledAt: m.scheduled_at,
      status: m.status,
      participantNames: m.participant_names ?? [],
      agenda: m.agenda ?? "",
      summary: m.summary,
    }));
  }

  return {
    founderName,
    dashboard,
    discussions,
    meetings,
    inbox,
    timeline,
    agentIntelligence: buildAgentIntelligencePanel(agents, records),
  };
}
