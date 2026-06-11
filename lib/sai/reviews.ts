import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import type { DeliverableStatus, Review, ReviewStatus } from "./types";

type ReviewRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  reviewer: string;
  status: ReviewStatus;
  comments: string;
  created_at: string;
};

export type ReviewInput = {
  entityType: string;
  entityId: string;
  reviewer: string;
  comments?: string;
};

function mapRow(row: ReviewRow): Review {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reviewer: row.reviewer,
    status: row.status,
    comments: row.comments,
    createdAt: row.created_at,
  };
}

export async function getReviews(filters?: {
  status?: ReviewStatus;
  entityType?: string;
  entityId?: string;
  reviewer?: string;
}): Promise<Review[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters?.entityId) query = query.eq("entity_id", filters.entityId);
  if (filters?.reviewer) query = query.eq("reviewer", filters.reviewer);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as ReviewRow[]).map(mapRow);
}

export async function createReview(input: ReviewInput): Promise<Review> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      reviewer: input.reviewer,
      status: "PENDING",
      comments: input.comments ?? "",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const review = mapRow(data as ReviewRow);

  await recordActivityFeed({
    actor: input.reviewer,
    action: "review_requested",
    targetType: input.entityType,
    targetId: input.entityId,
    description: input.comments ?? "",
  });

  return review;
}

export async function processReviewDecision(
  id: string,
  status: ReviewStatus,
  comments: string,
  actor: string,
): Promise<Review> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("reviews")
    .update({ status, comments })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const review = mapRow(data as ReviewRow);

  await recordActivityFeed({
    actor,
    action: `review_${status.toLowerCase()}`,
    targetType: review.entityType,
    targetId: review.entityId,
    description: comments,
  });

  if (review.entityType === "deliverable") {
    const statusMap: Record<string, DeliverableStatus> = {
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
      CHANGES_REQUESTED: "DRAFT",
    };
    const deliverableStatus = statusMap[status];
    if (deliverableStatus) {
      const supabase = createSupabaseAdmin();
      await supabase
        .from("deliverables")
        .update({ status: deliverableStatus })
        .eq("id", review.entityId);
    }
  }

  if (status === "APPROVED") {
    await notifyFounder(
      `Review approved`,
      comments || `Review for ${review.entityType} completed`,
      "APPROVAL",
      { severity: "LOW", entityType: review.entityType, entityId: review.entityId },
    );
  }

  return review;
}

export async function countPendingReviews(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDING");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function validateReviewInput(body: unknown): ReviewInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const entityType = typeof data.entityType === "string" ? data.entityType : "";
  const entityId = typeof data.entityId === "string" ? data.entityId : "";
  const reviewer = typeof data.reviewer === "string" ? data.reviewer.trim() : "";

  if (!entityType || !entityId || !reviewer) return null;

  return {
    entityType,
    entityId,
    reviewer,
    comments: typeof data.comments === "string" ? data.comments : "",
  };
}
