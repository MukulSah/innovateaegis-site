import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { runIntelligenceEngine } from "@/lib/sai/agent-intelligence";

export async function POST() {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runIntelligenceEngine();
    revalidatePath("/sai/founder");
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Intelligence engine failed" },
      { status: 500 },
    );
  }
}
