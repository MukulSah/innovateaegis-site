import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { addAgentMemory, getAgentMemory } from "@/lib/sai/agents";
import type { AgentMemoryType } from "@/lib/sai/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    return NextResponse.json({ memory: await getAgentMemory(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load memory" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const types: AgentMemoryType[] = [
    "task", "decision", "lesson", "knowledge", "performance", "project",
  ];

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const memoryType = body.memoryType as AgentMemoryType;

  if (!title || !types.includes(memoryType)) {
    return NextResponse.json({ error: "Invalid memory data" }, { status: 400 });
  }

  try {
    const memory = await addAgentMemory(id, {
      memoryType,
      title,
      summary: typeof body.summary === "string" ? body.summary : "",
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      taskId: typeof body.taskId === "string" ? body.taskId : null,
    });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add memory" },
      { status: 500 },
    );
  }
}
