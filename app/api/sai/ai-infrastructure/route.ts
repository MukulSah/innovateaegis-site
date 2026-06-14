import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { getAIInfrastructureStatus, processDueQueueEntries } from "@/lib/sai/recovery-queue";

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processDueQueueEntries();
    const status = await getAIInfrastructureStatus();
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load infrastructure status" },
      { status: 500 },
    );
  }
}

export async function POST() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processDueQueueEntries();
    return NextResponse.json({ processed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Queue processing failed" },
      { status: 500 },
    );
  }
}
