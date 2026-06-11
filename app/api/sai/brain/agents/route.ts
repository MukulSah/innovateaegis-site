import { NextResponse } from "next/server";
import { getAgentMemoryContainers } from "@/lib/sai/brain";

export async function GET() {
  try {
    return NextResponse.json({ containers: await getAgentMemoryContainers() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load agent containers" },
      { status: 500 },
    );
  }
}
