import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { listCatalogModels, supportsModelCatalog } from "@/lib/sai/ai-model-catalog";
import { resolveAIProviderForTest } from "@/lib/sai/ai-provider-resolver";
import type { AIProviderName } from "@/lib/sai/types";

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const providerId = typeof body.providerId === "string" ? body.providerId : "";
  const bodyApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const bodyEndpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const bodyProviderName = body.providerName as AIProviderName | undefined;

  try {
    const resolved = await resolveAIProviderForTest({
      providerId: providerId || null,
      providerName: bodyProviderName,
      apiKey: bodyApiKey,
      endpoint: bodyEndpoint,
      model: typeof body.model === "string" ? body.model : undefined,
    });

    if (!resolved?.apiKey) {
      return NextResponse.json(
        {
          error:
            "No readable API key found. Paste your NVIDIA NIM key (nvapi-...) in the form, or save the provider first.",
        },
        { status: 400 },
      );
    }

    if (!supportsModelCatalog(resolved.providerName)) {
      return NextResponse.json(
        { error: `${resolved.providerName} does not expose a model catalog API` },
        { status: 400 },
      );
    }

    const models = await listCatalogModels({
      providerName: resolved.providerName,
      apiKey: resolved.apiKey,
      endpoint: resolved.endpoint,
    });

    return NextResponse.json({
      provider: resolved.providerName,
      endpoint: resolved.endpoint,
      count: models.length,
      models,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load model catalog" },
      { status: 500 },
    );
  }
}
