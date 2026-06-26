import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AIExecutionMode, AIModelMode, CompanyAISettings } from "./types";

type SettingsRow = {
  id: string;
  model_mode: AIModelMode;
  execution_mode?: AIExecutionMode;
  default_provider_id: string | null;
  fallback_provider_id?: string | null;
  auto_model_rotation?: boolean | null;
  updated_at: string;
};

function mapRow(row: SettingsRow): CompanyAISettings {
  return {
    id: row.id,
    modelMode: row.model_mode,
    executionMode: row.execution_mode ?? "free",
    defaultProviderId: row.default_provider_id,
    fallbackProviderId: row.fallback_provider_id ?? null,
    autoModelRotation: row.auto_model_rotation ?? true,
    updatedAt: row.updated_at,
  };
}

export async function getCompanyAISettings(): Promise<CompanyAISettings> {
  if (!isSupabaseConfigured()) {
    return {
      id: "",
      modelMode: "single",
      executionMode: "free",
      defaultProviderId: null,
      updatedAt: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("company_ai_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const { data: created, error: createError } = await supabase
      .from("company_ai_settings")
      .insert({ model_mode: "single" })
      .select("*")
      .single();
    if (createError) throw new Error(createError.message);
    return enrichSettingsRow(created as SettingsRow);
  }

  return enrichSettingsRow(data as SettingsRow);
}

async function enrichSettingsRow(row: SettingsRow): Promise<CompanyAISettings> {
  const base = mapRow(row);
  const ids = [row.default_provider_id, row.fallback_provider_id].filter(Boolean) as string[];
  if (ids.length === 0) return base;

  const supabase = createSupabaseAdmin();
  const { data: providers } = await supabase
    .from("ai_providers")
    .select("id, provider_name")
    .in("id", ids);
  const nameMap = new Map((providers ?? []).map((p) => [p.id, p.provider_name as string]));
  return {
    ...base,
    defaultProviderName: row.default_provider_id
      ? nameMap.get(row.default_provider_id) ?? null
      : null,
    fallbackProviderName: row.fallback_provider_id
      ? nameMap.get(row.fallback_provider_id) ?? null
      : null,
  };
}

export async function updateCompanyAISettings(updates: {
  modelMode?: AIModelMode;
  executionMode?: AIExecutionMode;
  defaultProviderId?: string | null;
  fallbackProviderId?: string | null;
  autoModelRotation?: boolean;
}): Promise<CompanyAISettings> {
  const supabase = createSupabaseAdmin();
  const current = await getCompanyAISettings();

  const { data, error } = await supabase
    .from("company_ai_settings")
    .update({
      model_mode: updates.modelMode ?? current.modelMode,
      execution_mode: updates.executionMode ?? current.executionMode ?? "free",
      default_provider_id:
        updates.defaultProviderId !== undefined
          ? updates.defaultProviderId
          : current.defaultProviderId,
      fallback_provider_id:
        updates.fallbackProviderId !== undefined
          ? updates.fallbackProviderId
          : current.fallbackProviderId ?? null,
      auto_model_rotation:
        updates.autoModelRotation !== undefined
          ? updates.autoModelRotation
          : current.autoModelRotation ?? true,
    })
    .eq("id", current.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return enrichSettingsRow(data as SettingsRow);
}
