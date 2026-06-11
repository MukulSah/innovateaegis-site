/** Locked Organizational Memory structure — client-safe */

export type OrgMemoryType = "event" | "decision" | "discussion" | "meeting" | "project" | "learning";

export type OrgMemoryImportance = "critical" | "high" | "medium" | "low";

export type OrgMemorySource =
  | "manual"
  | "meeting"
  | "project"
  | "task"
  | "discussion"
  | "agent"
  | "research"
  | "decision"
  | "customer"
  | "document"
  | "approval"
  | "workflow"
  | "activity"
  | "release";

/** @deprecated Use OrgMemoryType — category retained for DB compat */
export type OrgMemoryCategory = OrgMemoryType | "research" | "business" | "customer" | "conversation" | "knowledge" | "workflow" | "activity" | "agent";

export type OrgMemoryNavSection =
  | "executive_timeline"
  | "events"
  | "decisions"
  | "discussions"
  | "meetings"
  | "projects"
  | "learnings"
  | "relationships"
  | "agent_participation"
  | "explorer";

export type OrgMemoryViewMode = "timeline" | "table" | "story" | "graph";

export type OrgMemoryRelationship = {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  relationshipType: string;
  label: string | null;
  createdAt: string;
};

export type OrganizationalMemoryRecord = {
  id: string;
  title: string;
  summary: string;
  description: string;
  content: string;
  memoryType: OrgMemoryType;
  source: OrgMemorySource;
  createdBy: string;
  participantAgentIds: string[];
  participantNames: string[];
  relatedAgentId: string | null;
  relatedAgentName?: string | null;
  relatedProjectId: string | null;
  relatedProjectName?: string | null;
  relatedMeetingId: string | null;
  relatedDiscussionId: string | null;
  relatedDecisionId: string | null;
  relatedTaskId: string | null;
  outcome: string;
  importance: OrgMemoryImportance;
  visibility: string;
  tags: string[];
  metadata: Record<string, unknown>;
  relationships: OrgMemoryRelationship[];
  storyKey: string | null;
  occurredAt: string;
  version: number;
  status: "active" | "archived";
  legacySource: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrgMemoryFilters = {
  navSection?: OrgMemoryNavSection;
  memoryType?: OrgMemoryType;
  source?: OrgMemorySource;
  importance?: OrgMemoryImportance;
  agentId?: string;
  projectId?: string;
  meetingId?: string;
  storyKey?: string;
  search?: string;
  tag?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  includeLegacy?: boolean;
};

export type ExecutiveTimelineEntry = {
  id: string;
  date: string;
  memoryType: OrgMemoryType;
  title: string;
  participants: string[];
  outcome: string;
  importance: OrgMemoryImportance;
  summary: string;
};

export type MemoryStoryStep = {
  id: string;
  order: number;
  memoryType: OrgMemoryType;
  title: string;
  summary: string;
  outcome: string;
  occurredAt: string;
  participants: string[];
};

export const ORG_MEMORY_NAV: {
  id: OrgMemoryNavSection;
  label: string;
  description: string;
  memoryTypes?: OrgMemoryType[];
}[] = [
  {
    id: "executive_timeline",
    label: "Executive Timeline",
    description: "What happened while you were away",
  },
  { id: "events", label: "Events", description: "Significant company activities", memoryTypes: ["event"] },
  { id: "decisions", label: "Decisions", description: "Historical decision traceability", memoryTypes: ["decision"] },
  { id: "discussions", label: "Discussions", description: "Strategic conversations", memoryTypes: ["discussion"] },
  { id: "meetings", label: "Meetings", description: "Structured meeting history", memoryTypes: ["meeting"] },
  { id: "projects", label: "Projects", description: "Project evolution history", memoryTypes: ["project"] },
  { id: "learnings", label: "Learnings", description: "Institutional lessons", memoryTypes: ["learning"] },
  { id: "relationships", label: "Relationships", description: "How memories connect" },
  { id: "agent_participation", label: "Agent Participation", description: "Memories by participant" },
  { id: "explorer", label: "Memory Explorer", description: "Advanced search and retrieval" },
];

export const IMPORTANCE_LABELS: Record<OrgMemoryImportance, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const MEMORY_TYPE_LABELS: Record<OrgMemoryType, string> = {
  event: "Event",
  decision: "Decision",
  discussion: "Discussion",
  meeting: "Meeting",
  project: "Project",
  learning: "Learning",
};

export function getMemoryTypeLabel(type: OrgMemoryType): string {
  return MEMORY_TYPE_LABELS[type] ?? type;
}

export function getImportanceColor(importance: OrgMemoryImportance): string {
  switch (importance) {
    case "critical":
      return "text-red-300 bg-red-500/15";
    case "high":
      return "text-amber-300 bg-amber-500/15";
    case "medium":
      return "text-cyan-300 bg-cyan-500/15";
    default:
      return "text-white/50 bg-white/5";
  }
}
