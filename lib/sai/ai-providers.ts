import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getDefaultEndpoint,
  getDefaultModel,
  getProviderLabel,
  listSupportedProviders,
} from "./ai-provider-catalog";
import { decryptSecret, encryptSecret } from "./crypto";
import type { AIProvider, AIProviderName } from "./types";

export { getDefaultEndpoint, getDefaultModel, getProviderLabel, listSupportedProviders };

type ProviderRow = {
  id: string;
  provider_name: AIProviderName;
  api_key_encrypted: string;
  endpoint: string;
  model: string;
  enabled: boolean;
  default_provider: boolean;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ProviderRow): AIProvider {
  const apiKey = row.api_key_encrypted ? decryptSecret(row.api_key_encrypted) : "";
  return {
    id: row.id,
    providerName: row.provider_name,
    hasApiKey: Boolean(row.api_key_encrypted),
    keyReadable: Boolean(apiKey),
    endpoint: row.endpoint,
    model: row.model,
    enabled: row.enabled,
    defaultProvider: row.default_provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAIProviders(): Promise<AIProvider[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_providers")
    .select("*")
    .order("provider_name");

  if (error) throw new Error(error.message);
  return (data as ProviderRow[]).map(mapRow);
}

export async function getAIProviderById(id: string): Promise<AIProvider | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_providers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as ProviderRow) : null;
}

export async function getDefaultAIProvider(): Promise<{
  provider: AIProvider;
  apiKey: string;
} | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_providers")
    .select("*")
    .eq("default_provider", true)
    .eq("enabled", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as ProviderRow;
  return {
    provider: mapRow(row),
    apiKey: decryptSecret(row.api_key_encrypted),
  };
}

export async function getProviderWithKey(id: string): Promise<{
  provider: AIProvider;
  apiKey: string;
} | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_providers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as ProviderRow;
  return {
    provider: mapRow(row),
    apiKey: decryptSecret(row.api_key_encrypted),
  };
}

export type AIProviderInput = {
  providerName: AIProviderName;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  enabled?: boolean;
  defaultProvider?: boolean;
};

export async function upsertAIProvider(
  input: AIProviderInput,
  existingId?: string,
): Promise<AIProvider> {
  const supabase = createSupabaseAdmin();

  if (input.defaultProvider) {
    await supabase.from("ai_providers").update({ default_provider: false }).neq("id", existingId ?? "");
  }

  const payload: Record<string, unknown> = {
    provider_name: input.providerName,
    endpoint: input.endpoint ?? getDefaultEndpoint(input.providerName),
    model: input.model ?? getDefaultModel(input.providerName),
    enabled: input.enabled ?? true,
    default_provider: input.defaultProvider ?? false,
  };

  if (input.apiKey && input.apiKey !== "••••••••••••") {
    payload.api_key_encrypted = encryptSecret(input.apiKey);
  }

  if (existingId) {
    const { data, error } = await supabase
      .from("ai_providers")
      .update(payload)
      .eq("id", existingId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const provider = mapRow(data as ProviderRow);

    if (input.defaultProvider) {
      const { updateCompanyAISettings } = await import("./ai-settings");
      await updateCompanyAISettings({ defaultProviderId: provider.id });
    }

    return provider;
  }

  if (!input.apiKey) {
    throw new Error("API key is required for new providers");
  }

  payload.api_key_encrypted = encryptSecret(input.apiKey);

  const { data, error } = await supabase
    .from("ai_providers")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const provider = mapRow(data as ProviderRow);

  if (input.defaultProvider) {
    const { updateCompanyAISettings } = await import("./ai-settings");
    await updateCompanyAISettings({ defaultProviderId: provider.id });
  }

  return provider;
}

export async function setDefaultProvider(id: string): Promise<AIProvider> {
  const supabase = createSupabaseAdmin();
  await supabase.from("ai_providers").update({ default_provider: false }).neq("id", id);

  const { data, error } = await supabase
    .from("ai_providers")
    .update({ default_provider: true, enabled: true })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const provider = mapRow(data as ProviderRow);

  const { updateCompanyAISettings } = await import("./ai-settings");
  await updateCompanyAISettings({ defaultProviderId: provider.id });

  return provider;
}

export async function deleteAIProvider(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("ai_providers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleAIProvider(id: string, enabled: boolean): Promise<AIProvider> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_providers")
    .update({ enabled })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as ProviderRow);
}

export function validateProviderInput(body: unknown): AIProviderInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const names = listSupportedProviders();
  const providerName = data.providerName as AIProviderName;

  if (!names.includes(providerName)) return null;

  return {
    providerName,
    apiKey: typeof data.apiKey === "string" ? data.apiKey : undefined,
    endpoint: typeof data.endpoint === "string" ? data.endpoint : undefined,
    model: typeof data.model === "string" ? data.model : undefined,
    enabled: typeof data.enabled === "boolean" ? data.enabled : undefined,
    defaultProvider: typeof data.defaultProvider === "boolean" ? data.defaultProvider : undefined,
  };
}
