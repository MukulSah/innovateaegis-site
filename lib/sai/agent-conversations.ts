import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import type { AgentConversation, AgentMessageType } from "./types";

type ConversationRow = {
  id: string;
  workflow_id: string;
  sender_agent_id: string | null;
  receiver_agent_id: string | null;
  message: string;
  message_type: AgentMessageType;
  created_at: string;
  sender?: { name: string } | null;
  receiver?: { name: string } | null;
};

const select = `*, sender:agents!agent_conversations_sender_agent_id_fkey(name), receiver:agents!agent_conversations_receiver_agent_id_fkey(name)`;

function mapRow(row: ConversationRow): AgentConversation {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    senderAgentId: row.sender_agent_id,
    senderAgentName: row.sender?.name ?? null,
    receiverAgentId: row.receiver_agent_id,
    receiverAgentName: row.receiver?.name ?? null,
    message: row.message,
    messageType: row.message_type,
    createdAt: row.created_at,
  };
}

export async function sendAgentMessage(input: {
  workflowId: string;
  senderAgentId: string | null;
  receiverAgentId: string | null;
  message: string;
  messageType?: AgentMessageType;
}): Promise<AgentConversation> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_conversations")
    .insert({
      workflow_id: input.workflowId,
      sender_agent_id: input.senderAgentId,
      receiver_agent_id: input.receiverAgentId,
      message: input.message.trim(),
      message_type: input.messageType ?? "update",
    })
    .select(select)
    .single();

  if (error) throw new Error(error.message);
  const conversation = mapRow(data as ConversationRow);

  await recordActivityFeed({
    actor: conversation.senderAgentName ?? "SAI",
    action: "agent_message",
    targetType: "workflow",
    targetId: input.workflowId,
    description: input.message.slice(0, 200),
  });

  return conversation;
}

export async function getWorkflowConversations(workflowId: string): Promise<AgentConversation[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_conversations")
    .select(select)
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ConversationRow[]).map(mapRow);
}

export async function getRecentConversations(limit = 20): Promise<AgentConversation[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("agent_conversations")
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as ConversationRow[]).map(mapRow);
}

export async function countConversations(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("agent_conversations")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}
