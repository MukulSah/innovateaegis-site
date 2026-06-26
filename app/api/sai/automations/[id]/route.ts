import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import {
  deleteAgentAutomation,
  getAgentAutomationById,
  updateAgentAutomation,
} from "@/lib/sai/agent-automations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const automation = await getAgentAutomationById(id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ automation });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const automation = await updateAgentAutomation(id, body);
    return NextResponse.json({ automation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteAgentAutomation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}
