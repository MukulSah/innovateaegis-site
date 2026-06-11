import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  deleteAgent,
  getAgentById,
  setAgentStatus,
  updateAgent,
  validateAgentInput,
} from "@/lib/sai/agents";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

function revalidate() {
  for (const path of ["/sai", "/sai/agents", "/sai/control", "/sai/tasks"]) {
    revalidatePath(path);
  }
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const agent = await getAgentById(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load agent" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();

  if (body.action === "disable") {
    try {
      const agent = await setAgentStatus(id, "disabled");
      revalidate();
      return NextResponse.json({ agent });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to disable agent" },
        { status: 500 },
      );
    }
  }

  if (body.action === "enable") {
    try {
      const agent = await setAgentStatus(id, "active");
      revalidate();
      return NextResponse.json({ agent });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to enable agent" },
        { status: 500 },
      );
    }
  }

  if (body.action === "pause") {
    try {
      const agent = await setAgentStatus(id, "idle");
      revalidate();
      return NextResponse.json({ agent });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to pause agent" },
        { status: 500 },
      );
    }
  }

  const input = validateAgentInput(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid agent data" }, { status: 400 });
  }

  try {
    const agent = await updateAgent(id, input);
    revalidate();
    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update agent" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const { id } = await params;
  try {
    await deleteAgent(id);
    revalidate();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete agent" },
      { status: 500 },
    );
  }
}
