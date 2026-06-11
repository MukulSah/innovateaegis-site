"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent, Employee, Task, TaskStage } from "@/lib/sai/types";

const stageLabels: Record<TaskStage, string> = {
  backlog: "Backlog",
  planning: "Planning",
  ready: "Ready",
  assigned: "Assigned",
  in_progress: "In Progress",
  code_review: "Code Review",
  testing: "Testing",
  approval: "Approval",
  released: "Released",
  archived: "Archived",
};

type Props = {
  initialTasks: Task[];
  agents: Agent[];
  employees: Employee[];
  isAdmin: boolean;
  supabaseConfigured: boolean;
};

export function TasksView({ initialTasks, agents, employees, isAdmin, supabaseConfigured }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState(false);

  async function reassign(task: Task, agentId: string | null, employeeId: string | null) {
    setLoading(true);
    const res = await fetch(`/api/sai/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dependencies: task.dependencies,
        acceptanceCriteria: task.acceptanceCriteria,
        assignedAgentId: agentId,
        assignedEmployeeId: employeeId,
        status: task.status,
        evidence: task.evidence,
        comments: task.comments,
        approvalStatus: task.approvalStatus,
        workflowRunId: task.workflowRunId,
        workflowStepKey: task.workflowStepKey,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      router.refresh();
    }
    setLoading(false);
  }

  async function approve(task: Task, approvalStatus: "approved" | "rejected") {
    setLoading(true);
    const res = await fetch(`/api/sai/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...task,
        projectId: task.projectId,
        approvalStatus,
        status: approvalStatus === "approved" ? "released" : task.status,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Task</th>
            <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 md:table-cell">Project</th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Stage</th>
            <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:table-cell">Assignee</th>
            {isAdmin && <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-white/40">
                No tasks yet. Launch a workflow from the Control Panel.
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="text-white/85">{task.title}</p>
                  {task.approvalStatus === "pending" && (
                    <span className="mt-1 inline-block rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                      Approval pending
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-white/50 md:table-cell">{task.projectName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                    {stageLabels[task.status]}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-white/50 sm:table-cell">
                  {task.assignedAgentName ?? task.assignedEmployeeName ?? "—"}
                </td>
                {isAdmin && supabaseConfigured && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <select
                        disabled={loading}
                        value={task.assignedAgentId ?? ""}
                        onChange={(e) => reassign(task, e.target.value || null, task.assignedEmployeeId)}
                        className="rounded border border-white/10 bg-[#0d0d14] px-1 py-0.5 text-[10px] text-white"
                      >
                        <option value="">Agent…</option>
                        {agents.filter((a) => a.status !== "disabled").map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      {task.approvalStatus === "pending" && (
                        <>
                          <button type="button" onClick={() => approve(task, "approved")} className="text-[10px] text-emerald-300">Approve</button>
                          <button type="button" onClick={() => approve(task, "rejected")} className="text-[10px] text-red-300">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
