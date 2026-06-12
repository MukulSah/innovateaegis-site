import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { nullableUuid } from "./nullable-uuid";
import { addProjectMemory } from "./project-memory";
import type { ProjectMemoryEntry } from "./types";

export type SessionArtifact = {
  id: string;
  workflowRunId: string | null;
  objectiveId: string | null;
  runtimeSessionId: string | null;
  agentId: string | null;
  stepKey: string;
  turnNumber: number;
  inputSummary: string;
  outputSummary: string;
  decision: string | null;
  artifactName: string | null;
  artifactType: string | null;
  artifactRefId: string | null;
  artifactRefUrl: string | null;
  createdAt: string;
};

type ArtifactRow = {
  id: string;
  workflow_run_id: string | null;
  objective_id: string | null;
  runtime_session_id: string | null;
  agent_id: string | null;
  step_key: string;
  turn_number: number;
  input_summary: string;
  output_summary: string;
  decision: string | null;
  artifact_name: string | null;
  artifact_type: string | null;
  artifact_ref_id: string | null;
  artifact_ref_url: string | null;
  created_at: string;
};

function mapRow(row: ArtifactRow): SessionArtifact {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    objectiveId: row.objective_id,
    runtimeSessionId: row.runtime_session_id,
    agentId: row.agent_id,
    stepKey: row.step_key,
    turnNumber: row.turn_number,
    inputSummary: row.input_summary,
    outputSummary: row.output_summary,
    decision: row.decision,
    artifactName: row.artifact_name,
    artifactType: row.artifact_type,
    artifactRefId: row.artifact_ref_id,
    artifactRefUrl: row.artifact_ref_url,
    createdAt: row.created_at,
  };
}

const STEP_MEMORY_TYPE: Record<string, ProjectMemoryEntry["memoryType"]> = {
  ceo_strategy: "decision",
  coo_execution: "decision",
  requirements: "requirement",
  execution_readiness: "technical",
  design: "architecture",
  tasks: "feature",
  implementation: "technical",
  validation: "lesson",
  deployment: "release",
  documentation: "knowledge",
  knowledge: "lesson",
};

export async function getNextTurnNumber(
  workflowRunId?: string | null,
  objectiveId?: string | null,
): Promise<number> {
  const supabase = createSupabaseAdmin();
  let query = supabase.from("session_artifacts").select("turn_number").order("turn_number", { ascending: false }).limit(1);

  if (workflowRunId) query = query.eq("workflow_run_id", workflowRunId);
  else if (objectiveId) query = query.eq("objective_id", objectiveId);
  else return 1;

  const { data } = await query.maybeSingle();
  return (data?.turn_number ?? 0) + 1;
}

export async function createSessionArtifact(input: {
  workflowRunId?: string | null;
  objectiveId?: string | null;
  runtimeSessionId?: string | null;
  agentId?: string | null;
  stepKey: string;
  inputSummary?: string;
  outputSummary: string;
  decision?: string | null;
  artifactName?: string | null;
  artifactType?: string | null;
  artifactRefId?: string | null;
  artifactRefUrl?: string | null;
  projectId?: string;
}): Promise<SessionArtifact> {
  const supabase = createSupabaseAdmin();
  const turnNumber = await getNextTurnNumber(input.workflowRunId, input.objectiveId);

  const { data, error } = await supabase
    .from("session_artifacts")
    .insert({
      workflow_run_id: nullableUuid(input.workflowRunId),
      objective_id: nullableUuid(input.objectiveId),
      runtime_session_id: nullableUuid(input.runtimeSessionId),
      agent_id: nullableUuid(input.agentId),
      step_key: input.stepKey,
      turn_number: turnNumber,
      input_summary: input.inputSummary ?? "",
      output_summary: input.outputSummary,
      decision: input.decision ?? null,
      artifact_name: input.artifactName ?? null,
      artifact_type: input.artifactType ?? null,
      artifact_ref_id: nullableUuid(input.artifactRefId),
      artifact_ref_url: input.artifactRefUrl ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const artifact = mapRow(data as ArtifactRow);

  if (input.projectId && input.workflowRunId) {
    const memoryType = STEP_MEMORY_TYPE[input.stepKey] ?? "knowledge";
    await addProjectMemory({
      projectId: input.projectId,
      memoryType,
      title: input.artifactName ?? `${input.stepKey} output`,
      summary: input.outputSummary.slice(0, 500),
      sourceType: "session_artifact",
      sourceId: artifact.id,
    });

    try {
      const { processArtifactDocumentation } = await import("./documentation-pipeline");
      await processArtifactDocumentation({ artifact, projectId: input.projectId });
    } catch {
      // Documentation pipeline is best-effort
    }
  }

  return artifact;
}

export async function getSessionArtifacts(workflowRunId: string): Promise<SessionArtifact[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_artifacts")
    .select("*")
    .eq("workflow_run_id", workflowRunId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ArtifactRow[]).map(mapRow);
}

export async function getObjectiveArtifacts(objectiveId: string): Promise<SessionArtifact[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_artifacts")
    .select("*")
    .eq("objective_id", objectiveId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ArtifactRow[]).map(mapRow);
}
