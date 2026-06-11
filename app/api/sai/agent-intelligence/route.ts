import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { getIntelligenceForFounder } from "@/lib/sai/agent-intelligence";

export async function GET() {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const records = await getIntelligenceForFounder();
    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load intelligence" },
      { status: 500 },
    );
  }
}
