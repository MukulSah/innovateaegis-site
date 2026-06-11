import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import {
  createEmployee,
  getEmployees,
  validateEmployeeInput,
} from "@/lib/sai/employees";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const REVALIDATE = ["/sai", "/sai/employees", "/sai/control"];

function revalidate() {
  for (const path of REVALIDATE) revalidatePath(path);
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  try {
    return NextResponse.json({ employees: await getEmployees() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load employees" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const input = validateEmployeeInput(await request.json());
  if (!input) {
    return NextResponse.json({ error: "Invalid employee data" }, { status: 400 });
  }

  try {
    const employee = await createEmployee(input);
    revalidate();
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create employee" },
      { status: 500 },
    );
  }
}
