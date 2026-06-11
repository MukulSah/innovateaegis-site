import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder } from "./notifications";
import type { Document, DocumentType } from "./types";

type DocumentRow = {
  id: string;
  workflow_id: string | null;
  project_id: string;
  created_by: string;
  title: string;
  type: DocumentType;
  content: string;
  version: number;
  created_at: string;
  projects?: { name: string } | null;
};

export type DocumentInput = {
  workflowId?: string | null;
  projectId: string;
  createdBy?: string;
  title: string;
  type: DocumentType;
  content: string;
  version?: number;
};

const documentSelect = `*, projects(name)`;

function mapRow(row: DocumentRow): Document {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    createdBy: row.created_by,
    title: row.title,
    type: row.type,
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
  };
}

export async function getDocuments(filters?: {
  projectId?: string;
  workflowId?: string;
  type?: DocumentType;
}): Promise<Document[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase.from("documents").select(documentSelect).order("created_at", { ascending: false });

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.workflowId) query = query.eq("workflow_id", filters.workflowId);
  if (filters?.type) query = query.eq("type", filters.type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DocumentRow[]).map(mapRow);
}

export async function createDocument(input: DocumentInput): Promise<Document> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      workflow_id: input.workflowId ?? null,
      project_id: input.projectId,
      created_by: input.createdBy ?? "SAI",
      title: input.title.trim(),
      type: input.type,
      content: input.content,
      version: input.version ?? 1,
    })
    .select(documentSelect)
    .single();

  if (error) throw new Error(error.message);
  const document = mapRow(data as DocumentRow);

  await recordActivityFeed({
    actor: document.createdBy,
    action: "document_created",
    targetType: "document",
    targetId: document.id,
    description: document.title,
  });

  await notifyFounder(
    `Document created: ${document.title}`,
    `${document.type} document added to project`,
    "DOCUMENT",
    { severity: "LOW", entityType: "document", entityId: document.id },
  );

  return document;
}

export async function countDocuments(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}
