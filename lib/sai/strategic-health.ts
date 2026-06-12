import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { computeSessionHealth } from "./execution-health";

export type StrategicHealthSnapshot = {
  score: number;
  businessRisk: "low" | "medium" | "high" | "critical";
  timelineRisk: "low" | "medium" | "high" | "critical";
  goalAlignment: number;
  successMetricProbability: number;
  customerImpact: string;
  revenueImpact: string;
  currentProgress: number;
  expectedProgress: number;
  behindSchedule: boolean;
};

function riskFromGap(gap: number): StrategicHealthSnapshot["businessRisk"] {
  if (gap >= 35) return "critical";
  if (gap >= 25) return "high";
  if (gap >= 12) return "medium";
  return "low";
}

export async function computeStrategicHealth(sessionId: string): Promise<StrategicHealthSnapshot> {
  const supabase = createSupabaseAdmin();
  const [workflowRes, executionHealth] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("created_at, strategic_brief, session_status, current_step_index")
      .eq("id", sessionId)
      .maybeSingle(),
    computeSessionHealth(sessionId),
  ]);

  const wf = workflowRes.data;
  const brief = (wf?.strategic_brief as Record<string, unknown>) ?? {};
  const priority = String(brief.priority ?? "high").toLowerCase();

  const createdAt = wf?.created_at ? new Date(wf.created_at).getTime() : Date.now();
  const hoursElapsed = (Date.now() - createdAt) / (1000 * 60 * 60);
  const expectedProgress = Math.min(95, Math.round(hoursElapsed * 4));
  const currentProgress = Math.round(
    (executionHealth.completedSteps / Math.max(executionHealth.totalSteps, 1)) * 100,
  );
  const progressGap = Math.max(0, expectedProgress - currentProgress);
  const behindSchedule = progressGap >= 12;

  const timelineRisk = riskFromGap(progressGap);
  const businessRisk =
    executionHealth.score < 50 || wf?.session_status === "blocked"
      ? "high"
      : riskFromGap(progressGap);

  const priorityBoost = priority === "critical" ? -10 : priority === "high" ? -5 : 0;
  const successMetricProbability = Math.max(
    0,
    Math.min(100, executionHealth.score + priorityBoost - progressGap),
  );
  const goalAlignment = Math.max(0, Math.min(100, 100 - progressGap));

  const score = Math.round(
    (goalAlignment * 0.3 +
      successMetricProbability * 0.3 +
      executionHealth.score * 0.25 +
      (100 - progressGap * 2) * 0.15),
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    businessRisk,
    timelineRisk,
    goalAlignment,
    successMetricProbability,
    customerImpact: behindSchedule ? "Delivery delay may affect user outcomes" : "On track for user impact",
    revenueImpact: priority === "critical" || priority === "high" ? "Strategic priority initiative" : "Standard delivery",
    currentProgress,
    expectedProgress,
    behindSchedule,
  };
}
