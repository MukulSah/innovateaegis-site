"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyMemory, MemoryType, Project } from "@/lib/sai/types";

const memoryTypes = [
  { type: "product" as const, label: "Product Memory", desc: "Why features exist" },
  { type: "engineering" as const, label: "Engineering Memory", desc: "How systems were built" },
  { type: "customer" as const, label: "Customer Memory", desc: "Who requested changes" },
  { type: "decision" as const, label: "Decision Memory", desc: "Why decisions were made" },
  { type: "business" as const, label: "Business Memory", desc: "Impact on revenue and growth" },
];

const typeColors: Partial<Record<MemoryType, string>> = {
  product: "text-violet-300 border-violet-400/20 bg-violet-500/10",
  engineering: "text-cyan-300 border-cyan-400/20 bg-cyan-500/10",
  customer: "text-pink-300 border-pink-400/20 bg-pink-500/10",
  decision: "text-amber-300 border-amber-400/20 bg-amber-500/10",
  business: "text-emerald-300 border-emerald-400/20 bg-emerald-500/10",
  process: "text-blue-300 border-blue-400/20 bg-blue-500/10",
  research: "text-indigo-300 border-indigo-400/20 bg-indigo-500/10",
  release: "text-teal-300 border-teal-400/20 bg-teal-500/10",
  meeting: "text-orange-300 border-orange-400/20 bg-orange-500/10",
};

function typeColor(type: MemoryType) {
  return typeColors[type] ?? "text-white/70 border-white/10 bg-white/5";
}

type Props = {
  initialMemories: CompanyMemory[];
  typeCounts: Record<MemoryType, number>;
  projects: Project[];
  isAdmin: boolean;
  supabaseConfigured: boolean;
};

type FormState = {
  title: string;
  content: string;
  type: MemoryType;
  projectId: string;
};

const emptyForm: FormState = {
  title: "",
  content: "",
  type: "product",
  projectId: "",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function MemoryView({
  initialMemories,
  typeCounts,
  projects,
  isAdmin,
  supabaseConfigured,
}: Props) {
  const router = useRouter();
  const [memories, setMemories] = useState(initialMemories);
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      if (typeFilter !== "all" && memory.type !== typeFilter) return false;
      if (projectFilter !== "all" && memory.projectId !== projectFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        return (
          memory.title.toLowerCase().includes(term) ||
          memory.content.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [memories, typeFilter, projectFilter, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEdit(memory: CompanyMemory) {
    setEditingId(memory.id);
    setForm({
      title: memory.title,
      content: memory.content,
      type: memory.type,
      projectId: memory.projectId ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = editingId ? `/api/sai/memories/${editingId}` : "/api/sai/memories";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          type: form.type,
          projectId: form.projectId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      if (editingId) {
        setMemories((prev) => prev.map((m) => (m.id === editingId ? data.memory : m)));
      } else {
        setMemories((prev) => [data.memory, ...prev]);
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
    if (!confirm("Delete this memory?")) return;
    setLoading(true);
    const res = await fetch(`/api/sai/memories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    }
    setLoading(false);
  }

  if (!supabaseConfigured) {
    return (
      <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Supabase is not configured. Connect the database to use Company Memory.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
          >
            + New Memory
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {memoryTypes.map((mt) => (
          <button
            key={mt.type}
            type="button"
            onClick={() => setTypeFilter(typeFilter === mt.type ? "all" : mt.type)}
            className={`rounded-xl border p-4 text-left transition ${typeColor(mt.type)} ${
              typeFilter === mt.type ? "ring-1 ring-white/30" : ""
            }`}
          >
            <p className="text-sm font-semibold">{mt.label}</p>
            <p className="mt-1 text-xs opacity-70">{mt.desc}</p>
            <p className="mt-2 text-lg font-bold">{typeCounts[mt.type]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">{editingId ? "Edit Memory" : "Create Memory"}</h2>
          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Content</span>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-white/50">Type</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as MemoryType })}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
                >
                  {memoryTypes.map((mt) => (
                    <option key={mt.type} value={mt.type}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/50">Project (optional)</span>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
        <h2 className="text-sm font-semibold text-white">Recent Memory Records</h2>
        {filteredMemories.length === 0 ? (
          <p className="rounded-xl border border-white/10 px-4 py-8 text-center text-sm text-white/40">
            No memories found. {isAdmin ? "Create the first company memory." : ""}
          </p>
        ) : (
          filteredMemories.map((record) => (
            <article
              key={record.id}
              className="enterprise-glass rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColor(record.type)}`}>
                  {record.type}
                </span>
                <span className="text-[10px] text-white/35">{formatDate(record.createdAt)}</span>
              </div>
              <h3 className="mt-2 text-sm font-medium text-white">{record.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/55">{record.content}</p>
              {record.projectName && (
                <p className="mt-2 text-[10px] text-white/35">Project: {record.projectName}</p>
              )}
              {isAdmin && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => openEdit(record)} className="text-[10px] text-purple-300 hover:text-purple-200">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(record.id)} className="text-[10px] text-red-300 hover:text-red-200">
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
