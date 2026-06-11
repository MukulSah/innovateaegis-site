import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import { generateMemoryFromDecision } from "./org-memory-generator";
import { notifyFounder } from "./notifications";
import type { Decision } from "./types";

type DecisionRow = {
  id: string;
  workflow_id: string | null;
  project_id: string;
  title: string;
  decision: string;
  rationale: string;
  alternatives_considered: string;
  created_by: string;
  created_at: string;
  projects?: { name: string } | null;
};

export type DecisionInput = {
  workflowId?: string | null;
  projectId: string;
  title: string;
  decision: string;
  rationale?: string;
  alternativesConsidered?: string;
  createdBy?: string;
};

const decisionSelect = `*, projects(name)`;

function mapRow(row: DecisionRow): Decision {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    title: row.title,
    decision: row.decision,
    rationale: row.rationale,
    alternativesConsidered: row.alternatives_considered,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getDecisions(filters?: {
  projectId?: string;
  workflowId?: string;
}): Promise<Decision[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  let query = supabase.from("decisions").select(decisionSelect).order("created_at", { ascending: false });

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.workflowId) query = query.eq("workflow_id", filters.workflowId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DecisionRow[]).map(mapRow);
}

export async function createDecision(input: DecisionInput): Promise<Decision> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("decisions")
    .insert({
      workflow_id: input.workflowId ?? null,
      project_id: input.projectId,
      title: input.title.trim(),
      decision: input.decision.trim(),
      rationale: input.rationale ?? "",
      alternatives_considered: input.alternativesConsidered ?? "",
      created_by: input.createdBy ?? "SAI",
    })
    .select(decisionSelect)
    .single();

  if (error) throw new Error(error.message);
  const decision = mapRow(data as DecisionRow);

  await recordActivityFeed({
    actor: decision.createdBy,
    action: "decision_recorded",
    targetType: "decision",
    targetId: decision.id,
    description: decision.title,
  });

  await notifyFounder(
    `Decision recorded: ${decision.title}`,
    decision.decision.slice(0, 200),
    "SYSTEM",
    { severity: "MEDIUM", entityType: "decision", entityId: decision.id },
  );

  await generateMemoryFromDecision(decision.id).catch(() => undefined);

  return decision;
}

export async function countDecisions(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("decisions")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}
