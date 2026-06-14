import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { evaluateExecutionReadiness, runCooExecutionReadinessReview } from "@/lib/sai/execution-readiness";
import { hasExecutionBeenReleased, releaseExecution } from "@/lib/sai/execution-release";
import { getActiveSession } from "@/lib/sai/session-manager";
import { findAgentForRole, getAgents } from "@/lib/sai/agents";
import { updateSessionFields } from "@/lib/sai/session-manager";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const active = await getActiveSession(projectId);
  try {
    const readiness = await evaluateExecutionReadiness(projectId, active?.id);
    return NextResponse.json({ readiness, sessionId: active?.id ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate readiness" },
      { status: 500 },
    );
  }
}

/** Re-run COO readiness review and execution release when READY. */
export async function POST(_request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const active = await getActiveSession(projectId);
  if (!active) {
    return NextResponse.json({ error: "No active session for project" }, { status: 404 });
  }

  const agents = await getAgents();
  const coo = findAgentForRole(agents, ["COO", "Chief Operating"]);
  if (!coo) return NextResponse.json({ error: "COO not found" }, { status: 500 });

  try {
    const readiness = await runCooExecutionReadinessReview({
      sessionId: active.id,
      projectId,
      cooAgentId: coo.id,
    });

    let release = null;
    if (readiness.ready) {
      if (await hasExecutionBeenReleased(active.id)) {
        release = { sessionId: active.id, released: true };
      } else {
        release = await releaseExecution({
          sessionId: active.id,
          projectId,
          cooAgentId: coo.id,
        });
      }
    }

    await updateSessionFields(active.id, {
      ...(readiness.ready ? {} : { sessionStatus: "planning" }),
      strategicBrief: {
        ...(active.strategicBrief as Record<string, unknown>),
        executionReadiness: {
          status: readiness.status,
          ready: readiness.ready,
          gaps: readiness.gaps,
          checkedAt: new Date().toISOString(),
        },
      },
    });

    revalidatePath("/sai/founder");
    revalidatePath("/sai/resources");
    revalidatePath("/sai/executive/coo");
    return NextResponse.json({ readiness, release });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Readiness review failed" },
      { status: 500 },
    );
  }
}
