import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { getCompanyAISettings, updateCompanyAISettings } from "@/lib/sai/ai-settings";
import type { AIModelMode } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ settings: await getCompanyAISettings() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const modes: AIModelMode[] = ["single", "per_agent"];
  const modelMode = modes.includes(body.modelMode) ? body.modelMode : undefined;

  try {
    const settings = await updateCompanyAISettings({
      modelMode,
      defaultProviderId: typeof body.defaultProviderId === "string" ? body.defaultProviderId : undefined,
    });
    revalidatePath("/sai/settings/ai");
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 },
    );
  }
}
