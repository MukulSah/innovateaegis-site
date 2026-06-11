import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import { recordActivity } from "./activity-logs";
import { recordCompanyTimeline } from "./company-timeline";
import { createDocument } from "./documents";
import { createMemory } from "./memories";
import { notifyFounder } from "./notifications";
import { createReview } from "./reviews";
import type { Deliverable, DeliverableStatus, DeliverableType } from "./types";

type DeliverableRow = {
  id: string;
  workflow_id: string | null;
  project_id: string;
  task_id: string | null;
  title: string;
  type: DeliverableType;
  status: DeliverableStatus;
  owner: string;
  content: string;
  version: number;
  created_at: string;
  projects?: { name: string } | null;
};

export type DeliverableInput = {
  workflowId?: string | null;
  projectId: string;
  taskId?: string | null;
  title: string;
  type: DeliverableType;
  status?: DeliverableStatus;
  owner?: string;
  content: string;
  version?: number;
};

const deliverableSelect = `*, projects(name)`;

const TYPE_TO_DOCUMENT: Partial<Record<DeliverableType, string>> = {
  "Requirements Document": "requirement",
  "Architecture Document": "architecture",
  "API Specification": "technical_spec",
  "Implementation Guide": "implementation_guide",
  "Test Plan": "test_plan",
  "Release Notes": "release_note",
  "Meeting Summary": "meeting_note",
};

function mapRow(row: DeliverableRow): Deliverable {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    taskId: row.task_id,
    title: row.title,
    type: row.type,
    status: row.status,
    owner: row.owner,
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
  };
}

export async function getDeliverables(filters?: {
  projectId?: string;
  workflowId?: string;
  taskId?: string;
  status?: DeliverableStatus;
}): Promise<Deliverable[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase.from("deliverables").select(deliverableSelect).order("created_at", { ascending: false });

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.workflowId) query = query.eq("workflow_id", filters.workflowId);
  if (filters?.taskId) query = query.eq("task_id", filters.taskId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DeliverableRow[]).map(mapRow);
}

export async function getDeliverableById(id: string): Promise<Deliverable | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("deliverables")
    .select(deliverableSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as DeliverableRow) : null;
}

export async function createDeliverable(input: DeliverableInput): Promise<Deliverable> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("deliverables")
    .insert({
      workflow_id: input.workflowId ?? null,
      project_id: input.projectId,
      task_id: input.taskId ?? null,
      title: input.title.trim(),
      type: input.type,
      status: input.status ?? "DRAFT",
      owner: input.owner ?? "SAI",
      content: input.content,
      version: input.version ?? 1,
    })
    .select(deliverableSelect)
    .single();

  if (error) throw new Error(error.message);
  const deliverable = mapRow(data as DeliverableRow);

  await recordActivity({
    actor: deliverable.owner,
    action: `Deliverable created: ${deliverable.title}`,
    entityType: "deliverable",
    entityId: deliverable.id,
  });

  await recordActivityFeed({
    actor: deliverable.owner,
    action: "deliverable_created",
    targetType: "deliverable",
    targetId: deliverable.id,
    description: deliverable.title,
  });

  return deliverable;
}

export async function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
  actor = "SAI",
): Promise<Deliverable> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("deliverables")
    .update({ status })
    .eq("id", id)
    .select(deliverableSelect)
    .single();

  if (error) throw new Error(error.message);
  const deliverable = mapRow(data as DeliverableRow);

  await recordActivityFeed({
    actor,
    action: `deliverable_${status.toLowerCase()}`,
    targetType: "deliverable",
    targetId: id,
    description: deliverable.title,
  });

  if (status === "IN_REVIEW") {
    await createReview({
      entityType: "deliverable",
      entityId: id,
      reviewer: actor,
      comments: `Review requested for ${deliverable.title}`,
    });
    await notifyFounder(
      `Review needed: ${deliverable.title}`,
      `${deliverable.type} deliverable is ready for review`,
      "APPROVAL",
      { severity: "MEDIUM", entityType: "deliverable", entityId: id },
    );
  }

  if (status === "PUBLISHED") {
    await publishDeliverableToKnowledge(deliverable, actor);
  }

  return deliverable;
}

async function publishDeliverableToKnowledge(deliverable: Deliverable, actor: string): Promise<void> {
  const docType = TYPE_TO_DOCUMENT[deliverable.type] ?? "technical_spec";

  await createDocument({
    workflowId: deliverable.workflowId,
    projectId: deliverable.projectId,
    createdBy: deliverable.owner,
    title: deliverable.title,
    type: docType as Parameters<typeof createDocument>[0]["type"],
    content: deliverable.content,
    version: deliverable.version,
  });

  await createMemory({
    title: deliverable.title,
    content: deliverable.content.slice(0, 2000),
    type: "engineering",
    projectId: deliverable.projectId,
    createdBy: deliverable.owner,
  });

  await recordCompanyTimeline({
    eventType: "deliverable_published",
    entityType: "deliverable",
    entityId: deliverable.id,
    projectId: deliverable.projectId,
    workflowId: deliverable.workflowId,
    title: `Deliverable published: ${deliverable.title}`,
    description: deliverable.type,
    actor,
    severity: "info",
  });

  await notifyFounder(
    `Deliverable published: ${deliverable.title}`,
    `Now available in Knowledge Center`,
    "DOCUMENT",
    { severity: "LOW", entityType: "deliverable", entityId: deliverable.id },
  );
}

export async function countDeliverablesByStatus(status: DeliverableStatus): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("deliverables")
    .select("*", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function validateDeliverableInput(body: unknown): DeliverableInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const types: DeliverableType[] = [
    "PRD", "Requirements Document", "Architecture Document", "API Specification",
    "Database Design", "Implementation Guide", "Test Plan", "Test Report",
    "Release Notes", "Deployment Plan", "Meeting Summary", "Research Report",
    "Business Proposal", "Client Deliverable", "Training Material", "Knowledge Base Article",
  ];

  const projectId = typeof data.projectId === "string" ? data.projectId : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const type = data.type as DeliverableType;

  if (!projectId || !title || !types.includes(type)) return null;

  return {
    workflowId: typeof data.workflowId === "string" ? data.workflowId : null,
    projectId,
    taskId: typeof data.taskId === "string" ? data.taskId : null,
    title,
    type,
    status: (data.status as DeliverableStatus) ?? "DRAFT",
    owner: typeof data.owner === "string" ? data.owner : "SAI",
    content: typeof data.content === "string" ? data.content : "",
    version: typeof data.version === "number" ? data.version : 1,
  };
}
