import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { nullableUuid } from "./nullable-uuid";

export type SessionChatMessageKind = "artifact" | "chat" | "system";

export type SessionChatMessage = {
  id: string;
  workflowRunId: string | null;
  objectiveId: string | null;
  projectId: string | null;
  speakerType: "founder" | "agent" | "system";
  speakerName: string;
  speakerRole: string | null;
  message: string;
  artifactName: string | null;
  stepKey: string | null;
  agentId: string | null;
  artifactId: string | null;
  messageKind: SessionChatMessageKind;
  createdAt: string;
};

type ChatRow = {
  id: string;
  workflow_run_id: string | null;
  objective_id: string | null;
  project_id: string | null;
  speaker_type: string;
  speaker_name: string;
  speaker_role: string | null;
  message: string;
  artifact_name: string | null;
  step_key: string | null;
  agent_id: string | null;
  artifact_id: string | null;
  message_kind: string;
  created_at: string;
};

function mapRow(row: ChatRow): SessionChatMessage {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    objectiveId: row.objective_id,
    projectId: row.project_id,
    speakerType: row.speaker_type as SessionChatMessage["speakerType"],
    speakerName: row.speaker_name,
    speakerRole: row.speaker_role,
    message: row.message,
    artifactName: row.artifact_name,
    stepKey: row.step_key,
    agentId: row.agent_id,
    artifactId: row.artifact_id,
    messageKind: (row.message_kind ?? "chat") as SessionChatMessageKind,
    createdAt: row.created_at,
  };
}

export async function appendSessionChat(input: {
  workflowRunId?: string | null;
  objectiveId?: string | null;
  projectId?: string | null;
  speakerType: SessionChatMessage["speakerType"];
  speakerName: string;
  speakerRole?: string | null;
  message: string;
  artifactName?: string | null;
  stepKey?: string | null;
  agentId?: string | null;
  artifactId?: string | null;
  messageKind?: SessionChatMessageKind;
}): Promise<SessionChatMessage | null> {
  if (!input.workflowRunId && !input.objectiveId) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_chat_messages")
    .insert({
      workflow_run_id: nullableUuid(input.workflowRunId),
      objective_id: nullableUuid(input.objectiveId),
      project_id: nullableUuid(input.projectId),
      speaker_type: input.speakerType,
      speaker_name: input.speakerName,
      speaker_role: input.speakerRole ?? null,
      message: input.message,
      artifact_name: input.artifactName ?? null,
      step_key: input.stepKey ?? null,
      agent_id: nullableUuid(input.agentId),
      artifact_id: nullableUuid(input.artifactId),
      message_kind: input.messageKind ?? "chat",
    })
    .select("*")
    .single();

  if (error) {
    console.warn("[session-chat] append failed:", error.message);
    return null;
  }

  return mapRow(data as ChatRow);
}

export async function getSessionChat(filters: {
  workflowRunId?: string;
  objectiveId?: string;
  projectId?: string;
  artifactId?: string;
  messageKind?: SessionChatMessageKind;
  limit?: number;
}): Promise<SessionChatMessage[]> {
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("session_chat_messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (filters.workflowRunId) query = query.eq("workflow_run_id", filters.workflowRunId);
  if (filters.objectiveId) query = query.eq("objective_id", filters.objectiveId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.artifactId) query = query.eq("artifact_id", filters.artifactId);
  if (filters.messageKind) query = query.eq("message_kind", filters.messageKind);

  const { data, error } = await query.limit(filters.limit ?? 200);
  if (error) {
    console.warn("[session-chat] load failed:", error.message);
    return [];
  }

  return (data as ChatRow[]).map(mapRow);
}
