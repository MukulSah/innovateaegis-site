import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { testAIConnection } from "@/lib/sai/ai-client";
import { getProviderWithKey } from "@/lib/sai/ai-providers";
import type { AIProviderName } from "@/lib/sai/types";

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const providerId = typeof body.providerId === "string" ? body.providerId : "";

  try {
    if (providerId) {
      const stored = await getProviderWithKey(providerId);
      if (!stored) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      }

      const result = await testAIConnection({
        providerName: stored.provider.providerName,
        apiKey: stored.apiKey,
        endpoint: stored.provider.endpoint,
        model: stored.provider.model,
      });

      return NextResponse.json({ result });
    }

    const providerName = body.providerName as AIProviderName;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    const model = typeof body.model === "string" ? body.model : "";

    if (!providerName || !apiKey || !model) {
      return NextResponse.json({ error: "providerName, apiKey, and model required" }, { status: 400 });
    }

    const result = await testAIConnection({ providerName, apiKey, endpoint, model });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 },
    );
  }
}
