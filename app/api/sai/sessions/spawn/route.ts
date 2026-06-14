import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { spawnSession } from "@/lib/sai/session-spawn";
import type { SessionCreationMode } from "@/lib/sai/session-types";

const VALID_MODES = new Set<SessionCreationMode>([
  "instant",
  "scheduled",
  "recurring",
  "triggered",
]);

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const objective = typeof body.objective === "string" ? body.objective.trim() : "";
  const creationMode = (
    typeof body.creationMode === "string" ? body.creationMode : "instant"
  ) as SessionCreationMode;
  const templateSlug = typeof body.templateSlug === "string" ? body.templateSlug : undefined;
  const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt : null;
  const recurrenceRule = typeof body.recurrenceRule === "string" ? body.recurrenceRule : null;
  const triggerMetadata =
    body.triggerMetadata && typeof body.triggerMetadata === "object"
      ? (body.triggerMetadata as Record<string, unknown>)
      : undefined;

  if (!projectId || !objective) {
    return NextResponse.json({ error: "projectId and objective are required" }, { status: 400 });
  }

  if (!VALID_MODES.has(creationMode)) {
    return NextResponse.json({ error: "Invalid creation mode" }, { status: 400 });
  }

  if (creationMode === "scheduled" && !scheduledAt) {
    return NextResponse.json({ error: "scheduledAt is required for scheduled sessions" }, { status: 400 });
  }

  if (creationMode === "recurring" && !recurrenceRule) {
    return NextResponse.json({ error: "recurrenceRule is required for recurring sessions" }, { status: 400 });
  }

  try {
    const result = await spawnSession({
      projectId,
      objective,
      creationMode,
      templateSlug,
      sponsorUserId: user.user.id,
      scheduledAt: creationMode === "scheduled" ? scheduledAt : null,
      recurrenceRule: creationMode === "recurring" ? recurrenceRule : null,
      triggerMetadata:
        creationMode === "triggered"
          ? { ...triggerMetadata, armed: true, armedAt: new Date().toISOString() }
          : triggerMetadata,
      skipOrchestration: creationMode === "scheduled" || creationMode === "recurring" || creationMode === "triggered",
    });

    revalidatePath("/sai/sessions");
    revalidatePath("/sai/founder");
    revalidatePath("/sai/organization");
    return NextResponse.json({ ...result, sessionId: result.sessionId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to spawn session" },
      { status: 500 },
    );
  }
}
