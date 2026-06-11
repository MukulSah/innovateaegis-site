import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { MemoryVersion } from "./types";

type VersionRow = {
  id: string;
  record_id: string;
  version_number: number;
  title: string;
  description: string;
  content: string;
  changed_by: string | null;
  change_summary: string | null;
  created_at: string;
};

function mapVersion(row: VersionRow): MemoryVersion {
  return {
    id: row.id,
    recordId: row.record_id,
    versionNumber: row.version_number,
    title: row.title,
    description: row.description,
    content: row.content,
    changedBy: row.changed_by,
    changeSummary: row.change_summary,
    createdAt: row.created_at,
  };
}

export async function getRecordVersions(recordId: string): Promise<MemoryVersion[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_versions")
    .select("*")
    .eq("record_id", recordId)
    .order("version_number", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as VersionRow[]).map(mapVersion);
}

export async function getRecordVersion(
  recordId: string,
  versionNumber: number,
): Promise<MemoryVersion | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_versions")
    .select("*")
    .eq("record_id", recordId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapVersion(data as VersionRow) : null;
}
