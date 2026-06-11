import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import {
  archiveMemoryRecord,
  deleteMemoryRecord,
  getMemoryRecordById,
  mergeMemoryRecords,
  moveMemoryRecord,
  restoreMemoryRecord,
  updateMemoryRecord,
  validateRecordInput,
} from "@/lib/sai/brain";

type Params = { params: Promise<{ id: string }> };

function revalidate() {
  revalidatePath("/sai/brain");
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const record = await getMemoryRecordById(id);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load record" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "archive") {
      const record = await archiveMemoryRecord(id, user.user.id);
      revalidate();
      return NextResponse.json({ record });
    }
    if (body.action === "restore") {
      const record = await restoreMemoryRecord(id, user.user.id);
      revalidate();
      return NextResponse.json({ record });
    }
    if (body.action === "move") {
      const record = await moveMemoryRecord(
        id,
        {
          domainId: body.domainId,
          categoryId: body.categoryId,
          parentId: body.parentId,
        },
        user.user.id,
      );
      revalidate();
      return NextResponse.json({ record });
    }
    if (body.action === "merge" && typeof body.targetId === "string") {
      const record = await mergeMemoryRecords(id, body.targetId, user.user.id);
      revalidate();
      return NextResponse.json({ record });
    }

    if (body.sectionSlug && body.sectionFields) {
      const validation = validateRecordInput({ ...body, domainId: body.domainId ?? "x" });
      if (!validation.ok) {
        return NextResponse.json(
          { error: "Validation failed", errors: validation.errors },
          { status: 400 },
        );
      }
      const record = await updateMemoryRecord(id, validation.input, user.user.id);
      revalidate();
      return NextResponse.json({ record });
    }

    const record = await updateMemoryRecord(
      id,
      {
        title: body.title,
        description: body.description,
        content: body.content,
        domainId: body.domainId,
        categoryId: body.categoryId,
        parentId: body.parentId,
        permissionLevel: body.permissionLevel,
        tags: body.tags,
        aiSummary: body.aiSummary,
        status: body.status,
        ownerAgentId: body.ownerAgentId,
        ownerAgentName: body.ownerAgentName,
        department: body.department,
        approvedBy: body.approvedBy,
        effectiveDate: body.effectiveDate,
        visibility: body.visibility,
      },
      user.user.id,
    );
    revalidate();
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update record" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteMemoryRecord(id, user.user.id);
    revalidate();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete record" },
      { status: 500 },
    );
  }
}
