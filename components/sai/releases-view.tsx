"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Release, ReleaseStatus } from "@/lib/sai/types";

const statusStyles: Record<ReleaseStatus, string> = {
  released: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  planned: "border-amber-400/20 bg-amber-500/10 text-amber-300",
  ready: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  rolled_back: "border-red-400/20 bg-red-500/10 text-red-300",
};

const statusLabels: Record<ReleaseStatus, string> = {
  planned: "Planned",
  ready: "Ready",
  released: "Released",
  rolled_back: "Rolled Back",
};

type Props = {
  initialReleases: Release[];
  projects: Project[];
  isAdmin: boolean;
  supabaseConfigured: boolean;
};

type FormState = {
  projectId: string;
  version: string;
  title: string;
  description: string;
  status: ReleaseStatus;
  releaseDate: string;
};

const emptyForm: FormState = {
  projectId: "",
  version: "",
  title: "",
  description: "",
  status: "planned",
  releaseDate: "",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function ReleasesView({
  initialReleases,
  projects,
  isAdmin,
  supabaseConfigured,
}: Props) {
  const router = useRouter();
  const [releases, setReleases] = useState(initialReleases);
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

  function openEdit(release: Release) {
    setEditingId(release.id);
    setForm({
      projectId: release.projectId,
      version: release.version,
      title: release.title,
      description: release.description,
      status: release.status,
      releaseDate: release.releaseDate ? release.releaseDate.slice(0, 10) : "",
    });
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = editingId ? `/api/sai/releases/${editingId}` : "/api/sai/releases";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: form.projectId,
          version: form.version,
          title: form.title,
          description: form.description,
          status: form.status,
          releaseDate: form.releaseDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      if (editingId) {
        setReleases((prev) => prev.map((r) => (r.id === editingId ? data.release : r)));
      } else {
        setReleases((prev) => [data.release, ...prev]);
      }
      setFormOpen(false);
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this release?")) return;
    setLoading(true);
    const res = await fetch(`/api/sai/releases/${id}`, { method: "DELETE" });
    if (res.ok) {
      setReleases((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    }
    setLoading(false);
  }

  async function markReleased(release: Release) {
    setLoading(true);
    const res = await fetch(`/api/sai/releases/${release.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: release.projectId,
        version: release.version,
        title: release.title,
        description: release.description,
        status: "released",
        releaseDate: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setReleases((prev) => prev.map((r) => (r.id === release.id ? data.release : r)));
      router.refresh();
    }
    setLoading(false);
  }

  if (!supabaseConfigured) {
    return (
      <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Supabase is not configured. Connect the database to manage releases.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
          >
            + New Release
          </button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">{editingId ? "Edit Release" : "Create Release"}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Project</span>
              <select
                required
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Version</span>
              <input
                required
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ReleaseStatus })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Release Date</span>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
              Save
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {releases.length === 0 ? (
          <p className="rounded-xl border border-white/10 px-4 py-8 text-center text-sm text-white/40">
            No releases yet. {isAdmin ? "Create the first release." : ""}
          </p>
        ) : (
          releases.map((release) => (
            <article
              key={release.id}
              className="enterprise-glass flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-5"
            >
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {release.projectName ? `${release.projectName} ${release.version}` : release.version}
                </h3>
                <p className="mt-0.5 text-xs text-white/60">{release.title}</p>
                <p className="mt-1 text-xs text-white/50">{release.description}</p>
                {isAdmin && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(release)} className="text-[10px] text-purple-300 hover:text-purple-200">
                      Edit
                    </button>
                    {release.status !== "released" && (
                      <button type="button" onClick={() => markReleased(release)} className="text-[10px] text-emerald-300 hover:text-emerald-200">
                        Mark Released
                      </button>
                    )}
                    <button type="button" onClick={() => handleDelete(release.id)} className="text-[10px] text-red-300 hover:text-red-200">
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/40">{formatDate(release.releaseDate ?? release.createdAt)}</span>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${statusStyles[release.status]}`}>
                  {statusLabels[release.status]}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
