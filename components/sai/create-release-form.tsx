"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Project = { id: string; name: string };

type Props = {
  projects: Project[];
};

export function CreateReleaseForm({ projects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [releaseDate, setReleaseDate] = useState("");
  const [status, setStatus] = useState("planned");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sai/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          notes,
          projectId: projectId || undefined,
          releaseDate: releaseDate || undefined,
          status,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setVersion("");
        setNotes("");
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
        {open ? "Cancel" : "+ Schedule Release"}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 enterprise-glass space-y-3 rounded-xl border border-white/10 p-5">
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="Version (e.g. v1.0.0)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            required
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Release notes"
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-3">
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
            <input
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="released">Released</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Release"}
          </button>
        </form>
      )}
    </div>
  );
}
