import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { OrgMemoryImportance, OrgMemorySource, OrgMemoryType } from "./organizational-memory.types";

export type MemoryGenerationInput = {
  memoryType: OrgMemoryType;
  source: OrgMemorySource;
  title: string;
  summary: string;
  description?: string;
  content?: string;
  outcome?: string;
  importance?: OrgMemoryImportance;
  createdBy?: string;
  participantAgentIds?: string[];
  participantNames?: string[];
  relatedAgentId?: string | null;
  relatedProjectId?: string | null;
  relatedMeetingId?: string | null;
  relatedDiscussionId?: string | null;
  relatedDecisionId?: string | null;
  relatedTaskId?: string | null;
  relatedApprovalId?: string | null;
  relatedReleaseId?: string | null;
  sourceEntityType?: string;
  sourceEntityId?: string;
  storyKey?: string | null;
  occurredAt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  visibility?: string;
};

function categoryFromMemoryType(type: OrgMemoryType): string {
  const map: Record<OrgMemoryType, string> = {
    event: "activity",
    decision: "decision",
    discussion: "conversation",
    meeting: "meeting",
    project: "project",
    learning: "knowledge",
  };
  return map[type];
}

export async function upsertOrganizationalMemory(
  input: MemoryGenerationInput,
): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  const row = {
    title: input.title.trim(),
    description: input.summary.trim(),
    content: input.content?.trim() ?? input.summary.trim(),
    category: categoryFromMemoryType(input.memoryType),
    memory_type: input.memoryType,
    source: input.source,
    created_by: input.createdBy ?? "System",
    related_agent_id: input.relatedAgentId ?? input.participantAgentIds?.[0] ?? null,
    related_project_id: input.relatedProjectId ?? null,
    related_meeting_id: input.relatedMeetingId ?? null,
    related_discussion_id: input.relatedDiscussionId ?? null,
    related_decision_id: input.relatedDecisionId ?? null,
    related_task_id: input.relatedTaskId ?? null,
    related_approval_id: input.relatedApprovalId ?? null,
    related_release_id: input.relatedReleaseId ?? null,
    participant_agent_ids: input.participantAgentIds ?? [],
    participant_names: input.participantNames ?? [],
    outcome: input.outcome ?? "",
    importance: input.importance ?? "medium",
    story_key: input.storyKey ?? input.relatedProjectId ?? null,
    source_entity_type: input.sourceEntityType ?? null,
    source_entity_id: input.sourceEntityId ?? null,
    occurred_at: occurredAt,
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    visibility: input.visibility ?? "organization",
    audit_trail: [
      {
        action: "generated",
        source: input.source,
        at: occurredAt,
      },
    ],
  };

  if (input.sourceEntityType && input.sourceEntityId) {
    const { data: existing } = await supabase
      .from("organizational_memory")
      .select("id")
      .eq("source_entity_type", input.sourceEntityType)
      .eq("source_entity_id", input.sourceEntityId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("organizational_memory")
        .update({ ...row, version: undefined })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data?.id ?? existing.id;
    }
  }

  const { data, error } = await supabase
    .from("organizational_memory")
    .insert(row)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function generateMemoryFromMeeting(meetingId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: meeting } = await supabase.from("meetings").select("*").eq("id", meetingId).single();
  if (!meeting) return;

  const decisions = Array.isArray(meeting.decisions) ? meeting.decisions : [];
  const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : [];

  await upsertOrganizationalMemory({
    memoryType: "meeting",
    source: "meeting",
    title: meeting.topic,
    summary: meeting.summary ?? meeting.agenda ?? "",
    content: [meeting.discussion, meeting.notes, meeting.transcript].filter(Boolean).join("\n\n"),
    outcome: decisions.length ? `Decisions: ${decisions.length}` : meeting.summary ?? "Completed",
    importance: meeting.meeting_type === "founder_strategy" || meeting.meeting_type === "board" ? "critical" : "high",
    createdBy: "Meeting Center",
    participantAgentIds: meeting.participant_agent_ids ?? [],
    participantNames: meeting.participant_names ?? [],
    relatedProjectId: meeting.related_project_id,
    relatedDiscussionId: meeting.related_discussion_id,
    relatedMeetingId: meetingId,
    sourceEntityType: "meeting",
    sourceEntityId: meetingId,
    storyKey: meeting.related_project_id,
    occurredAt: meeting.ended_at ?? meeting.updated_at,
    tags: ["meeting", meeting.meeting_type],
    metadata: {
      meetingId,
      agenda: meeting.agenda,
      actionItems,
      decisions,
      recordingUrl: meeting.recording_url,
      transcript: meeting.transcript,
    },
  });
}

export async function generateMemoryFromDecision(decisionId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: decision } = await supabase.from("decisions").select("*").eq("id", decisionId).single();
  if (!decision) return;

  await upsertOrganizationalMemory({
    memoryType: "decision",
    source: "decision",
    title: decision.title,
    summary: decision.decision,
    content: [decision.decision, decision.rationale, decision.alternatives_considered]
      .filter(Boolean)
      .join("\n\n"),
    outcome: decision.decision,
    importance: "high",
    createdBy: decision.created_by ?? "System",
    relatedProjectId: decision.project_id,
    relatedDecisionId: decisionId,
    sourceEntityType: "decision",
    sourceEntityId: decisionId,
    storyKey: decision.project_id,
    occurredAt: decision.created_at,
    tags: ["decision"],
    metadata: {
      decisionId,
      reason: decision.rationale,
      alternativesConsidered: decision.alternatives_considered,
      approver: decision.created_by,
      status: "approved",
    },
  });
}

