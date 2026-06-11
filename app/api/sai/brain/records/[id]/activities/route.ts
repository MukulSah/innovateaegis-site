import { NextResponse } from "next/server";
import { getMemoryActivities } from "@/lib/sai/brain";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    return NextResponse.json({ activities: await getMemoryActivities(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load activities" },
      { status: 500 },
    );
  }
}
