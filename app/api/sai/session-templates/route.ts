import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { getSessionTemplates, getSessionTemplateBySlug } from "@/lib/sai/session-templates";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    if (slug) {
      const resolved = await getSessionTemplateBySlug(slug);
      if (!resolved) return NextResponse.json({ error: "Template not found" }, { status: 404 });
      return NextResponse.json(resolved);
    }

    const templates = await getSessionTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load templates" },
      { status: 500 },
    );
  }
}
