import { NextResponse } from "next/server";
import { searchBrainMemory, type BrainSearchFilters } from "@/lib/sai/brain";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const filters: BrainSearchFilters = {};

  const q = searchParams.get("q");
  if (q) filters.query = q;
  const domainSlug = searchParams.get("domainSlug");
  if (domainSlug) filters.domainSlug = domainSlug;
  const categoryId = searchParams.get("categoryId");
  if (categoryId) filters.categoryId = categoryId;
  const tag = searchParams.get("tag");
  if (tag) filters.tag = tag;
  const ownerId = searchParams.get("ownerId");
  if (ownerId) filters.ownerId = ownerId;
  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) filters.dateFrom = dateFrom;
  const dateTo = searchParams.get("dateTo");
  if (dateTo) filters.dateTo = dateTo;
  const relatedToId = searchParams.get("relatedToId");
  if (relatedToId) filters.relatedToId = relatedToId;
  const limit = searchParams.get("limit");
  if (limit) filters.limit = parseInt(limit, 10);

  try {
    const results = await searchBrainMemory(filters);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}
