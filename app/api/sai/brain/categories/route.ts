import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { createBrainCategory, getBrainCategories, type CategoryInput } from "@/lib/sai/brain";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domainId") ?? undefined;

  try {
    return NextResponse.json({ categories: await getBrainCategories(domainId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load categories" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Company Brain structure is locked. Sections cannot be added." },
    { status: 403 },
  );
}
