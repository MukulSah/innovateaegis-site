import { getAssignmentsByWorkflow } from "./task-assignments";
import { getDecisions } from "./decisions";
import { getDocuments } from "./documents";
import { getWorkflowEvents } from "./workflow-events";
import { computeWorkflowProgress } from "./workflow-engine";
import { getSessionState } from "./session-state-engine";
import { getWorkflowRunById } from "./workflows";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getMemories } from "./memories";
import type { Task, WorkflowDetail } from "./types";

export async function getWorkflowDetail(workflowId: string): Promise<WorkflowDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const workflow = await getWorkflowRunById(workflowId);
  if (!workflow) return null;

  const supabase = createSupabaseAdmin();

  const [events, documents, decisions, assignments, memories, tasksResult] = await Promise.all([
    getWorkflowEvents(workflowId),
    getDocuments({ workflowId }),
    getDecisions({ workflowId }),
    getAssignmentsByWorkflow(workflowId),
    getMemories({ projectId: workflow.projectId }),
    supabase
      .from("tasks")
      .select("*, projects(name), agents(name)")
      .eq("workflow_run_id", workflowId)
      .order("created_at", { ascending: true }),
  ]);

  if (tasksResult.error) throw new Error(tasksResult.error.message);

  const tasks: Task[] = (tasksResult.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dependencies: row.dependencies ?? [],
    acceptanceCriteria: row.acceptance_criteria ?? [],
    objectiveId: row.objective_id,
    featureId: row.feature_id,
    assignedAgentId: row.assigned_agent_id,
    assignedAgentName: row.agents?.name ?? null,
    assignedEmployeeId: row.assigned_employee_id,
    status: row.status,
    progressPercentage: row.progress_percentage ?? 0,
    evidence: row.evidence,
    comments: row.comments ?? [],
    attachments: row.attachments ?? [],
    knowledgeGenerated: row.knowledge_generated ?? "",
    approvalStatus: row.approval_status,
    workflowRunId: row.workflow_run_id,
    workflowStepKey: row.workflow_step_key,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const progress = computeWorkflowProgress(workflow.steps);
  const sessionState = await getSessionState(workflowId);
  const activeAgent = sessionState?.currentAgentName ?? null;
  const blockedSteps = workflow.steps.filter((s) => s.status === "blocked").length;
  const healthScore = Math.max(0, 100 - blockedSteps * 20 - (workflow.status === "blocked" ? 30 : 0));

  const requirements = documents.filter((d) => d.type === "requirement");
  const architecture = documents.filter((d) => d.type === "architecture");
  const milestones = documents.filter(
    (d) => d.type === "technical_spec" || d.title.toLowerCase().includes("milestone"),
  );

  const { data: agentMemories } = await supabase
    .from("agent_memory")
    .select("*, agents(name)")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false });

  return {
    workflow,
    progress,
    activeAgent,
    healthScore,
    events,
    requirements,
    architecture,
    milestones,
    tasks,
    assignments,
    documents,
    decisions,
    memories: memories.slice(0, 20),
    agentMemories: (agentMemories ?? []).map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      agentName: row.agents?.name ?? null,
      memoryType: row.memory_type,
      title: row.title,
      content: row.content ?? row.summary,
      workflowId: row.workflow_id,
      projectId: row.project_id,
      createdAt: row.created_at,
    })),
  };
}
