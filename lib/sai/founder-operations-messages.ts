import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export type FounderOperationsMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingActionId: string | null;
  createdAt: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  pending_action_id: string | null;
  created_at: string;
};

function mapRow(row: MessageRow): FounderOperationsMessage {
  return {
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    pendingActionId: row.pending_action_id,
    createdAt: row.created_at,
  };
}

export async function getFounderOperationsMessages(
  userId: string,
  limit = 50,
): Promise<FounderOperationsMessage[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("founder_operations_messages")
    .select("id, role, content, pending_action_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as MessageRow[]).map(mapRow);
}

export async function saveFounderOperationsMessage(input: {
  userId: string;
  role: "user" | "assistant";
  content: string;
  pendingActionId?: string | null;
}): Promise<FounderOperationsMessage | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("founder_operations_messages")
    .insert({
      user_id: input.userId,
      role: input.role,
      content: input.content,
      pending_action_id: input.pendingActionId ?? null,
    })
    .select("id, role, content, pending_action_id, created_at")
    .single();

  if (error) {
    if (error.message.includes("does not exist")) return null;
    throw new Error(error.message);
  }

  return mapRow(data as MessageRow);
}
