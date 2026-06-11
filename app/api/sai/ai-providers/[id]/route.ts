import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  deleteAIProvider,
  setDefaultProvider,
  toggleAIProvider,
  upsertAIProvider,
  validateProviderInput,
} from "@/lib/sai/ai-providers";

type Ctx = { params: Promise<{ id: string }> };

function revalidate() {
  revalidatePath("/sai/settings/ai");
  revalidatePath("/sai");
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "set_default") {
      const provider = await setDefaultProvider(id);
      revalidate();
      return NextResponse.json({ provider });
    }

    if (body.action === "toggle") {
      const provider = await toggleAIProvider(id, body.enabled !== false);
      revalidate();
      return NextResponse.json({ provider });
    }

    const input = validateProviderInput(body);
    if (!input) {
      return NextResponse.json({ error: "Invalid provider data" }, { status: 400 });
    }

    const provider = await upsertAIProvider(input, id);
    revalidate();
    return NextResponse.json({ provider });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update provider" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteAIProvider(id);
    revalidate();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete provider" },
      { status: 500 },
    );
  }
}
