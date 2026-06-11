import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  deleteEmployee,
  updateEmployee,
  validateEmployeeInput,
} from "@/lib/sai/employees";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

function revalidate() {
  for (const path of ["/sai", "/sai/employees", "/sai/control"]) {
    revalidatePath(path);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const input = validateEmployeeInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid employee data" }, { status: 400 });
  }
  try {
    const employee = await updateEmployee(id, input);
    revalidate();
    return NextResponse.json({ employee });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update employee" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const { id } = await params;
  try {
    await deleteEmployee(id);
    revalidate();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete employee" },
      { status: 500 },
    );
  }
}
