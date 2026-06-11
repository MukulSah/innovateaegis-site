import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAgents } from "./agents";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder, processMentions } from "./notifications";
import type { DiscussionEntityType, EntityDiscussion } from "./types";

type DiscussionRow = {
  id: string;
  entity_type: DiscussionEntityType;
  entity_id: string;
  author: string;
  content: string;
  created_at: string;
};

export type DiscussionInput = {
  entityType: DiscussionEntityType;
  entityId: string;
  author: string;
  content: string;
};

function mapRow(row: DiscussionRow): EntityDiscussion {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    author: row.author,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function getEntityDiscussions(
  entityType: DiscussionEntityType,
  entityId: string,
): Promise<EntityDiscussion[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("entity_discussions")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DiscussionRow[]).map(mapRow);
}

export async function getRecentDiscussions(limit = 20): Promise<EntityDiscussion[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("entity_discussions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as DiscussionRow[]).map(mapRow);
}

export async function createEntityDiscussion(input: DiscussionInput): Promise<EntityDiscussion> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("entity_discussions")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      author: input.author.trim(),
      content: input.content.trim(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const discussion = mapRow(data as DiscussionRow);

  await recordActivityFeed({
    actor: input.author,
    action: "comment_added",
    targetType: input.entityType,
    targetId: input.entityId,
    description: input.content.slice(0, 200),
  });

  await notifyFounder(
    `Comment on ${input.entityType}`,
    `${input.author}: ${input.content.slice(0, 120)}`,
    "COMMENT",
    { severity: "LOW", entityType: input.entityType, entityId: input.entityId },
  );

  const agents = await getAgents();
  await processMentions(
    input.content,
    input.author,
    input.entityType,
    input.entityId,
    agents.map((a) => ({ id: a.id, name: a.name })),
  );

  return discussion;
}

export function validateDiscussionInput(body: unknown): DiscussionInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const entityTypes: DiscussionEntityType[] = [
    "workflow", "task", "document", "decision", "deliverable", "release", "memory",
  ];

  const entityType = data.entityType as DiscussionEntityType;
  const entityId = typeof data.entityId === "string" ? data.entityId : "";
  const author = typeof data.author === "string" ? data.author.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";

  if (!entityTypes.includes(entityType) || !entityId || !author || !content) return null;

  return { entityType, entityId, author, content };
}
