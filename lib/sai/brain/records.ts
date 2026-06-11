import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { logMemoryActivity } from "./activities";
import {
  buildRecordPresentation,
  extractTagsFromSectionFields,
  parseSectionMetadata,
  validateSectionFields,
  type SectionRecordMetadata,
} from "./section-schemas";
import type { BrainSectionSlug } from "./structure.types";
import type {
  MemoryRecord,
  MemoryRecordStatus,
  PermissionLevel,
  RecordInput,
} from "./types";

type RecordRow = {
  id: string;
  title: string;
  description: string;
  content: string;
  domain_id: string;
  category_id: string | null;
  parent_id: string | null;
  owner_id: string | null;
  created_by: string | null;
  status: MemoryRecordStatus;
  version: number;
  permission_level: PermissionLevel;
  ai_summary: string | null;
  merged_into_id: string | null;
  owner_agent_id: string | null;
  owner_agent_name: string;
  department: string;
  approved_by: string;
  approved_by_id: string | null;
  effective_date: string | null;
  visibility: string;
  attachments: unknown[];
  metadata: SectionRecordMetadata | Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  brain_domains?: { slug: string; name: string } | null;
  brain_categories?: { name: string; slug: string } | null;
};

const recordSelect = `*, brain_domains(slug, name), brain_categories(name, slug)`;

function mapRecord(row: RecordRow, tags: string[] = []): MemoryRecord {
  const domain = row.brain_domains as { slug: string; name: string } | null;
  const category = row.brain_categories as { name: string; slug: string } | null;
  const metadata = parseSectionMetadata(row.metadata);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    recordType: metadata?.recordType ?? null,
    sectionFields: metadata?.fields ?? {},
    metadata,
    domainId: row.domain_id,
    domainSlug: domain?.slug,
    domainName: domain?.name,
    layerSlug: domain?.slug,
    layerName: domain?.name,
    categoryId: row.category_id,
    categoryName: category?.name ?? null,
    sectionSlug: category?.slug ?? null,
    parentId: row.parent_id,
    ownerId: row.owner_id,
    ownerAgentId: row.owner_agent_id,
    ownerAgentName: row.owner_agent_name ?? "",
    department: row.department ?? "",
    approvedBy: row.approved_by ?? "",
    approvedById: row.approved_by_id,
    effectiveDate: row.effective_date,
    visibility: row.visibility ?? "all_agents",
    attachments: row.attachments ?? [],
    createdBy: row.created_by,
    status: row.status,
    version: row.version,
    permissionLevel: row.permission_level,
    aiSummary: row.ai_summary,
    mergedIntoId: row.merged_into_id,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadTags(recordIds: string[]): Promise<Map<string, string[]>> {
  if (!recordIds.length) return new Map();

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("memory_tags")
    .select("record_id, tag")
    .in("record_id", recordIds);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.record_id) ?? [];
    list.push(row.tag);
    map.set(row.record_id, list);
  }
  return map;
}

async function syncTags(recordId: string, tags: string[]): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("memory_tags").delete().eq("record_id", recordId);

  const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (!normalized.length) return;

  const { error } = await supabase.from("memory_tags").insert(
    normalized.map((tag) => ({ record_id: recordId, tag })),
  );
  if (error) throw new Error(error.message);
}

async function saveVersion(
  record: RecordRow,
  changedBy: string | null,
  changeSummary?: string,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("memory_versions").insert({
    record_id: record.id,
    version_number: record.version,
    title: record.title,
    description: record.description,
    content: record.content,
    changed_by: changedBy,
    change_summary: changeSummary ?? null,
  });
}

export type RecordFilters = {
  domainId?: string;
  domainSlug?: string;
  categoryId?: string;
  parentId?: string | null;
  status?: MemoryRecordStatus;
  ownerId?: string;
  permissionLevel?: PermissionLevel;
  search?: string;
  tag?: string;
  limit?: number;
  includeArchived?: boolean;
  /** When false, founder_only records are excluded */
  isFounder?: boolean;
};

