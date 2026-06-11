import { NextResponse } from "next/server";
import {
  createFounderMemory,
  getFounderMemories,
} from "@/lib/sai/brain";
import { requireFounder } from "@/lib/sai/api-auth";

export async function GET(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;

  try {
    return NextResponse.json({ memories: await getFounderMemories({ category }) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load founder memories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (typeof body.title !== "string" || !body.title.trim() || typeof body.category !== "string") {
    return NextResponse.json({ error: "Title and category are required" }, { status: 400 });
  }

  try {
    const memory = await createFounderMemory({
      category: body.category,
      title: body.title,
      content: body.content,
      tags: body.tags,
      createdBy: user.user.id,
    });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create founder memory" },
      { status: 500 },
    );
  }
}
