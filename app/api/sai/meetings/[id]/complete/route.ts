import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { completeMeeting } from "@/lib/sai/meetings";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const meeting = await completeMeeting(id, {
      summary: typeof body.summary === "string" ? body.summary : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      discussion: typeof body.discussion === "string" ? body.discussion : undefined,
    });
    revalidatePath("/sai/memory");
    revalidatePath("/sai/founder");
    return NextResponse.json({ meeting });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete meeting" },
      { status: 500 },
    );
  }
}
