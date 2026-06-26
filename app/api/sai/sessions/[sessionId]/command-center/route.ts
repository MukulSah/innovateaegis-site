import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/sai/api-auth";
import { getSessionHandoffs } from "@/lib/sai/coo-routing";
import { getWorkflowApprovals } from "@/lib/sai/governance";
import { analyzeSessionRecovery } from "@/lib/sai/session-recovery";
import { getSessionArtifacts } from "@/lib/sai/session-artifacts";
import { getSessionTruth } from "@/lib/sai/session-truth-engine";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    const { processDueQueueEntries } = await import("@/lib/sai/recovery-queue");
    const { tickAutonomousSessions } = await import("@/lib/sai/session-execution-driver");
    await processDueQueueEntries().catch(() => {});
    await tickAutonomousSessions().catch(() => {});

    const [truth, handoffs, pendingApprovals, approvalHistory, artifacts, recovery] =
      await Promise.all([
        getSessionTruth(sessionId),
        getSessionHandoffs(sessionId),
        getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
        getWorkflowApprovals({ workflowId: sessionId }),
        getSessionArtifacts(sessionId),
        analyzeSessionRecovery(sessionId),
      ]);

    if (!truth) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const completedSteps = truth.timeline.filter((s) => s.status === "completed").length;
    const totalSteps = truth.timeline.length;
    const progress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const needsFinalization = truth.knowledgeArchiveExists && !truth.isComplete;

    const recommendedActions: {
      id: string;
      label: string;
      action: string;
      priority: "critical" | "high" | "medium";
      reason: string;
    }[] = [];

    if (needsFinalization) {
      recommendedActions.push({
        id: "finalize",
        label: "Run Finalization Engine",
        action: "finalize_session",
        priority: "critical",
        reason:
          truth.finalizationBlockedReason ??
          "Knowledge archive exists but session was never closed.",
      });
    }
    if (truth.queueActive) {
      recommendedActions.push({
        id: "queue",
        label: "Waiting for AI capacity",
        action: "retry_queue",
        priority: "high",
        reason: truth.queueMessage ?? "Session queued for provider retry.",
      });
    }
    if (recovery?.canResume && !truth.isComplete) {
      recommendedActions.push({
        id: "resume",
        label: "Resume Session",
        action: "resume",
        priority: "medium",
        reason: recovery.recommendedAction,
      });
    }
    if (pendingApprovals.length > 0) {
      recommendedActions.push({
        id: "approvals",
        label: `${pendingApprovals.length} approval(s) blocking progress`,
        action: "view_approvals",
        priority: "high",
        reason: "Founder or governance approval required before agents continue.",
      });
    }

    return NextResponse.json({
      truth,
      progress,
      handoffs,
      pendingApprovals,
      approvalHistory: approvalHistory.slice(0, 20),
      artifacts: artifacts.map((a) => ({
        id: a.id,
        stepKey: a.stepKey,
        artifactName: a.artifactName,
        artifactType: a.artifactType,
        createdAt: a.createdAt,
      })),
      recovery,
      needsFinalization,
      recommendedActions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session command center" },
      { status: 500 },
    );
  }
}
