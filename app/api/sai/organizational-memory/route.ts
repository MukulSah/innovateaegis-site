import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import {
  createOrganizationalMemory,
  getOrganizationalMemory,
  type OrgMemoryFilters,
  type OrgMemoryImportance,
  type OrgMemoryNavSection,
  type OrgMemorySource,
  type OrgMemoryType,
} from "@/lib/sai/organizational-memory";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const filters: OrgMemoryFilters = {};

  const navSection = searchParams.get("navSection");
  if (navSection) filters.navSection = navSection as OrgMemoryNavSection;
  const memoryType = searchParams.get("memoryType");
  if (memoryType) filters.memoryType = memoryType as OrgMemoryType;
  const importance = searchParams.get("importance");
  if (importance) filters.importance = importance as OrgMemoryImportance;
  const source = searchParams.get("source");
  if (source) filters.source = source as OrgMemorySource;
  const storyKey = searchParams.get("storyKey");
  if (storyKey) filters.storyKey = storyKey;
  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) filters.dateFrom = dateFrom;
  const dateTo = searchParams.get("dateTo");
  if (dateTo) filters.dateTo = dateTo;
  const agentId = searchParams.get("agentId");
  if (agentId) filters.agentId = agentId;
  const projectId = searchParams.get("projectId");
  if (projectId) filters.projectId = projectId;
  const search = searchParams.get("search");
  if (search) filters.search = search;
  const tag = searchParams.get("tag");
  if (tag) filters.tag = tag;
  const limit = searchParams.get("limit");
  if (limit) filters.limit = parseInt(limit, 10);

  try {
    return NextResponse.json({ memories: await getOrganizationalMemory(filters) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load memory" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  try {
    const memory = await createOrganizationalMemory({
      title: body.title,
      description: body.description,
      content: body.content,
      memoryType: body.memoryType ?? "event",
      source: body.source ?? "manual",
      importance: body.importance,
      outcome: body.outcome,
      participantNames: body.participantNames,
      createdBy: user.profile.fullName || "Founder",
      relatedAgentId: body.relatedAgentId,
      relatedProjectId: body.relatedProjectId,
      tags: body.tags,
    });
    revalidatePath("/sai/memory");
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create memory" },
      { status: 500 },
    );
  }
}
