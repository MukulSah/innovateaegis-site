import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logMemoryActivity } from "./activities";
import type { GranteeType, MemoryPermission } from "./types";

type PermissionRow = {
  id: string;
  record_id: string;
  grantee_type: GranteeType;
  grantee: string;
  can_read: boolean;
  can_write: boolean;
  created_at: string;
};

function mapPermission(row: PermissionRow): MemoryPermission {
  return {
    id: row.id,
    recordId: row.record_id,
    granteeType: row.grantee_type,
    grantee: row.grantee,
    canRead: row.can_read,
    canWrite: row.can_write,
    createdAt: row.created_at,
  };
}

export async function getRecordPermissions(recordId: string): Promise<MemoryPermission[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_permissions")
    .select("*")
    .eq("record_id", recordId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as PermissionRow[]).map(mapPermission);
}

export async function setRecordPermissions(
  recordId: string,
  permissions: Array<{
    granteeType: GranteeType;
    grantee: string;
    canRead?: boolean;
    canWrite?: boolean;
  }>,
  actorId?: string | null,
): Promise<MemoryPermission[]> {
  const supabase = createSupabaseAdmin();
  await supabase.from("memory_permissions").delete().eq("record_id", recordId);

  if (permissions.length) {
    const { error } = await supabase.from("memory_permissions").insert(
      permissions.map((p) => ({
        record_id: recordId,
        grantee_type: p.granteeType,
        grantee: p.grantee.trim(),
        can_read: p.canRead ?? true,
        can_write: p.canWrite ?? false,
      })),
    );
    if (error) throw new Error(error.message);
  }

  await logMemoryActivity(recordId, actorId ?? null, "permissions_updated", {
    count: permissions.length,
  });

  return getRecordPermissions(recordId);
}
