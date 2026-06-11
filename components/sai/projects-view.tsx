"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent, Employee, Project } from "@/lib/sai/types";

const statusStyles: Record<Project["status"], string> = {
  on_track: "text-emerald-400 bg-emerald-500/10 border-emerald-400/20",
  at_risk: "text-amber-400 bg-amber-500/10 border-amber-400/20",
  delayed: "text-red-400 bg-red-500/10 border-red-400/20",
  completed: "text-cyan-400 bg-cyan-500/10 border-cyan-400/20",
};

const statusOptions: { value: Project["status"]; label: string }[] = [
  { value: "on_track", label: "On Track" },
  { value: "at_risk", label: "At Risk" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
];

const taskStages = [
  "Backlog", "Planning", "Ready", "Assigned", "In Progress",
  "Code Review", "Testing", "Approval", "Released", "Knowledge Archived",
];

type Props = {
  initialProjects: Project[];
  agents: Agent[];
  employees: Employee[];
  isAdmin: boolean;
  supabaseConfigured: boolean;
};

type FormState = {
  name: string;
  objective: string;
  status: Project["status"];
  progress: string;
  businessOwner: string;
  projectLeadAgentId: string;
  projectLeadEmployeeId: string;
  healthScore: string;
  tasksTotal: string;
  tasksCompleted: string;
};

const emptyForm: FormState = {
  name: "",
  objective: "",
  status: "on_track",
  progress: "0",
  businessOwner: "",
  projectLeadAgentId: "",
  projectLeadEmployeeId: "",
  healthScore: "80",
  tasksTotal: "0",
  tasksCompleted: "0",
};

function projectToForm(project: Project): FormState {
  return {
    name: project.name,
    objective: project.objective,
    status: project.status,
    progress: String(project.progress),
    businessOwner: project.businessOwner,
    projectLeadAgentId: project.projectLeadAgentId ?? "",
    projectLeadEmployeeId: project.projectLeadEmployeeId ?? "",
    healthScore: String(project.healthScore),
    tasksTotal: String(project.tasksTotal),
    tasksCompleted: String(project.tasksCompleted),
  };
}

export function ProjectsView({
  initialProjects,
  agents,
  employees,
  isAdmin,
  supabaseConfigured,
}: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditingId(project.id);
    setForm(projectToForm(project));
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: form.name,
      objective: form.objective,
      status: form.status,
      progress: Number(form.progress),
      businessOwner: form.businessOwner,
      projectLeadAgentId: form.projectLeadAgentId || null,
      projectLeadEmployeeId: form.projectLeadEmployeeId || null,
      healthScore: Number(form.healthScore),
      tasksTotal: Number(form.tasksTotal),
      tasksCompleted: Number(form.tasksCompleted),
    };

    try {
      const url = editingId
        ? `/api/sai/projects/${editingId}`
        : "/api/sai/projects";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save project");
        return;
      }

      if (editingId) {
        setProjects((prev) =>
          prev.map((p) => (p.id === editingId ? data.project : p)),
        );
      } else {
        setProjects((prev) => [...prev, data.project]);
      }

      closeForm();
      router.refresh();
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sai/projects/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete project");
        return;
      }

      setProjects((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!supabaseConfigured && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Supabase is not configured. Add your credentials to <code className="text-amber-100">.env.local</code> and run the migration in <code className="text-amber-100">supabase/migrations/001_projects.sql</code>.
        </div>
      )}

      {isAdmin && supabaseConfigured && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/45">Admin: create and edit projects below.</p>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
          >
            + New Project
          </button>
        </div>
      )}

      {error && !formOpen && (
        <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="enterprise-glass rounded-xl border border-purple-400/20 p-5"
        >
          <h2 className="text-sm font-semibold text-white">
            {editingId ? "Edit Project" : "Create Project"}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Objective</span>
              <textarea
                required
                rows={2}
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Project["status"] })
                }
                className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Business Owner</span>
              <input
                value={form.businessOwner}
                onChange={(e) => setForm({ ...form, businessOwner: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Project Lead (Agent)</span>
              <select
                value={form.projectLeadAgentId}
                onChange={(e) => setForm({ ...form, projectLeadAgentId: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
              >
                <option value="">Select agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Project Lead (Employee)</span>
              <select
                value={form.projectLeadEmployeeId}
                onChange={(e) => setForm({ ...form, projectLeadEmployeeId: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
              >
                <option value="">Optional…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Health Score</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.healthScore}
                onChange={(e) => setForm({ ...form, healthScore: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Progress (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Tasks Total</span>
              <input
                type="number"
                min={0}
                required
                value={form.tasksTotal}
                onChange={(e) => setForm({ ...form, tasksTotal: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Tasks Completed</span>
              <input
                type="number"
                min={0}
                required
                value={form.tasksCompleted}
                onChange={(e) => setForm({ ...form, tasksCompleted: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-300">{error}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Saving..." : editingId ? "Save Changes" : "Create Project"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="enterprise-glass rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">
            No projects yet.{isAdmin && supabaseConfigured ? " Create your first project above." : ""}
          </div>
        ) : (
          projects.map((project) => (
            <article
              key={project.id}
              className="enterprise-glass rounded-xl border border-white/10 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/sai/projects/${project.id}`} className="text-lg font-semibold text-white hover:text-purple-200">
                    {project.name}
                  </Link>
                  <p className="mt-1 text-sm text-white/55">{project.objective}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${statusStyles[project.status]}`}>
                    {project.status.replace("_", " ")}
                  </span>
                  {isAdmin && supabaseConfigured && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(project)}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        disabled={loading}
                        className="rounded-lg border border-red-400/20 px-2 py-1 text-[10px] text-red-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-6 text-sm text-white/50">
                <span>Owner: <span className="text-white/80">{project.businessOwner}</span></span>
                <span>Lead: <span className="text-white/80">{project.projectLeadName ?? "Unassigned"}</span></span>
                <span>Tasks: <span className="text-white/80">{project.tasksCompleted}/{project.tasksTotal}</span></span>
                <span>Progress: <span className="text-white/80">{project.progress}%</span></span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Task Lifecycle</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {taskStages.map((stage, i) => (
            <span key={stage} className="flex items-center gap-2">
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                {stage}
              </span>
              {i < taskStages.length - 1 && <span className="text-white/20">↓</span>}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
