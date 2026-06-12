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
        result = { forceClosed: true };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    for (const path of ["/sai/founder", "/sai/executive/ceo", "/sai/executive/coo", "/sai/execution"]) {
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
