import { getSessionExecutiveTimeline } from "./founder-timeline";
import { getSessionHandoffs } from "./coo-routing";
import { getWorkflowApprovals } from "./governance";
import { getSessionArtifacts } from "./session-artifacts";
import { getSessionTruth } from "./session-truth-engine";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type SessionWorkspacePayload = {
  truth: NonNullable<Awaited<ReturnType<typeof getSessionTruth>>>;
  progress: number;
  handoffs: Awaited<ReturnType<typeof getSessionHandoffs>>;
  pendingApprovals: Awaited<ReturnType<typeof getWorkflowApprovals>>;
  artifacts: {
    id: string;
    stepKey: string;
    artifactName: string | null;
    artifactType: string | null;
    createdAt: string;
    outputSummary: string;
  }[];
  executiveTimeline: Awaited<ReturnType<typeof getSessionExecutiveTimeline>>;
  analytics: {
    artifactCount: number;
    pendingApprovalCount: number;
    handoffCount: number;
    progress: number;
    executionHealth: number;
    strategicHealth: number;
    isComplete: boolean;
  };
  memory: { title: string; summary: string; memoryType: string; createdAt: string }[];
  ownership: Awaited<ReturnType<typeof import("./session-ownership").getSessionOwnership>>;
  dependencies: Awaited<ReturnType<typeof import("./session-dependencies").getSessionDependencies>>;
  intelligence: Awaited<ReturnType<typeof import("./session-intelligence").getSessionIntelligence>>;
  records: Awaited<ReturnType<typeof import("./company-records").getCompanyRecords>>;
  generatedAt: string;
};

export async function loadSessionWorkspacePayload(
  sessionId: string,
): Promise<SessionWorkspacePayload | null> {
  const [truth, handoffs, pendingApprovals, artifacts, executiveTimeline] = await Promise.all([
    getSessionTruth(sessionId),
    getSessionHandoffs(sessionId),
    getWorkflowApprovals({ workflowId: sessionId, status: "pending" }),
    getSessionArtifacts(sessionId),
    getSessionExecutiveTimeline(sessionId),
  ]);

  if (!truth) return null;

  const { getSessionOwnership } = await import("./session-ownership");
  const { getSessionDependencies } = await import("./session-dependencies");
  const { getSessionIntelligence } = await import("./session-intelligence");
  const { getCompanyRecords } = await import("./company-records");

  const [ownership, dependencies, intelligence, records] = await Promise.all([
    getSessionOwnership(sessionId),
    getSessionDependencies(sessionId),
    getSessionIntelligence(sessionId),
    getCompanyRecords({ sourceSessionId: sessionId, limit: 50 }),
  ]);

  const completedSteps = truth.timeline.filter((s) => s.status === "completed").length;
  const progress = truth.timeline.length
    ? Math.round((completedSteps / truth.timeline.length) * 100)
    : 0;

  const supabase = createSupabaseAdmin();
  const { data: projectMemory } = await supabase
    .from("project_memory")
    .select("title, summary, memory_type, created_at")
    .eq("source_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(20);

  const memory = (projectMemory ?? []).map((row) => ({
    title: row.title as string,
    summary: (row.summary as string) ?? "",
    memoryType: (row.memory_type as string) ?? "lesson",
    createdAt: row.created_at as string,
  }));

  return {
    truth,
    progress,
    handoffs,
    pendingApprovals,
    artifacts: artifacts.map((a) => ({
      id: a.id,
      stepKey: a.stepKey,
      artifactName: a.artifactName,
      artifactType: a.artifactType,
      createdAt: a.createdAt,
      outputSummary: a.outputSummary,
    })),
    executiveTimeline,
    analytics: {
      artifactCount: artifacts.length,
      pendingApprovalCount: pendingApprovals.length,
      handoffCount: handoffs.length,
      progress,
      executionHealth: truth.executionHealth,
      strategicHealth: truth.strategicHealth,
      isComplete: truth.isComplete,
    },
    memory,
    ownership,
    dependencies,
    intelligence,
    records,
    generatedAt: new Date().toISOString(),
  };
}
