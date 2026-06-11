import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { deleteBrainDomain, getBrainDomainById, updateBrainDomain } from "@/lib/sai/brain";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const domain = await getBrainDomainById(id);
    if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ domain });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load domain" },
      { status: 500 },
    );
  }
}

export async function PATCH(_request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const domain = await getBrainDomainById(id);
  if (domain?.isLocked) {
    return NextResponse.json({ error: "Locked layers cannot be modified" }, { status: 403 });
  }
  try {
    const updated = await updateBrainDomain(id, await _request.json());
    revalidatePath("/sai/brain");
    return NextResponse.json({ domain: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update domain" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteBrainDomain(id);
    revalidatePath("/sai/brain");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete domain" },
      { status: 500 },
    );
  }
}
