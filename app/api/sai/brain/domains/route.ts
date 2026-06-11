import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import {
  createBrainDomain,
  getBrainDomains,
  type DomainInput,
} from "@/lib/sai/brain";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate() {
  revalidatePath("/sai/brain");
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    return NextResponse.json({ domains: await getBrainDomains() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load domains" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Company Brain structure is locked. Layers cannot be added." },
    { status: 403 },
  );
}
