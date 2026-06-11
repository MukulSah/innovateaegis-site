import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { BrainLayer, BrainSection, CategoryInput, DomainInput } from "./types";

type DomainRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_system: boolean;
  is_locked: boolean;
  layer_purpose: string;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: string;
  domain_id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  custodian_agent_role: string;
  visible_to: string[];
  created_at: string;
  updated_at: string;
  brain_domains?: { slug: string } | null;
};

function mapLayer(row: DomainRow): BrainLayer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    isSystem: row.is_system,
    isLocked: row.is_locked,
    layerPurpose: row.layer_purpose,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSection(row: CategoryRow): BrainSection {
  const layer = row.brain_domains as { slug: string } | { slug: string }[] | null | undefined;
  const layerSlug = Array.isArray(layer) ? layer[0]?.slug : layer?.slug;
  return {
    id: row.id,
    layerId: row.domain_id,
    domainId: row.domain_id,
    layerSlug,
    parentId: row.parent_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    custodianAgentRole: row.custodian_agent_role,
    visibleTo: row.visible_to ?? ["all_agents"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** @deprecated Use getBrainLayers */
export const getBrainDomains = getBrainLayers;

export async function getBrainLayers(): Promise<BrainLayer[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data: domains, error } = await supabase
    .from("brain_domains")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  if (!domains?.length) return [];

  const { data: recordCounts } = await supabase
    .from("memory_records")
    .select("domain_id")
    .eq("status", "active");

  const { data: categoryCounts } = await supabase.from("brain_categories").select("domain_id");

  const recordsByDomain = new Map<string, number>();
  for (const row of recordCounts ?? []) {
    recordsByDomain.set(row.domain_id, (recordsByDomain.get(row.domain_id) ?? 0) + 1);
  }

  const categoriesByDomain = new Map<string, number>();
  for (const row of categoryCounts ?? []) {
    categoriesByDomain.set(row.domain_id, (categoriesByDomain.get(row.domain_id) ?? 0) + 1);
  }

  return (domains as DomainRow[]).map((row) => ({
    ...mapLayer(row),
    recordCount: recordsByDomain.get(row.id) ?? 0,
    sectionCount: categoriesByDomain.get(row.id) ?? 0,
  }));
}

export async function getBrainLayerBySlug(slug: string): Promise<BrainLayer | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("brain_domains")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapLayer(data as DomainRow) : null;
}

/** @deprecated Use getBrainLayerBySlug */
export const getBrainDomainBySlug = getBrainLayerBySlug;

export async function getBrainLayerById(id: string): Promise<BrainLayer | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("brain_domains")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapLayer(data as DomainRow) : null;
}

/** @deprecated Use getBrainLayerById */
export const getBrainDomainById = getBrainLayerById;

export async function createBrainDomain(input: DomainInput): Promise<BrainLayer> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("brain_domains")
    .insert({
      slug: input.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      icon: input.icon ?? "◉",
      sort_order: input.sortOrder ?? 99,
      is_system: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapLayer(data as DomainRow);
}

export async function updateBrainDomain(
  id: string,
  input: Partial<DomainInput>,
): Promise<BrainLayer> {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("brain_domains")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapLayer(data as DomainRow);
}

export async function deleteBrainDomain(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: domain } = await supabase
    .from("brain_domains")
    .select("is_system, is_locked")
    .eq("id", id)
    .single();

  if (domain?.is_locked || domain?.is_system) {
    throw new Error("Locked Company Brain layers cannot be deleted");
  }

  const { error } = await supabase.from("brain_domains").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** @deprecated Use getBrainSections */
export const getBrainCategories = getBrainSections;

export async function getBrainSections(layerId?: string): Promise<BrainSection[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("brain_categories")
    .select("*, brain_domains(slug)")
    .order("sort_order", { ascending: true });
  if (layerId) query = query.eq("domain_id", layerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const categories = (data as CategoryRow[]).map(mapSection);
  if (!categories.length) return categories;

  const categoryIds = categories.map((c) => c.id);
  const { data: recordCounts } = await supabase
    .from("memory_records")
    .select("category_id")
    .in("category_id", categoryIds)
    .eq("status", "active");

  const counts = new Map<string, number>();
  for (const row of recordCounts ?? []) {
    if (row.category_id) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  }

  return categories.map((c) => ({ ...c, recordCount: counts.get(c.id) ?? 0 }));
}

export async function createBrainCategory(input: CategoryInput): Promise<BrainSection> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("brain_categories")
    .insert({
      domain_id: input.domainId,
      parent_id: input.parentId ?? null,
      slug: input.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      sort_order: input.sortOrder ?? 99,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSection(data as CategoryRow);
}

export async function updateBrainCategory(
  id: string,
  input: Partial<Omit<CategoryInput, "domainId">>,
): Promise<BrainSection> {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.parentId !== undefined) patch.parent_id = input.parentId;

  const { data, error } = await supabase
    .from("brain_categories")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSection(data as CategoryRow);
}

export async function deleteBrainCategory(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("brain_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
