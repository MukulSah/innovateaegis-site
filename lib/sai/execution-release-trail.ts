import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type ReleaseTrailStep = {
  key: string;
  label: string;
  status: "completed" | "failed";
  error?: string;
  at: string;
};

export async function startReleaseTrail(workflowRunId: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("execution_release_trails")
    .insert({ workflow_run_id: workflowRunId, status: "running", steps: [] })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function appendReleaseTrailStep(
  trailId: string,
  step: Omit<ReleaseTrailStep, "at"> & { at?: string },
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("execution_release_trails")
    .select("steps")
    .eq("id", trailId)
    .maybeSingle();

  const steps = [...((row?.steps as ReleaseTrailStep[]) ?? []), { ...step, at: step.at ?? new Date().toISOString() }];

  await supabase.from("execution_release_trails").update({ steps }).eq("id", trailId);
}

export async function completeReleaseTrail(
  trailId: string,
  status: "completed" | "failed",
  errorMessage?: string,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("execution_release_trails")
    .update({
      status,
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", trailId);
}

/** Prevent concurrent duplicate releases for the same session. */
export async function isReleaseInProgress(workflowRunId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("execution_release_trails")
    .select("id")
    .eq("workflow_run_id", workflowRunId)
    .eq("status", "running")
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function getReleaseTrail(workflowRunId: string): Promise<ReleaseTrailStep[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("execution_release_trails")
    .select("steps")
    .eq("workflow_run_id", workflowRunId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.steps as ReleaseTrailStep[]) ?? [];
}
