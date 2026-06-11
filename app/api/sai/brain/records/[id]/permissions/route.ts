import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { getRecordPermissions, setRecordPermissions } from "@/lib/sai/brain";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    return NextResponse.json({ permissions: await getRecordPermissions(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load permissions" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];

  try {
    const result = await setRecordPermissions(id, permissions, user.user.id);
    return NextResponse.json({ permissions: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update permissions" },
      { status: 500 },
    );
  }
}
