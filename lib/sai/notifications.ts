import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type {
  Notification,
  NotificationCategory,
  NotificationRecipientType,
  NotificationSeverity,
} from "./types";

type NotificationRow = {
  id: string;
  recipient_type: NotificationRecipientType;
  recipient_id: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationInput = {
  recipientType: NotificationRecipientType;
  recipientId?: string | null;
  title: string;
  message?: string;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  entityType?: string | null;
  entityId?: string | null;
};

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientType: row.recipient_type,
    recipientId: row.recipient_id,
    title: row.title,
    message: row.message,
    category: row.category,
    severity: row.severity,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function createNotification(input: NotificationInput): Promise<Notification> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_type: input.recipientType,
      recipient_id: input.recipientId ?? null,
      title: input.title.trim(),
      message: input.message?.trim() ?? "",
      category: input.category,
      severity: input.severity ?? "MEDIUM",
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as NotificationRow);
}

export async function notifyFounder(
  title: string,
  message: string,
  category: NotificationCategory,
  options?: {
    severity?: NotificationSeverity;
    entityType?: string;
    entityId?: string;
  },
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await createNotification({
    recipientType: "founder",
    title,
    message,
    category,
    severity: options?.severity ?? "MEDIUM",
    entityType: options?.entityType ?? null,
    entityId: options?.entityId ?? null,
  });
}

export async function notifyAgent(
  agentId: string,
  title: string,
  message: string,
  category: NotificationCategory,
  options?: {
    severity?: NotificationSeverity;
    entityType?: string;
    entityId?: string;
  },
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await createNotification({
    recipientType: "agent",
    recipientId: agentId,
    title,
    message,
    category,
    severity: options?.severity ?? "MEDIUM",
    entityType: options?.entityType ?? null,
    entityId: options?.entityId ?? null,
  });
}

export async function notifyTeam(
  title: string,
  message: string,
  category: NotificationCategory,
  options?: {
    severity?: NotificationSeverity;
    entityType?: string;
    entityId?: string;
  },
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await createNotification({
    recipientType: "team",
    title,
    message,
    category,
    severity: options?.severity ?? "LOW",
    entityType: options?.entityType ?? null,
    entityId: options?.entityId ?? null,
  });
}

export async function getNotifications(filters?: {
  recipientType?: NotificationRecipientType;
  recipientId?: string;
  category?: NotificationCategory;
  isRead?: boolean;
  limit?: number;
}): Promise<Notification[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.recipientType) query = query.eq("recipient_type", filters.recipientType);
  if (filters?.recipientId) query = query.eq("recipient_id", filters.recipientId);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.isRead !== undefined) query = query.eq("is_read", filters.isRead);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as NotificationRow[]).map(mapRow);
}

export async function getInboxNotificationsWithLinks() {
  const { enrichInboxData } = await import("./notification-links");
  const inbox = await getInboxNotifications();
  return enrichInboxData(inbox);
}

export async function getInboxNotifications(): Promise<{
  all: Notification[];
  unread: Notification[];
  approvals: Notification[];
  assignments: Notification[];
  mentions: Notification[];
  escalations: Notification[];
  workflowEvents: Notification[];
  completedWork: Notification[];
  recentActivity: Notification[];
}> {
  const all = await getNotifications({ limit: 100 });
  return {
    all,
    unread: all.filter((n) => !n.isRead),
    approvals: all.filter((n) => n.category === "APPROVAL"),
    assignments: all.filter((n) => n.category === "ASSIGNMENT"),
    mentions: all.filter((n) => n.category === "COMMENT" && n.title.toLowerCase().includes("mention")),
    escalations: all.filter((n) => n.category === "ESCALATION"),
    workflowEvents: all.filter((n) => n.category === "WORKFLOW"),
    completedWork: all.filter(
      (n) =>
        n.title.toLowerCase().includes("completed") ||
        n.title.toLowerCase().includes("published") ||
        n.title.toLowerCase().includes("approved"),
    ),
    recentActivity: all.slice(0, 20),
  };
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as NotificationRow);
}

export async function markAllNotificationsRead(
  recipientType: NotificationRecipientType = "founder",
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_type", recipientType)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
}

export async function countUnreadNotifications(
  recipientType: NotificationRecipientType = "founder",
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_type", recipientType)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function processMentions(
  content: string,
  author: string,
  entityType: string,
  entityId: string,
  agentNames: { id: string; name: string }[],
): Promise<void> {
  const mentionPattern = /@(\w+(?:\s+\w+)?)/g;
  const matches = [...content.matchAll(mentionPattern)];

  for (const match of matches) {
    const mention = match[1].toLowerCase();

    if (mention === "founder" || mention === "mukul") {
      await notifyFounder(
        `Mention from ${author}`,
        content.slice(0, 200),
        "COMMENT",
        { severity: "MEDIUM", entityType, entityId },
      );
      continue;
    }

    if (mention === "team") {
      await notifyTeam(
        `Team mention from ${author}`,
        content.slice(0, 200),
        "COMMENT",
        { entityType, entityId },
      );
      continue;
    }

    const agent = agentNames.find(
      (a) => a.name.toLowerCase().includes(mention) || a.name.toLowerCase().replace(/\s/g, "") === mention,
    );
    if (agent) {
      await notifyAgent(
        agent.id,
        `Mention from ${author}`,
        content.slice(0, 200),
        "COMMENT",
        { entityType, entityId },
      );
    }
  }
}

