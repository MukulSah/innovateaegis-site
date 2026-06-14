import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { testAIConnection } from "@/lib/sai/ai-client";
import {
  formatProviderDiagnostics,
  resolveAIProviderForTest,
} from "@/lib/sai/ai-provider-resolver";
import type { AIProviderName } from "@/lib/sai/types";

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const providerId = typeof body.providerId === "string" ? body.providerId : "";
  const bodyApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const bodyEndpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const bodyModel = typeof body.model === "string" ? body.model.trim() : "";
  const bodyProviderName = body.providerName as AIProviderName | undefined;

  try {
    const resolved = await resolveAIProviderForTest({
      providerId: providerId || null,
      providerName: bodyProviderName,
      apiKey: bodyApiKey,
      endpoint: bodyEndpoint,
      model: bodyModel,
    });

    if (!resolved?.apiKey) {
      return NextResponse.json(
        {
          error:
            "No readable API key found. Paste your key in the form, or save the provider again after restarting the dev server.",
          diagnostics: formatProviderDiagnostics(resolved),
        },
        { status: 400 },
      );
    }

    const result = await testAIConnection({
      providerName: resolved.providerName,
      apiKey: resolved.apiKey,
      endpoint: resolved.endpoint,
      model: resolved.model,
    });

    return NextResponse.json({
      result: {
        ...result,
        diagnostics: formatProviderDiagnostics(resolved),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 },
    );
  }
}