export async function getMemoryRecords(filters: RecordFilters = {}): Promise<MemoryRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();

  if (filters.domainSlug && !filters.domainId) {
    const { data: domain } = await supabase
      .from("brain_domains")
      .select("id")
      .eq("slug", filters.domainSlug)
      .maybeSingle();
    if (!domain) return [];
    filters = { ...filters, domainId: domain.id };
  }

  let query = supabase
    .from("memory_records")
    .select(recordSelect)
    .order("updated_at", { ascending: false });

  if (filters.domainId) query = query.eq("domain_id", filters.domainId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.parentId !== undefined) {
    query = filters.parentId === null
      ? query.is("parent_id", null)
      : query.eq("parent_id", filters.parentId);
  }
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.permissionLevel) query = query.eq("permission_level", filters.permissionLevel);

  if (filters.status) {
    query = query.eq("status", filters.status);
  } else if (!filters.includeArchived) {
    query = query.eq("status", "active");
  }

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},content.ilike.${term}`);
  }

  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data as RecordRow[];

  if (filters.tag?.trim()) {
    const tag = filters.tag.trim().toLowerCase();
    const { data: tagRows } = await supabase
      .from("memory_tags")
      .select("record_id")
      .eq("tag", tag);
    const ids = new Set((tagRows ?? []).map((r) => r.record_id));
    rows = rows.filter((r) => ids.has(r.id));
  }

  let mapped = rows.map((row) => mapRecord(row, []));
  if (filters.isFounder === false) {
    mapped = mapped.filter((r) => r.permissionLevel !== "founder_only");
  }

  const tagMap = await loadTags(mapped.map((r) => r.id));
  return mapped.map((row) => mapRecord(
    rows.find((r) => r.id === row.id) as RecordRow,
    tagMap.get(row.id) ?? [],
  ));
}

export async function getMemoryRecordsByIds(ids: string[]): Promise<MemoryRecord[]> {
  if (!ids.length || !isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_records")
    .select(recordSelect)
    .in("id", ids);

  if (error) throw new Error(error.message);
  const rows = data as RecordRow[];
  const tagMap = await loadTags(rows.map((r) => r.id));
  const map = new Map(
    rows.map((row) => [row.id, mapRecord(row, tagMap.get(row.id) ?? [])]),
  );
  return ids.map((id) => map.get(id)).filter((r): r is MemoryRecord => !!r);
}

export async function getMemoryRecordById(id: string): Promise<MemoryRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_records")
    .select(recordSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const tagMap = await loadTags([id]);
  return mapRecord(data as RecordRow, tagMap.get(id) ?? []);
}

function resolveSectionPayload(input: RecordInput): {
  title: string;
  description: string;
  content: string;
  metadata: SectionRecordMetadata | null;
  tags: string[];
} {
  if (input.metadata) {
    return {
      title: input.title?.trim() ?? "",
      description: input.description?.trim() ?? "",
      content: input.content?.trim() ?? "",
      metadata: input.metadata,
      tags: input.tags ?? [],
    };
  }

  if (input.sectionSlug && input.sectionFields) {
    const presentation = buildRecordPresentation(
      input.sectionSlug as BrainSectionSlug,
      input.sectionFields,
    );
    const sectionTags = extractTagsFromSectionFields(
      input.sectionSlug as BrainSectionSlug,
      input.sectionFields,
    );
    return {
      ...presentation,
      tags: [...new Set([...(input.tags ?? []), ...sectionTags])],
    };
  }

  return {
    title: input.title?.trim() ?? "",
    description: input.description?.trim() ?? "",
    content: input.content?.trim() ?? "",
    metadata: null,
    tags: input.tags ?? [],
  };
}

export async function createMemoryRecord(
  input: RecordInput,
  actorId?: string | null,
): Promise<MemoryRecord> {
  const payload = resolveSectionPayload(input);
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_records")
    .insert({
      title: payload.title,
      description: payload.description,
      content: payload.content,
      metadata: payload.metadata,
      domain_id: input.domainId,
      category_id: input.categoryId ?? null,
      parent_id: input.parentId ?? null,
      owner_id: input.ownerId ?? input.createdBy ?? null,
      created_by: input.createdBy ?? null,
      permission_level: input.permissionLevel ?? "public",
      ai_summary: input.aiSummary ?? null,
      owner_agent_id: input.ownerAgentId ?? null,
      owner_agent_name: input.ownerAgentName?.trim() ?? "",
      department: input.department?.trim() ?? "",
      approved_by: input.approvedBy?.trim() ?? "",
      approved_by_id: input.approvedById ?? null,
      effective_date: input.effectiveDate ?? null,
      visibility: input.visibility ?? "all_agents",
    })
    .select(recordSelect)
    .single();

  if (error) throw new Error(error.message);

  const row = data as RecordRow;
  if (payload.tags.length) await syncTags(row.id, payload.tags);

  await saveVersion(row, actorId ?? input.createdBy ?? null, "Initial version");
  await logMemoryActivity(row.id, actorId ?? null, "created", { title: row.title });

  const tagMap = await loadTags([row.id]);
  return mapRecord(row, tagMap.get(row.id) ?? []);
}

export async function updateMemoryRecord(
  id: string,
  input: Partial<RecordInput> & { status?: MemoryRecordStatus },
  actorId?: string | null,
): Promise<MemoryRecord> {
  const supabase = createSupabaseAdmin();

  const { data: existing } = await supabase
    .from("memory_records")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw new Error("Record not found");

  const patch: Record<string, unknown> = {};
  let tagsToSync: string[] | undefined;

  if (input.sectionSlug && input.sectionFields) {
    const presentation = buildRecordPresentation(
      input.sectionSlug as BrainSectionSlug,
      input.sectionFields,
    );
    patch.title = presentation.title;
    patch.description = presentation.description;
    patch.content = presentation.content;
    patch.metadata = presentation.metadata;
    tagsToSync = [
      ...new Set([
        ...(input.tags ?? []),
        ...extractTagsFromSectionFields(input.sectionSlug as BrainSectionSlug, input.sectionFields),
      ]),
    ];
  } else if (input.metadata) {
    patch.metadata = input.metadata;
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.content !== undefined) patch.content = input.content.trim();
  } else {
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.content !== undefined) patch.content = input.content.trim();
  }
  if (input.domainId !== undefined) patch.domain_id = input.domainId;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.parentId !== undefined) patch.parent_id = input.parentId;
  if (input.ownerId !== undefined) patch.owner_id = input.ownerId;
  if (input.permissionLevel !== undefined) patch.permission_level = input.permissionLevel;
  if (input.aiSummary !== undefined) patch.ai_summary = input.aiSummary;
  if (input.status !== undefined) patch.status = input.status;
  if (input.ownerAgentId !== undefined) patch.owner_agent_id = input.ownerAgentId;
  if (input.ownerAgentName !== undefined) patch.owner_agent_name = input.ownerAgentName.trim();
  if (input.department !== undefined) patch.department = input.department.trim();
  if (input.approvedBy !== undefined) patch.approved_by = input.approvedBy.trim();
  if (input.approvedById !== undefined) patch.approved_by_id = input.approvedById;
  if (input.effectiveDate !== undefined) patch.effective_date = input.effectiveDate;
  if (input.visibility !== undefined) patch.visibility = input.visibility;

  const contentChanged =
    input.title !== undefined ||
    input.description !== undefined ||
    input.content !== undefined ||
    input.sectionFields !== undefined ||
    input.metadata !== undefined;

  if (contentChanged) {
    patch.version = (existing as RecordRow).version + 1;
  }

  const { data, error } = await supabase
    .from("memory_records")
    .update(patch)
    .eq("id", id)
    .select(recordSelect)
    .single();

  if (error) throw new Error(error.message);

  const row = data as RecordRow;
  if (tagsToSync !== undefined) await syncTags(id, tagsToSync);
  else if (input.tags !== undefined) await syncTags(id, input.tags);

  if (contentChanged) {
    await saveVersion(row, actorId ?? null, "Content updated");
  }

  await logMemoryActivity(id, actorId ?? null, "updated", { fields: Object.keys(patch) });

  const tagMap = await loadTags([id]);
  return mapRecord(row, tagMap.get(id) ?? []);
}

export async function archiveMemoryRecord(id: string, actorId?: string | null): Promise<MemoryRecord> {
  return updateMemoryRecord(id, { status: "archived" }, actorId);
}

export async function restoreMemoryRecord(id: string, actorId?: string | null): Promise<MemoryRecord> {
  return updateMemoryRecord(id, { status: "active" }, actorId);
}

export async function moveMemoryRecord(
  id: string,
  target: { domainId?: string; categoryId?: string | null; parentId?: string | null },
  actorId?: string | null,
): Promise<MemoryRecord> {
  return updateMemoryRecord(id, target, actorId);
}

export async function mergeMemoryRecords(
  sourceId: string,
  targetId: string,
  actorId?: string | null,
): Promise<MemoryRecord> {
  const supabase = createSupabaseAdmin();

  const { data: relationships } = await supabase
    .from("memory_relationships")
    .select("*")
    .or(`source_id.eq.${sourceId},target_id.eq.${sourceId}`);

  for (const rel of relationships ?? []) {
    const newSource = rel.source_id === sourceId ? targetId : rel.source_id;
    const newTarget = rel.target_id === sourceId ? targetId : rel.target_id;
    if (newSource === newTarget) continue;

    await supabase.from("memory_relationships").upsert(
      {
        source_id: newSource,
        target_id: newTarget,
        relationship_type: rel.relationship_type,
        label: rel.label,
        created_by: actorId ?? rel.created_by,
      },
      { onConflict: "source_id,target_id,relationship_type" },
    );
  }

  await supabase
    .from("memory_records")
    .update({ status: "merged", merged_into_id: targetId })
    .eq("id", sourceId);

  await logMemoryActivity(sourceId, actorId ?? null, "merged", { mergedIntoId: targetId });
  await logMemoryActivity(targetId, actorId ?? null, "merge_target", { mergedFromId: sourceId });

  const target = await getMemoryRecordById(targetId);
  if (!target) throw new Error("Target record not found");
  return target;
}

export async function deleteMemoryRecord(id: string, actorId?: string | null): Promise<void> {
  const supabase = createSupabaseAdmin();
  await logMemoryActivity(id, actorId ?? null, "deleted", {});
  const { error } = await supabase.from("memory_records").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

function parseSectionFields(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    fields[key] = typeof value === "string" ? value : String(value ?? "");
  }
  return fields;
}

export type RecordValidationResult =
  | { ok: true; input: RecordInput }
  | { ok: false; errors: { field: string; message: string }[] };

export function validateRecordInput(body: unknown): RecordValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: [{ field: "_form", message: "Invalid request body" }] };
  }

  const b = body as Record<string, unknown>;
  if (typeof b.domainId !== "string" || !b.domainId) {
    return { ok: false, errors: [{ field: "domainId", message: "Layer is required" }] };
  }

  const sectionSlug = typeof b.sectionSlug === "string" ? b.sectionSlug : null;
  const sectionFields = parseSectionFields(b.sectionFields);
  const errors: { field: string; message: string }[] = [];

  if (!sectionSlug || !sectionFields) {
    if (typeof b.title !== "string" || !b.title.trim()) {
      errors.push({ field: "title", message: "Section and fields are required" });
    }
    if (errors.length) return { ok: false, errors };
  } else {
    errors.push(
      ...validateSectionFields(sectionSlug as BrainSectionSlug, sectionFields).map((e) => ({
        field: e.field,
        message: e.message,
      })),
    );
    if (!b.categoryId) {
      errors.push({ field: "categoryId", message: "Knowledge section is required" });
    }
    if (!b.ownerAgentId && !b.ownerAgentName) {
      errors.push({ field: "ownerAgentId", message: "Owner agent is required" });
    }
    if (typeof b.approvedBy !== "string" || !b.approvedBy.trim()) {
      errors.push({ field: "approvedBy", message: "Approved by is required" });
    }
    if (errors.length) return { ok: false, errors };
  }

  const input: RecordInput = {
    domainId: b.domainId,
    categoryId: typeof b.categoryId === "string" ? b.categoryId : null,
    parentId: typeof b.parentId === "string" ? b.parentId : null,
    ownerId: typeof b.ownerId === "string" ? b.ownerId : null,
    ownerAgentId: typeof b.ownerAgentId === "string" ? b.ownerAgentId : null,
    ownerAgentName: typeof b.ownerAgentName === "string" ? b.ownerAgentName : "",
    department: typeof b.department === "string" ? b.department : "",
    approvedBy: typeof b.approvedBy === "string" ? b.approvedBy : "",
    approvedById: typeof b.approvedById === "string" ? b.approvedById : null,
    effectiveDate: typeof b.effectiveDate === "string" ? b.effectiveDate : null,
    visibility: typeof b.visibility === "string" ? b.visibility : "all_agents",
    createdBy: typeof b.createdBy === "string" ? b.createdBy : null,
    permissionLevel:
      b.permissionLevel === "public" ||
      b.permissionLevel === "department" ||
      b.permissionLevel === "selected_agents" ||
      b.permissionLevel === "founder_only"
        ? b.permissionLevel
        : "public",
    tags: Array.isArray(b.tags) ? b.tags.filter((t): t is string => typeof t === "string") : [],
    aiSummary: typeof b.aiSummary === "string" ? b.aiSummary : null,
    sectionSlug: sectionSlug ?? undefined,
    sectionFields: sectionFields ?? undefined,
    title: typeof b.title === "string" ? b.title : undefined,
    description: typeof b.description === "string" ? b.description : undefined,
    content: typeof b.content === "string" ? b.content : undefined,
  };

  return { ok: true, input };
}
