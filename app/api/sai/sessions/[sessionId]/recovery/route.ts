import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireFounder } from "@/lib/sai/api-auth";
import {
  analyzeSessionRecovery,
  approveSessionClose,
  forceCloseSession,
  recoverSession,
  requestCooStallReview,
  requestSessionClose,
} from "@/lib/sai/session-recovery";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  try {
    const recovery = await analyzeSessionRecovery(sessionId);
    if (!recovery) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ recovery });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load recovery state" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const body = await request.json();
  const action = typeof body.action === "string" ? body.action : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const closeRequestId = typeof body.closeRequestId === "string" ? body.closeRequestId : "";

  const actor = { userId: user.user.id, name: displayName(user.profile) };

  try {
    let result: unknown;

    switch (action) {
      case "reconcile_state": {
        const { reconcileSessionState } = await import("@/lib/sai/session-state-engine");
        const { triggerStepExecution } = await import("@/lib/sai/step-execution");
        result = await reconcileSessionState(sessionId);
        if ((result as { repaired?: boolean }).repaired) {
          await triggerStepExecution(sessionId).catch(() => {});
        }
        break;
      }
      case "resume":
        result = await recoverSession(sessionId);
        break;
      case "request_review":
        result = await requestCooStallReview(sessionId);
        break;
      case "request_close":
        if (!reason) {
          return NextResponse.json({ error: "reason is required" }, { status: 400 });
        }
        result = await requestSessionClose(sessionId, reason, actor);
        break;
      case "approve_close":
        if (!closeRequestId) {
          return NextResponse.json({ error: "closeRequestId is required" }, { status: 400 });
        }
        await approveSessionClose(closeRequestId, actor);
        result = { approved: true };
        break;
      case "force_close":
        if (!reason) {
          return NextResponse.json({ error: "reason is required" }, { status: 400 });
        }
        await forceCloseSession(sessionId, reason, actor);
        result = { forceClosed: true, reason };
        break;
      case "finalize_session": {
        const { finalizeSession } = await import("@/lib/sai/session-finalization-engine");
        result = await finalizeSession(sessionId);
        break;
      }
      case "force_finalize": {
        const { forceFinalizeSession } = await import("@/lib/sai/session-finalization-engine");
        result = await forceFinalizeSession(sessionId, displayName(user.profile));
        break;
      }
      case "founder_acknowledge": {
        const { founderAcknowledgeAndCompleteSession } = await import(
          "@/lib/sai/session-finalization-engine"
        );
        const note =
          typeof body.note === "string" && body.note.trim()
            ? body.note.trim()
            : "Founder acknowledged session outcome";
        result = await founderAcknowledgeAndCompleteSession(
          sessionId,
          displayName(user.profile),
          note,
        );
        break;
      }
      case "retry_queue": {
        const { retryExecution } = await import("@/lib/sai/recovery-queue");
        const queueId = typeof body.queueId === "string" ? body.queueId : "";
        if (!queueId) {
          return NextResponse.json({ error: "queueId is required" }, { status: 400 });
        }
        result = await retryExecution(queueId);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    for (const path of ["/sai/founder", "/sai/sessions", "/sai/executive/ceo", "/sai/executive/coo", "/sai/execution"]) {
      revalidatePath(path);
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recovery action failed" },
      { status: 500 },
    );
  }
}
