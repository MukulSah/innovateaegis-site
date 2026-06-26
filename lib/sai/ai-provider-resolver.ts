import "server-only";

import { getDefaultEndpoint } from "./ai-provider-catalog";
import { getAgentAIConfig } from "./agent-ai-config";
import { getCompanyAISettings } from "./ai-settings";
import { getDefaultAIProvider, getProviderWithKey } from "./ai-providers";
import type { AIProviderName } from "./types";

export type AIProviderKeySource =
  | "database_default"
  | "database_settings"
  | "database_per_agent"
  | "database_fallback"
  | "form_override"
  | "none";

export type ResolvedAIProvider = {
  providerId: string | null;
  providerName: AIProviderName;
  apiKey: string;
  endpoint: string;
  model: string;
  modelPool: string[];
  autoRotateModels: boolean;
  enabled: boolean;
  keySource: AIProviderKeySource;
  keyReadable: boolean;
};

export type AIProviderResolution = {
  primary: ResolvedAIProvider | null;
  fallback: ResolvedAIProvider | null;
};

function toResolved(
  row: { provider: { id: string; providerName: AIProviderName; endpoint: string; model: string; modelPool?: string[]; autoRotateModels?: boolean; enabled: boolean }; apiKey: string },
  keySource: AIProviderKeySource,
): ResolvedAIProvider {
  const endpoint = row.provider.endpoint || getDefaultEndpoint(row.provider.providerName);
  return {
    providerId: row.provider.id,
    providerName: row.provider.providerName,
    apiKey: row.apiKey,
    endpoint,
    model: row.provider.model,
    modelPool: row.provider.modelPool ?? [],
    autoRotateModels: row.provider.autoRotateModels ?? false,
    enabled: row.provider.enabled,
    keySource,
    keyReadable: Boolean(row.apiKey),
  };
}

/** Single resolution path for runtime, test, and diagnostics. */
export async function resolveDefaultProviderConfig(): Promise<ResolvedAIProvider | null> {
  const settings = await getCompanyAISettings();
  if (settings.defaultProviderId) {
    const providerData = await getProviderWithKey(settings.defaultProviderId);
    if (providerData?.provider.enabled && providerData.apiKey) {
      return toResolved(providerData, "database_settings");
    }
  }
  const defaultProvider = await getDefaultAIProvider();
  if (defaultProvider?.apiKey) {
    return toResolved(defaultProvider, "database_default");
  }
  return null;
}

export async function resolveAIProviderForAgent(
  agentId: string,
): Promise<AIProviderResolution> {
  const [settings, agentConfig, defaultProvider] = await Promise.all([
    getCompanyAISettings(),
    getAgentAIConfig(agentId),
    getDefaultAIProvider(),
  ]);

  let primary: ResolvedAIProvider | null = null;

  if (settings.modelMode === "per_agent" && agentConfig?.enabled && agentConfig.providerId) {
    const providerData = await getProviderWithKey(agentConfig.providerId);
    if (providerData?.provider.enabled && providerData.apiKey) {
      primary = toResolved(providerData, "database_per_agent");
    }
  }

  if (!primary && settings.defaultProviderId) {
    const providerData = await getProviderWithKey(settings.defaultProviderId);
    if (providerData?.provider.enabled && providerData.apiKey) {
      primary = toResolved(providerData, "database_settings");
    }
  }

  if (!primary && defaultProvider?.apiKey) {
    primary = toResolved(defaultProvider, "database_default");
  }

  let fallback: ResolvedAIProvider | null = null;
  if (settings.fallbackProviderId) {
    const fallbackData = await getProviderWithKey(settings.fallbackProviderId);
    if (fallbackData?.provider.enabled && fallbackData.apiKey) {
      fallback = toResolved(fallbackData, "database_fallback");
      if (
        primary &&
        fallback.providerName === primary.providerName &&
        fallback.model === primary.model
      ) {
        fallback = null;
      }
    }
  }

  return { primary, fallback };
}

export async function resolveAIProviderForTest(input: {
  providerId?: string | null;
  providerName?: AIProviderName;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}): Promise<ResolvedAIProvider | null> {
  const bodyKey = input.apiKey?.trim();
  if (bodyKey && bodyKey !== "••••••••••••") {
    if (!input.providerName || !input.model) return null;
    return {
      providerId: input.providerId ?? null,
      providerName: input.providerName,
      apiKey: bodyKey,
      endpoint: input.endpoint?.trim() || getDefaultEndpoint(input.providerName),
      model: input.model.trim(),
      modelPool: [],
      autoRotateModels: false,
      enabled: true,
      keySource: "form_override",
      keyReadable: true,
    };
  }

  if (input.providerId) {
    const stored = await getProviderWithKey(input.providerId);
    if (stored?.apiKey) {
      return {
        ...toResolved(stored, "database_default"),
        endpoint: input.endpoint?.trim() || stored.provider.endpoint || getDefaultEndpoint(stored.provider.providerName),
        model: input.model?.trim() || stored.provider.model,
      };
    }
  }

  const defaultProvider = await getDefaultAIProvider();
  if (defaultProvider?.apiKey) {
    return {
      ...toResolved(defaultProvider, "database_default"),
      endpoint:
        input.endpoint?.trim() ||
        defaultProvider.provider.endpoint ||
        getDefaultEndpoint(defaultProvider.provider.providerName),
      model: input.model?.trim() || defaultProvider.provider.model,
    };
  }

  return null;
}

export function formatProviderDiagnostics(resolved: ResolvedAIProvider | null): string {
  if (!resolved) {
    return JSON.stringify({ keySource: "none", keyReadable: false });
  }
  return JSON.stringify({
    providerId: resolved.providerId,
    providerName: resolved.providerName,
    model: resolved.model,
    keySource: resolved.keySource,
    keyReadable: resolved.keyReadable,
    endpoint: resolved.endpoint,
  });
}
