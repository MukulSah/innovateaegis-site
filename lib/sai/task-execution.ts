import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivityFeed } from "./activity-feed";
import { recordActivity } from "./activity-logs";
import { getTaskById } from "./tasks";
import type { TaskExecutionAction, TaskExecutionLog } from "./types";

type ExecutionLogRow = {
  id: string;
  task_id: string;
  actor: string;
  action: string;
  notes: string;
  created_at: string;
};

const ACTION_LABELS: Record<TaskExecutionAction, string> = {
  started_work: "Started Work",
  updated_progress: "Updated Progress",
  blocked: "Blocked",
  review_requested: "Review Requested",
  approved: "Approved",
  completed: "Completed",
};

function mapRow(row: ExecutionLogRow): TaskExecutionLog {
  return {
    id: row.id,
    taskId: row.task_id,
    actor: row.actor,
    action: row.action as TaskExecutionAction,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getTaskExecutionLogs(taskId: string): Promise<TaskExecutionLog[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("task_execution_logs")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ExecutionLogRow[]).map(mapRow);
}

export async function logTaskExecution(
  taskId: string,
  actor: string,
  action: TaskExecutionAction,
  notes = "",
  progressPercentage?: number,
): Promise<TaskExecutionLog> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("task_execution_logs")
    .insert({
      task_id: taskId,
      actor,
      action,
      notes,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const task = await getTaskById(taskId);
  const label = ACTION_LABELS[action];

  if (progressPercentage !== undefined && task) {
    await supabase
      .from("tasks")
      .update({ progress_percentage: Math.min(100, Math.max(0, progressPercentage)) })
      .eq("id", taskId);
  }

  if (action === "completed" && task) {
    await supabase
      .from("tasks")
      .update({
        progress_percentage: 100,
        status: "released",
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  }

  if (action === "blocked" && task) {
    await supabase.from("tasks").update({ status: "planning" }).eq("id", taskId);
  }

  if (action === "started_work" && task && task.status === "assigned") {
    await supabase
      .from("tasks")
      .update({ status: "in_progress", progress_percentage: progressPercentage ?? 10 })
      .eq("id", taskId);
  }

  await recordActivity({
    actor,
    action: `${label}: ${task?.title ?? taskId}`,
    entityType: "task",
    entityId: taskId,
  });

  await recordActivityFeed({
    actor,
    action: label,
    targetType: "task",
    targetId: taskId,
    description: notes || task?.title || "",
  });

  return mapRow(data as ExecutionLogRow);
}

export function validateExecutionInput(body: unknown): {
  action: TaskExecutionAction;
  notes: string;
  progressPercentage?: number;
} | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const actions: TaskExecutionAction[] = [
    "started_work",
    "updated_progress",
    "blocked",
    "review_requested",
    "approved",
    "completed",
  ];

  const action = data.action as TaskExecutionAction;
  if (!actions.includes(action)) return null;

  return {
    action,
    notes: typeof data.notes === "string" ? data.notes : "",
    progressPercentage:
      typeof data.progressPercentage === "number" ? data.progressPercentage : undefined,
  };
}
