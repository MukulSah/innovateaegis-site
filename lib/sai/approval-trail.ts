import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type TrailStepStatus = "pending" | "running" | "completed" | "failed";

export type ApprovalTrailStep = {
  key: string;
  label: string;
  status: TrailStepStatus;
  error?: string;
  table?: string;
  field?: string;
  value?: string;
  at: string;
};

export type ApprovalTrail = {
  id: string;
  approvalId: string;
  objectiveId: string | null;
  workflowRunId: string | null;
  status: "running" | "completed" | "failed";
  steps: ApprovalTrailStep[];
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type TrailRow = {
  id: string;
  approval_id: string;
  objective_id: string | null;
  workflow_run_id: string | null;
  status: string;
  steps: ApprovalTrailStep[];
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

function mapRow(row: TrailRow): ApprovalTrail {
  return {
    id: row.id,
    approvalId: row.approval_id,
    objectiveId: row.objective_id,
    workflowRunId: row.workflow_run_id,
    status: row.status as ApprovalTrail["status"],
    steps: row.steps ?? [],
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function createApprovalTrail(
  approvalId: string,
  objectiveId?: string | null,
): Promise<ApprovalTrail> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("approval_activation_trails")
    .insert({
      approval_id: approvalId,
      objective_id: objectiveId ?? null,
      status: "running",
      steps: [],
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as TrailRow);
}

export async function appendTrailStep(
  trailId: string,
  step: {
    key: string;
    label: string;
    status: TrailStepStatus;
    error?: string;
    table?: string;
    field?: string;
    value?: string;
  },
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: existing } = await supabase
    .from("approval_activation_trails")
    .select("steps")
    .eq("id", trailId)
    .maybeSingle();

  const steps = (existing?.steps as ApprovalTrailStep[]) ?? [];
  const entry: ApprovalTrailStep = {
    key: step.key,
    label: step.label,
    status: step.status,
    error: step.error,
    table: step.table,
    field: step.field,
    value: step.value,
    at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("approval_activation_trails")
    .update({ steps: [...steps, entry] })
    .eq("id", trailId);

  if (error) throw new Error(error.message);
}

export async function completeTrail(
  trailId: string,
  status: "completed" | "failed",
  errorMessage?: string,
  workflowRunId?: string | null,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("approval_activation_trails")
    .update({
      status,
      error_message: errorMessage ?? null,
      workflow_run_id: workflowRunId ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", trailId);

  if (error) throw new Error(error.message);
}

export async function getApprovalTrail(approvalId: string): Promise<ApprovalTrail | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("approval_activation_trails")
    .select("*")
    .eq("approval_id", approvalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as TrailRow);
}

export class ApprovalActivationError extends Error {
  constructor(
    message: string,
    public readonly trailId: string,
    public readonly steps: ApprovalTrailStep[],
  ) {
    super(message);
    this.name = "ApprovalActivationError";
  }
}

export async function getApprovalTrailById(trailId: string): Promise<ApprovalTrail | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("approval_activation_trails")
    .select("*")
    .eq("id", trailId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as TrailRow);
}
