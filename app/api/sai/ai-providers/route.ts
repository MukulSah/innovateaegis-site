import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { getAIProviders, upsertAIProvider, validateProviderInput } from "@/lib/sai/ai-providers";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ providers: await getAIProviders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load providers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const input = validateProviderInput(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid provider data" }, { status: 400 });
  }

  try {
    const provider = await upsertAIProvider(input);
    revalidatePath("/sai/settings/ai");
    revalidatePath("/sai");
    return NextResponse.json({ provider }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save provider" },
      { status: 500 },
    );
  }
}
