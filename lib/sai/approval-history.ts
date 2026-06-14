import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { ApprovalType } from "./types";

export type ApprovalHistoryDecision =
  | "requested"
  | "approved"
  | "rejected"
  | "revision_required"
  | "escalated"
  | "auto_approved"
  | "reopened"
  | "dismissed";

export type ApprovalHistoryEntry = {
  id: string;
  approvalId: string | null;
  workflowId: string | null;
  projectId: string;
  approvalType: ApprovalType;
  title: string;
  requestedBy: string;
  decidedBy: string | null;
  decision: ApprovalHistoryDecision;
  artifactContent: string;
  comments: string;
  requestedAt: string | null;
  decidedAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type HistoryRow = {
  id: string;
  approval_id: string | null;
  workflow_id: string | null;
  project_id: string;
  approval_type: string;
  title: string;
  requested_by: string;
  decided_by: string | null;
  decision: string;
  artifact_content: string;
  comments: string;
  requested_at: string | null;
  decided_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function mapRow(row: HistoryRow): ApprovalHistoryEntry {
  return {
    id: row.id,
    approvalId: row.approval_id,
    workflowId: row.workflow_id,
    projectId: row.project_id,
    approvalType: row.approval_type as ApprovalType,
    title: row.title,
    requestedBy: row.requested_by,
    decidedBy: row.decided_by,
    decision: row.decision as ApprovalHistoryDecision,
    artifactContent: row.artifact_content,
    comments: row.comments,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function recordApprovalHistory(input: {
  approvalId?: string | null;
  workflowId?: string | null;
  projectId: string;
  approvalType: ApprovalType | string;
  title: string;
  requestedBy: string;
  decidedBy?: string | null;
  decision: ApprovalHistoryDecision;
  artifactContent?: string;
  comments?: string;
  requestedAt?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ApprovalHistoryEntry | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("approval_history")
    .insert({
      approval_id: input.approvalId ?? null,
      workflow_id: input.workflowId ?? null,
      project_id: input.projectId,
      approval_type: input.approvalType,
      title: input.title,
      requested_by: input.requestedBy,
      decided_by: input.decidedBy ?? null,
      decision: input.decision,
      artifact_content: input.artifactContent ?? "",
      comments: input.comments ?? "",
      requested_at: input.requestedAt ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    console.warn("[approval-history] insert failed:", error.message);
    return null;
  }
  return mapRow(data as HistoryRow);
}

export async function getApprovalHistory(filters?: {
  workflowId?: string;
  projectId?: string;
  limit?: number;
}): Promise<ApprovalHistoryEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("approval_history")
    .select("*")
    .order("decided_at", { ascending: false });

  if (filters?.workflowId) query = query.eq("workflow_id", filters.workflowId);
  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) {
    if (error.message.includes("approval_history") && error.message.includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }
  return (data as HistoryRow[]).map(mapRow);
}
