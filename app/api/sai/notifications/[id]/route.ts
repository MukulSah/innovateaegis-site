import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { markNotificationRead } from "@/lib/sai/notifications";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const notification = await markNotificationRead(id);
    revalidatePath("/sai/inbox");
    revalidatePath("/sai");
    return NextResponse.json({ notification });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update notification" },
      { status: 500 },
    );
  }
}
