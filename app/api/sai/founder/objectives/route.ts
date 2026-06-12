import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireFounder } from "@/lib/sai/api-auth";
import {
  FounderObjectiveStepError,
  submitFounderObjective,
} from "@/lib/sai/founder-objectives";
import { getProjects } from "@/lib/sai/projects";

export async function GET() {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const projects = await getProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const objective = typeof body.objective === "string" ? body.objective.trim() : "";

  if (!projectId || !objective) {
    return NextResponse.json({ error: "projectId and objective are required" }, { status: 400 });
  }

  const supersedeStalled = body.supersedeStalled === true;

  try {
    if (supersedeStalled) {
      const { assertCanStartNewSession } = await import("@/lib/sai/session-recovery");
      await assertCanStartNewSession(projectId, { supersedeStalled: true });
    }
    const result = await submitFounderObjective(projectId, objective, {
      userId: user.user.id,
      name: displayName(user.profile),
    });
    for (const path of ["/sai/founder", "/sai/approvals", "/sai/execution", `/sai/projects/${projectId}`]) {
      revalidatePath(path);
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof FounderObjectiveStepError) {
      console.error("CEO TURN FAILED", { step: error.step, message: error.message, cause: error.cause });
      return NextResponse.json(
        { step: error.step, error: error.message },
        { status: 500 },
      );
    }
    console.error("CEO TURN FAILED", error);
    return NextResponse.json(
      { step: "unknown", error: error instanceof Error ? error.message : "Failed to submit objective" },
      { status: 500 },
    );
  }
}
