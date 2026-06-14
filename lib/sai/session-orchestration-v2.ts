import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionTemplateBySlug } from "./session-templates";
import { isSessionBlockedByDependencies } from "./session-dependencies";

/**
 * Phase 10 — template-aware orchestration helpers.
 * Used by orchestration.ts for v2 execution runtime.
 */

export async function getTemplateStagesForSession(sessionId: string): Promise<
  { stageKey: string; label: string; stageOrder: number; sdlcStepKey: string | null }[]
> {
  const supabase = createSupabaseAdmin();
  const { data: wf } = await supabase
    .from("workflow_runs")
    .select("session_template_id, strategic_brief")
    .eq("id", sessionId)
    .maybeSingle();

  const brief = (wf?.strategic_brief as Record<string, unknown>) ?? {};
  const slug = String(brief.sessionTemplate ?? "");

  if (slug) {
    const resolved = await getSessionTemplateBySlug(slug);
    if (resolved) {
      return resolved.stages.map((s) => ({
        stageKey: s.stageKey,
        label: s.label,
        stageOrder: s.stageOrder,
        sdlcStepKey: s.sdlcStepKey,
      }));
    }
  }

  const { data: steps } = await supabase
    .from("workflow_run_steps")
    .select("step_key, step_label, step_order")
    .eq("workflow_run_id", sessionId)
    .order("step_order");

  return (steps ?? []).map((s) => ({
    stageKey: s.step_key as string,
    label: s.step_label as string,
    stageOrder: s.step_order as number,
    sdlcStepKey: s.step_key as string,
  }));
}

export async function guardOrchestrationAdvance(sessionId: string): Promise<{
  allowed: boolean;
  reason: string;
}> {
  const blocked = await isSessionBlockedByDependencies(sessionId);
  if (blocked) {
    return { allowed: false, reason: "Session blocked by unresolved dependencies" };
  }

  const supabase = createSupabaseAdmin();
  const { data: wf } = await supabase
    .from("workflow_runs")
    .select("session_status, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (wf?.status === "completed" || wf?.session_status === "completed") {
    return { allowed: false, reason: "Session already completed" };
  }

  if (wf?.session_status === "cancelled") {
    return { allowed: false, reason: "Session cancelled" };
  }

  return { allowed: true, reason: "" };
}

export async function getParallelEligibleSteps(sessionId: string): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const { data: steps } = await supabase
    .from("workflow_run_steps")
    .select("step_key, status, step_order")
    .eq("workflow_run_id", sessionId)
    .eq("status", "pending")
    .order("step_order");

  if (!steps?.length) return [];

  const minOrder = steps[0].step_order as number;
  return steps.filter((s) => s.step_order === minOrder).map((s) => s.step_key as string);
}
