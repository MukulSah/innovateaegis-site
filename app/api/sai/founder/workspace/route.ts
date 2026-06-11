import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import {
  createFounderWorkspaceItem,
  getFounderWorkspaceItems,
  type FounderWorkspaceSection,
} from "@/lib/sai/founder-workspace";

export async function GET(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const section = new URL(request.url).searchParams.get("section") as FounderWorkspaceSection | null;

  try {
    return NextResponse.json({ items: await getFounderWorkspaceItems(section ?? undefined) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load items" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.section || !body.title?.trim()) {
    return NextResponse.json({ error: "Section and title required" }, { status: 400 });
  }

  try {
    const item = await createFounderWorkspaceItem({
      section: body.section,
      title: body.title,
      content: body.content,
      tags: body.tags,
      createdBy: user.user.id,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create item" },
      { status: 500 },
    );
  }
}
