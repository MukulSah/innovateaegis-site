import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import {
  createMemoryRecord,
  getMemoryRecords,
  validateRecordInput,
  type RecordFilters,
} from "@/lib/sai/brain";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate() {
  revalidatePath("/sai/brain");
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const filters: RecordFilters = {};

  const domainId = searchParams.get("domainId");
  if (domainId) filters.domainId = domainId;
  const domainSlug = searchParams.get("domainSlug");
  if (domainSlug) filters.domainSlug = domainSlug;
  const categoryId = searchParams.get("categoryId");
  if (categoryId) filters.categoryId = categoryId;
  const parentId = searchParams.get("parentId");
  if (parentId === "null") filters.parentId = null;
  else if (parentId) filters.parentId = parentId;
  const search = searchParams.get("search");
  if (search) filters.search = search;
  const tag = searchParams.get("tag");
  if (tag) filters.tag = tag;
  const status = searchParams.get("status");
  if (status === "active" || status === "archived" || status === "merged") {
    filters.status = status;
  }
  if (searchParams.get("includeArchived") === "true") filters.includeArchived = true;

  try {
    return NextResponse.json({ records: await getMemoryRecords(filters) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load records" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const validation = validateRecordInput(await request.json());
  if (!validation.ok) {
    return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
  }

  try {
    const record = await createMemoryRecord(
      { ...validation.input, createdBy: user.user.id },
      user.user.id,
    );
    revalidate();
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create record" },
      { status: 500 },
    );
  }
}
