import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { generateAgentIntelligence } from "@/lib/sai/agent-intelligence";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;

  try {
    const records = await generateAgentIntelligence(agentId);
    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate agent intelligence" },
      { status: 500 },
    );
  }
}
