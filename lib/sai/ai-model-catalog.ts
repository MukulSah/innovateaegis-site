import type { AIProviderName } from "./types";

export type CatalogModel = {
  id: string;
  name: string;
  ownedBy?: string;
};

/** Providers that expose OpenAI-compatible GET /v1/models */
export const CATALOG_CAPABLE_PROVIDERS = new Set<AIProviderName>([
  "openai",
  "azure_openai",
  "nvidia_nim",
  "openrouter",
  "mistral",
  "ollama",
  "lm_studio",
]);

export function supportsModelCatalog(providerName: AIProviderName): boolean {
  return CATALOG_CAPABLE_PROVIDERS.has(providerName);
}

function authHeaders(providerName: AIProviderName, apiKey: string): Record<string, string> {
  if (providerName === "azure_openai") {
    return { "api-key": apiKey };
  }
  if (apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }
  return {};
}

/**
 * List models from an OpenAI-compatible /v1/models endpoint.
 * NVIDIA NIM: https://integrate.api.nvidia.com/v1/models
 */
export async function listCatalogModels(input: {
  providerName: AIProviderName;
  apiKey: string;
  endpoint: string;
  timeoutMs?: number;
}): Promise<CatalogModel[]> {
  if (!supportsModelCatalog(input.providerName)) {
    return [];
  }

  const base = input.endpoint.replace(/\/$/, "");
  const url = `${base}/models`;
  const timeoutMs = input.timeoutMs ?? 20_000;

  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(input.providerName, input.apiKey),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Model catalog error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ id?: string; name?: string; owned_by?: string }>;
  };

  const models = (data.data ?? [])
    .map((row) => ({
      id: String(row.id ?? row.name ?? "").trim(),
      name: String(row.name ?? row.id ?? "").trim(),
      ownedBy: row.owned_by ? String(row.owned_by) : undefined,
    }))
    .filter((m) => m.id.length > 0);

  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

/** Build alternate model list for retry rotation (primary excluded). */
export function buildModelAlternates(
  primaryModel: string,
  modelPool: string[],
  autoRotate: boolean,
  catalogModels?: string[],
): string[] {
  const seen = new Set<string>();
  const alternates: string[] = [];

  const add = (model: string) => {
    const id = model.trim();
    if (!id || id === primaryModel || seen.has(id)) return;
    seen.add(id);
    alternates.push(id);
  };

  for (const model of modelPool) add(model);

  if (autoRotate && catalogModels?.length) {
    for (const model of catalogModels) add(model);
  }

  return alternates;
}
