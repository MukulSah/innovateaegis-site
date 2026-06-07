"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  title: string;
  description: string | null;
  stage: string;
  priority: string;
  dueDate: string | null;
  isBlocker: boolean;
  project: { name: string };
};

type Props = {
  tasks: Task[];
  userName: string;
};

const stages = [
  "backlog",
  "planning",
  "ready",
  "assigned",
  "in_progress",
  "code_review",
  "testing",
  "approval",
  "released",
  "archived",
];

export function TaskWorkspace({ tasks: initial, userName }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function updateTask(taskId: string, data: Record<string, unknown>) {
    setLoading(taskId);
    try {
      const res = await fetch(`/api/sai/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, stage: updated.stage, priority: updated.priority }
              : t,
          ),
        );
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  async function addComment(taskId: string, e: FormEvent) {
    e.preventDefault();
    const content = comment[taskId]?.trim();
    if (!content) return;

    setLoading(taskId);
    try {
      const res = await fetch(`/api/sai/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setComment((prev) => ({ ...prev, [taskId]: "" }));
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="enterprise-glass rounded-xl border border-dashed border-white/15 p-8 text-center">
        <p className="text-sm text-white/50">No tasks assigned to you yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <article
          key={task.id}
          className={`enterprise-glass rounded-xl border p-5 ${
            task.isBlocker ? "border-red-400/20 bg-red-500/5" : "border-white/10"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {task.isBlocker && <span className="mr-1 text-red-400">●</span>}
                {task.title}
              </h3>
              <p className="mt-1 text-xs text-white/45">{task.project.name}</p>
              {task.description && (
                <p className="mt-2 text-xs text-white/55">{task.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-200">
                {task.priority}
              </span>
              {task.dueDate && (
                <span className="text-[10px] text-white/40">Due {task.dueDate.slice(0, 10)}</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs text-white/50">Stage:</label>
            <select
              value={task.stage}
              onChange={(e) => updateTask(task.id, { stage: e.target.value })}
              disabled={loading === task.id}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none"
            >
              {stages.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <form onSubmit={(e) => addComment(task.id, e)} className="mt-4 flex gap-2">
            <input
              type="text"
              value={comment[task.id] ?? ""}
              onChange={(e) => setComment((prev) => ({ ...prev, [task.id]: e.target.value }))}
              placeholder={`Comment as ${userName}...`}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
            />
            <button
              type="submit"
              disabled={loading === task.id}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
            >
              Post
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
