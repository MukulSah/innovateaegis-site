import { NextResponse } from "next/server";
import { getBrainStats } from "@/lib/sai/brain";

export async function GET() {
  try {
    return NextResponse.json({ stats: await getBrainStats() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stats" },
      { status: 500 },
    );
  }
}
