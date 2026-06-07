"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Project = { id: string; name: string };

type Props = {
  projects: Project[];
};

const docTypes = [
  { value: "prd", label: "PRD" },
  { value: "architecture", label: "Architecture" },
  { value: "meeting_notes", label: "Meeting Notes" },
  { value: "release_notes", label: "Release Notes" },
  { value: "technical", label: "Technical Documentation" },
  { value: "business", label: "Business Document" },
];

export function CreateDocumentForm({ projects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("prd");
  const [projectId, setProjectId] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sai/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          type,
          projectId: projectId || undefined,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setTitle("");
        setContent("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-purple-400/25 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-500/20"
      >
        {open ? "Cancel" : "+ New Document"}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 enterprise-glass space-y-3 rounded-xl border border-white/10 p-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              {docTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Document content (Markdown supported)"
            rows={8}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Document"}
          </button>
        </form>
      )}
    </div>
  );
}
