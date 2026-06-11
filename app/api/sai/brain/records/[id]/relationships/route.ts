import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { createRelationship, getRecordRelationships } from "@/lib/sai/brain";
import type { RelationshipType } from "@/lib/sai/brain";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    return NextResponse.json({ relationships: await getRecordRelationships(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load relationships" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (typeof body.targetId !== "string") {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  try {
    const relationship = await createRelationship({
      sourceId: id,
      targetId: body.targetId,
      relationshipType: body.relationshipType as RelationshipType | undefined,
      label: body.label,
      createdBy: user.user.id,
    });
    revalidatePath("/sai/brain");
    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create relationship" },
      { status: 500 },
    );
  }
}
