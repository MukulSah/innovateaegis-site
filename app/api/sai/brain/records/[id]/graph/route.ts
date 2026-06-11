import { NextResponse } from "next/server";
import { buildKnowledgeGraph } from "@/lib/sai/brain";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const depth = parseInt(searchParams.get("depth") ?? "2", 10);

  try {
    const graph = await buildKnowledgeGraph(id, depth);
    return NextResponse.json({ graph });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build graph" },
      { status: 500 },
    );
  }
}
