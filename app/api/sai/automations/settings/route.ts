import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import {
  getCompanyAutomationSettings,
  updateCompanyAutomationSettings,
} from "@/lib/sai/automation-settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getCompanyAutomationSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    const settings = await updateCompanyAutomationSettings(body);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}
