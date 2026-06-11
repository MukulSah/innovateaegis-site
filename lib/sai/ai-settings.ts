import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AIModelMode, CompanyAISettings } from "./types";

type SettingsRow = {
  id: string;
  model_mode: AIModelMode;
  default_provider_id: string | null;
  updated_at: string;
  ai_providers?: { provider_name: string } | null;
};

function mapRow(row: SettingsRow): CompanyAISettings {
  return {
    id: row.id,
    modelMode: row.model_mode,
    defaultProviderId: row.default_provider_id,
    defaultProviderName: row.ai_providers?.provider_name ?? null,
    updatedAt: row.updated_at,
  };
}

export async function getCompanyAISettings(): Promise<CompanyAISettings> {
  if (!isSupabaseConfigured()) {
    return {
      id: "",
      modelMode: "single",
      defaultProviderId: null,
      updatedAt: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("company_ai_settings")
    .select("*, ai_providers(provider_name)")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const { data: created, error: createError } = await supabase
      .from("company_ai_settings")
      .insert({ model_mode: "single" })
      .select("*, ai_providers(provider_name)")
      .single();
    if (createError) throw new Error(createError.message);
    return mapRow(created as SettingsRow);
  }

  return mapRow(data as SettingsRow);
}

export async function updateCompanyAISettings(updates: {
  modelMode?: AIModelMode;
  defaultProviderId?: string | null;
}): Promise<CompanyAISettings> {
  const supabase = createSupabaseAdmin();
  const current = await getCompanyAISettings();

  const { data, error } = await supabase
    .from("company_ai_settings")
    .update({
      model_mode: updates.modelMode ?? current.modelMode,
      default_provider_id:
        updates.defaultProviderId !== undefined
          ? updates.defaultProviderId
          : current.defaultProviderId,
    })
    .eq("id", current.id)
    .select("*, ai_providers(provider_name)")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as SettingsRow);
}
