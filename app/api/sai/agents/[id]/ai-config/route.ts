import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { getAgentAIConfig, upsertAgentAIConfig, validateAgentAIConfigInput } from "@/lib/sai/agent-ai-config";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const config = await getAgentAIConfig(id);
    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load config" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const input = validateAgentAIConfigInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid config" }, { status: 400 });
  }

  try {
    const config = await upsertAgentAIConfig(id, input);
    revalidatePath(`/sai/agents/${id}/workspace`);
    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save config" },
      { status: 500 },
    );
  }
}
