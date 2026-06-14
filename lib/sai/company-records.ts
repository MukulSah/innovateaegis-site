import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { CompanyRecordType } from "./session-types";

export type CompanyRecord = {
  id: string;
  recordType: CompanyRecordType;
  title: string;
  summary: string;
  content: Record<string, unknown>;
  sourceSessionId: string | null;
  sourceProjectId: string | null;
  sourceAgentId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type RecordRow = {
  id: string;
  record_type: CompanyRecordType;
  title: string;
  summary: string;
  content: Record<string, unknown>;
  source_session_id: string | null;
  source_project_id: string | null;
  source_agent_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

function mapRow(row: RecordRow): CompanyRecord {
  return {
    id: row.id,
    recordType: row.record_type,
    title: row.title,
    summary: row.summary,
    content: row.content ?? {},
    sourceSessionId: row.source_session_id,
    sourceProjectId: row.source_project_id,
    sourceAgentId: row.source_agent_id,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createCompanyRecord(input: {
  recordType: CompanyRecordType;
  title: string;
  summary: string;
  content?: Record<string, unknown>;
  sourceSessionId?: string | null;
  sourceProjectId?: string | null;
  sourceAgentId?: string | null;
  tags?: string[];
}): Promise<CompanyRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const searchText = [input.title, input.summary, ...(input.tags ?? [])].join(" ");

  const { data, error } = await supabase
    .from("company_records")
    .insert({
      record_type: input.recordType,
      title: input.title,
      summary: input.summary,
      content: input.content ?? {},
      source_session_id: input.sourceSessionId ?? null,
      source_project_id: input.sourceProjectId ?? null,
      source_agent_id: input.sourceAgentId ?? null,
      tags: input.tags ?? [],
      search_text: searchText,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("does not exist")) return null;
    throw new Error(error.message);
  }

  return mapRow(data as RecordRow);
}

export async function getCompanyRecords(filters?: {
  recordType?: CompanyRecordType;
  sourceSessionId?: string;
  search?: string;
  limit?: number;
}): Promise<CompanyRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("company_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 100);

  if (filters?.recordType) query = query.eq("record_type", filters.recordType);
  if (filters?.sourceSessionId) query = query.eq("source_session_id", filters.sourceSessionId);
  if (filters?.search) {
    query = query.ilike("search_text", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as RecordRow[]).map(mapRow);
}

export async function getRecordsCenterSummary(): Promise<{
  sessionFiles: number;
  decisions: number;
  knowledge: number;
  architecture: number;
  sops: number;
  agentLearnings: number;
  total: number;
}> {
  if (!isSupabaseConfigured()) {
    return { sessionFiles: 0, decisions: 0, knowledge: 0, architecture: 0, sops: 0, agentLearnings: 0, total: 0 };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("company_records").select("record_type");

  if (error || !data) {
    return { sessionFiles: 0, decisions: 0, knowledge: 0, architecture: 0, sops: 0, agentLearnings: 0, total: 0 };
  }

  const counts = {
    sessionFiles: 0,
    decisions: 0,
    knowledge: 0,
    architecture: 0,
    sops: 0,
    agentLearnings: 0,
    total: data.length,
  };

  for (const row of data) {
    const type = row.record_type as CompanyRecordType;
    if (type === "session_file") counts.sessionFiles++;
    else if (type === "decision") counts.decisions++;
    else if (type === "knowledge" || type === "lesson" || type === "recommendation") counts.knowledge++;
    else if (type === "architecture") counts.architecture++;
    else if (type === "sop") counts.sops++;
    else if (type === "agent_learning") counts.agentLearnings++;
  }

  return counts;
}
