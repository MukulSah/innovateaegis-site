import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { getLaunchAiOptions } from "@/lib/sai/launch-ai-options";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const launch = await getLaunchAiOptions();
    return NextResponse.json(launch);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load AI options" },
      { status: 500 },
    );
  }
}
