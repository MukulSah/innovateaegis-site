import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { createAgent, getAgents, validateAgentInput } from "@/lib/sai/agents";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function revalidate() {
  for (const path of ["/sai", "/sai/agents", "/sai/control"]) {
    revalidatePath(path);
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ agents: await getAgents() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load agents" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const input = validateAgentInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid agent data" }, { status: 400 });
  }
  try {
    const agent = await createAgent(input);
    revalidate();
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create agent" },
      { status: 500 },
    );
  }
}