export async function generateMemoryFromDiscussion(discussionId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: discussion } = await supabase
    .from("founder_discussions")
    .select("*")
    .eq("id", discussionId)
    .single();
  if (!discussion || discussion.status !== "completed") return;

  const { data: messages } = await supabase
    .from("founder_discussion_messages")
    .select("content, message_type, author_name")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true })
    .limit(50);

  const recommendations = (messages ?? [])
    .filter((m) => m.message_type === "recommendation")
    .map((m) => m.content);
  const risks = (messages ?? []).filter((m) => m.message_type === "risk").map((m) => m.content);

  await upsertOrganizationalMemory({
    memoryType: "discussion",
    source: "discussion",
    title: discussion.topic,
    summary: discussion.summary ?? "",
    content: discussion.summary ?? "",
    outcome: discussion.status,
    importance: "high",
    createdBy: "Founder Discussion",
    participantAgentIds: discussion.participant_agent_ids ?? [],
    participantNames: discussion.participant_names ?? [],
    relatedDiscussionId: discussionId,
    relatedProjectId: discussion.related_project_ids?.[0] ?? null,
    sourceEntityType: "founder_discussion",
    sourceEntityId: discussionId,
    storyKey: discussion.related_project_ids?.[0] ?? null,
    occurredAt: discussion.updated_at,
    tags: ["discussion", "founder"],
    metadata: {
      discussionId,
      recommendations,
      risks,
      messageCount: discussion.message_count,
    },
  });
}

export async function generateMemoryFromProjectEvent(input: {
  projectId: string;
  title: string;
  summary: string;
  milestone?: string;
  statusChange?: string;
  sourceEntityId: string;
  participantNames?: string[];
  importance?: OrgMemoryImportance;
}): Promise<void> {
  await upsertOrganizationalMemory({
    memoryType: "project",
    source: "project",
    title: input.title,
    summary: input.summary,
    importance: input.importance ?? "medium",
    relatedProjectId: input.projectId,
    participantNames: input.participantNames ?? [],
    sourceEntityType: "project_event",
    sourceEntityId: input.sourceEntityId,
    storyKey: input.projectId,
    tags: ["project", input.milestone].filter(Boolean) as string[],
    metadata: {
      milestone: input.milestone,
      statusChange: input.statusChange,
    },
  });
}

export async function generateMemoryFromTask(taskId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: task } = await supabase
    .from("tasks")
    .select("*, projects(name)")
    .eq("id", taskId)
    .single();
  if (!task || task.status !== "done") return;

  await upsertOrganizationalMemory({
    memoryType: "event",
    source: "task",
    title: `Task completed: ${task.title}`,
    summary: task.description ?? task.title,
    outcome: "Completed",
    importance: task.priority === "critical" ? "high" : "medium",
    createdBy: task.assigned_to ?? "System",
    relatedProjectId: task.project_id,
    relatedTaskId: taskId,
    sourceEntityType: "task",
    sourceEntityId: taskId,
    storyKey: task.project_id,
    occurredAt: task.updated_at,
    tags: ["task", task.status],
    metadata: { taskId, projectName: (task.projects as { name: string } | null)?.name },
  });
}

export async function generateMemoryFromApproval(approvalId: string, table: "project_approvals" | "workflow_approvals" = "project_approvals"): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: approval } = await supabase.from(table).select("*").eq("id", approvalId).single();
  if (!approval || approval.status !== "approved") return;

  await upsertOrganizationalMemory({
    memoryType: "decision",
    source: "approval",
    title: `Approval: ${approval.title ?? approval.approval_type ?? "Decision"}`,
    summary: approval.notes ?? approval.comments ?? "Approved",
    outcome: "Approved",
    importance: "high",
    relatedProjectId: approval.project_id,
    relatedApprovalId: approvalId,
    sourceEntityType: table,
    sourceEntityId: approvalId,
    storyKey: approval.project_id,
    occurredAt: approval.updated_at ?? approval.created_at,
    tags: ["approval", approval.approval_type].filter(Boolean),
    metadata: { approvalId, approvalType: approval.approval_type, approver: approval.approved_by },
  });
}

export async function generateMemoryFromLearning(input: {
  title: string;
  source: string;
  problem: string;
  outcome: string;
  lessonLearned: string;
  recommendation?: string;
  ownerAgentName?: string;
  relatedProjectId?: string;
  importance?: OrgMemoryImportance;
  sourceEntityId?: string;
}): Promise<void> {
  await upsertOrganizationalMemory({
    memoryType: "learning",
    source: "activity",
    title: input.title,
    summary: input.lessonLearned,
    content: [input.problem, input.outcome, input.lessonLearned, input.recommendation]
      .filter(Boolean)
      .join("\n\n"),
    outcome: input.outcome,
    importance: input.importance ?? "medium",
    createdBy: input.ownerAgentName ?? "System",
    participantNames: input.ownerAgentName ? [input.ownerAgentName] : [],
    relatedProjectId: input.relatedProjectId ?? null,
    sourceEntityType: input.sourceEntityId ? "learning" : undefined,
    sourceEntityId: input.sourceEntityId,
    storyKey: input.relatedProjectId ?? null,
    tags: ["learning"],
    metadata: {
      source: input.source,
      problem: input.problem,
      recommendation: input.recommendation,
    },
  });
}

// Fix typo - ownerAgentName is not in MemoryGenerationInput, use participantNames