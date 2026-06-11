import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { generateMemoryFromMeeting } from "./org-memory-generator";
import type {
  ExecutiveTimelineEntry,
  MemoryStoryStep,
  OrgMemoryFilters,
  OrgMemoryImportance,
  OrgMemoryNavSection,
  OrgMemoryRelationship,
  OrgMemorySource,
  OrgMemoryType,
  OrganizationalMemoryRecord,
} from "./organizational-memory.types";
import { ORG_MEMORY_NAV } from "./organizational-memory.types";

export type {
  ExecutiveTimelineEntry,
  MemoryStoryStep,
  OrgMemoryFilters,
  OrgMemoryImportance,
  OrgMemoryNavSection,
  OrgMemoryRelationship,
  OrgMemorySource,
  OrgMemoryType,
  OrganizationalMemoryRecord,
} from "./organizational-memory.types";
export {
  getImportanceColor,
  getMemoryTypeLabel,
  IMPORTANCE_LABELS,
  MEMORY_TYPE_LABELS,
  ORG_MEMORY_NAV,
} from "./organizational-memory.types";

type Row = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  memory_type: OrgMemoryType | null;
  source: OrgMemorySource;
  created_by: string;
  related_agent_id: string | null;
  related_project_id: string | null;
  related_meeting_id: string | null;
  related_discussion_id: string | null;
  related_decision_id: string | null;
  related_task_id: string | null;
  participant_agent_ids: string[];
  participant_names: string[];
  outcome: string;
  importance: OrgMemoryImportance;
  visibility: string;
  tags: string[];
  metadata: Record<string, unknown>;
  story_key: string | null;
  occurred_at: string | null;
  version: number;
  status: "active" | "archived";
  legacy_source: string | null;
  created_at: string;
  updated_at: string;
  agents?: { name: string } | null;
  projects?: { name: string } | null;
};

const select = `*, agents(name), projects(name)`;

function resolveMemoryType(row: Row): OrgMemoryType {
  if (row.memory_type) return row.memory_type;
  const cat = row.category;
  if (cat === "meeting") return "meeting";
  if (cat === "decision") return "decision";
  if (cat === "project") return "project";
  if (cat === "conversation") return "discussion";
  if (cat === "knowledge") return "learning";
  return "event";
}

