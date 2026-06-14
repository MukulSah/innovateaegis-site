import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/sai/api-auth";
import { addSessionDependency, getSessionDependencies } from "@/lib/sai/session-dependencies";
import type { SessionDependencyType } from "@/lib/sai/session-types";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    const dependencies = await getSessionDependencies(sessionId);
    return NextResponse.json(dependencies);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dependencies" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const dependsOnSessionId = typeof body.dependsOnSessionId === "string" ? body.dependsOnSessionId : "";
  const dependencyType = (body.dependencyType ?? "depends_on") as SessionDependencyType;
  const reason = typeof body.reason === "string" ? body.reason : "";

  if (!dependsOnSessionId) {
    return NextResponse.json({ error: "dependsOnSessionId is required" }, { status: 400 });
  }

  try {
    const dependency = await addSessionDependency({
      sessionId,
      dependsOnSessionId,
      dependencyType,
      reason,
    });
    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add dependency" },
      { status: 500 },
    );
  }
}