function mapRow(row: Row, relationships: OrgMemoryRelationship[] = []): OrganizationalMemoryRecord {
  return {
    id: row.id,
    title: row.title,
    summary: row.description,
    description: row.description,
    content: row.content,
    memoryType: resolveMemoryType(row),
    source: row.source,
    createdBy: row.created_by,
    participantAgentIds: row.participant_agent_ids ?? [],
    participantNames: row.participant_names ?? [],
    relatedAgentId: row.related_agent_id,
    relatedAgentName: row.agents?.name ?? null,
    relatedProjectId: row.related_project_id,
    relatedProjectName: row.projects?.name ?? null,
    relatedMeetingId: row.related_meeting_id,
    relatedDiscussionId: row.related_discussion_id,
    relatedDecisionId: row.related_decision_id,
    relatedTaskId: row.related_task_id,
    outcome: row.outcome ?? "",
    importance: row.importance ?? "medium",
    visibility: row.visibility,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    relationships,
    storyKey: row.story_key,
    occurredAt: row.occurred_at ?? row.created_at,
    version: row.version,
    status: row.status,
    legacySource: row.legacy_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function navSectionToMemoryTypes(section: OrgMemoryNavSection): OrgMemoryType[] | null {
  const def = ORG_MEMORY_NAV.find((n) => n.id === section);
  return def?.memoryTypes ?? null;
}

export async function getOrganizationalMemory(
  filters: OrgMemoryFilters = {},
): Promise<OrganizationalMemoryRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("organizational_memory")
    .select(select)
    .order("occurred_at", { ascending: false, nullsFirst: false });

  if (filters.navSection && filters.navSection !== "explorer" && filters.navSection !== "relationships") {
    if (filters.navSection === "executive_timeline") {
      query = query.in("importance", ["critical", "high"]);
    } else if (filters.navSection === "agent_participation" && filters.agentId) {
      query = query.contains("participant_agent_ids", [filters.agentId]);
    } else {
      const types = navSectionToMemoryTypes(filters.navSection);
      if (types?.length) query = query.in("memory_type", types);
    }
  }

  if (filters.memoryType) query = query.eq("memory_type", filters.memoryType);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.importance) query = query.eq("importance", filters.importance);
  if (filters.agentId && filters.navSection !== "agent_participation") {
    query = query.or(
      `related_agent_id.eq.${filters.agentId},participant_agent_ids.cs.{${filters.agentId}}`,
    );
  }
  if (filters.projectId) query = query.eq("related_project_id", filters.projectId);
  if (filters.meetingId) query = query.eq("related_meeting_id", filters.meetingId);
  if (filters.storyKey) query = query.eq("story_key", filters.storyKey);
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.eq("status", "active");
  if (filters.dateFrom) query = query.gte("occurred_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("occurred_at", filters.dateTo);

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},content.ilike.${term},outcome.ilike.${term}`);
  }

  if (filters.tag?.trim()) query = query.contains("tags", [filters.tag.trim().toLowerCase()]);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data as Row[]) ?? [];
  const relMap = await loadRelationships(rows.map((r) => r.id));
  return rows.map((row) => mapRow(row, relMap.get(row.id) ?? []));
}

async function loadRelationships(memoryIds: string[]): Promise<Map<string, OrgMemoryRelationship[]>> {
  const map = new Map<string, OrgMemoryRelationship[]>();
  if (!memoryIds.length || !isSupabaseConfigured()) return map;

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("org_memory_relationships")
    .select("*")
    .in("source_memory_id", memoryIds);

  for (const row of data ?? []) {
    const rel: OrgMemoryRelationship = {
      id: row.id,
      sourceMemoryId: row.source_memory_id,
      targetMemoryId: row.target_memory_id,
      targetEntityType: row.target_entity_type,
      targetEntityId: row.target_entity_id,
      relationshipType: row.relationship_type,
      label: row.label,
      createdAt: row.created_at,
    };
    const list = map.get(row.source_memory_id) ?? [];
    list.push(rel);
    map.set(row.source_memory_id, list);
  }
  return map;
}

export async function getExecutiveTimeline(limit = 50): Promise<ExecutiveTimelineEntry[]> {
  const memories = await getOrganizationalMemory({
    navSection: "executive_timeline",
    limit,
  });
  return memories.map((m) => ({
    id: m.id,
    date: m.occurredAt,
    memoryType: m.memoryType,
    title: m.title,
    participants: m.participantNames.length ? m.participantNames : m.relatedAgentName ? [m.relatedAgentName] : [],
    outcome: m.outcome || m.summary,
    importance: m.importance,
    summary: m.summary,
  }));
}

export async function getMemoryStory(storyKey: string): Promise<MemoryStoryStep[]> {
  const memories = await getOrganizationalMemory({ storyKey, limit: 100 });
  return memories
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    .map((m, index) => ({
      id: m.id,
      order: index + 1,
      memoryType: m.memoryType,
      title: m.title,
      summary: m.summary,
      outcome: m.outcome,
      occurredAt: m.occurredAt,
      participants: m.participantNames,
    }));
}

export async function getOrgMemoryStats(): Promise<Record<OrgMemoryNavSection, number>> {
  const counts = Object.fromEntries(ORG_MEMORY_NAV.map((n) => [n.id, 0])) as Record<
    OrgMemoryNavSection,
    number
  >;

  if (!isSupabaseConfigured()) return counts;

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("organizational_memory")
    .select("memory_type, importance, participant_agent_ids")
    .eq("status", "active");

  for (const row of data ?? []) {
    counts.explorer++;
    const type = row.memory_type as OrgMemoryType;
    if (type === "event") counts.events++;
    if (type === "decision") counts.decisions++;
    if (type === "discussion") counts.discussions++;
    if (type === "meeting") counts.meetings++;
    if (type === "project") counts.projects++;
    if (type === "learning") counts.learnings++;
    if (["critical", "high"].includes(row.importance)) counts.executive_timeline++;
    if ((row.participant_agent_ids ?? []).length) counts.agent_participation++;
  }

  const { count: relCount } = await supabase
    .from("org_memory_relationships")
    .select("*", { count: "exact", head: true });
  counts.relationships = relCount ?? 0;

  return counts;
}

/** @deprecated Manual creation discouraged — use auto-generation */
export async function createOrganizationalMemory(input: {
  title: string;
  description?: string;
  content?: string;
  memoryType?: OrgMemoryType;
  source?: OrgMemorySource;
  createdBy?: string;
  importance?: OrgMemoryImportance;
  outcome?: string;
  participantNames?: string[];
  relatedAgentId?: string | null;
  relatedProjectId?: string | null;
  tags?: string[];
  visibility?: string;
}): Promise<OrganizationalMemoryRecord> {
  const supabase = createSupabaseAdmin();
  const memoryType = input.memoryType ?? "event";
  const { data, error } = await supabase
    .from("organizational_memory")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      content: input.content?.trim() ?? "",
      category: memoryType === "learning" ? "knowledge" : memoryType === "discussion" ? "conversation" : memoryType === "event" ? "activity" : memoryType,
      memory_type: memoryType,
      source: input.source ?? "manual",
      created_by: input.createdBy ?? "Founder",
      related_agent_id: input.relatedAgentId ?? null,
      related_project_id: input.relatedProjectId ?? null,
      participant_names: input.participantNames ?? [],
      outcome: input.outcome ?? "",
      importance: input.importance ?? "medium",
      occurred_at: new Date().toISOString(),
      tags: input.tags ?? [],
      visibility: input.visibility ?? "organization",
      audit_trail: [{ action: "manual_create", at: new Date().toISOString() }],
    })
    .select(select)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

export async function createMemoryFromMeeting(meetingId: string): Promise<void> {
  await generateMemoryFromMeeting(meetingId);
}
