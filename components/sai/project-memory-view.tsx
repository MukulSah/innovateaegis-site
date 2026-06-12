"use client";

import { useMemo, useState } from "react";
import type { Project, ProjectMemoryEntry } from "@/lib/sai/types";

const TREE_CATEGORIES = [
  { key: "decision", label: "Decisions" },
  { key: "requirement", label: "Requirements" },
  { key: "architecture", label: "Architecture" },
  { key: "session", label: "Sessions" },
  { key: "technical", label: "PRs & Implementation" },
  { key: "release", label: "Releases" },
  { key: "lesson", label: "Lessons Learned" },
  { key: "knowledge", label: "Meeting Notes" },
] as const;

type Props = {
  projects: Project[];
  memoryByProject: Record<string, ProjectMemoryEntry[]>;
};

export function ProjectMemoryView({ projects, memoryByProject }: Props) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [category, setCategory] = useState<string>("requirement");

  const project = projects.find((p) => p.id === projectId);
  const entries = useMemo(() => {
    const all = memoryByProject[projectId] ?? [];
    if (category === "session") {
      return all.filter((e) => e.sourceType === "session" || e.sourceType === "session_artifact");
    }
    if (category === "technical") {
      return all.filter((e) => e.memoryType === "technical" || e.memoryType === "feature");
    }
    if (category === "knowledge") {
      return all.filter((e) => e.memoryType === "knowledge" || e.memoryType === "customer");
    }
    return all.filter((e) => e.memoryType === category);
  }, [memoryByProject, projectId, category]);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="enterprise-glass rounded-xl border border-white/10 p-4">
        <label className="text-[10px] uppercase tracking-wider text-white/40">Project</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#0a0a1a]">
              {p.name}
            </option>
          ))}
        </select>

        <p className="mb-2 mt-5 text-[10px] uppercase tracking-wider text-white/40">
          {project?.name ?? "Project"} Memory
        </p>
        <ul className="space-y-0.5">
          {TREE_CATEGORIES.map((cat) => (
            <li key={cat.key}>
              <button
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  category === cat.key
                    ? "bg-purple-500/15 text-white"
                    : "text-white/55 hover:bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">
          {TREE_CATEGORIES.find((c) => c.key === category)?.label ?? "Memory"}
        </h2>
        <ul className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <li className="text-sm text-white/40">No records in this category yet.</li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <p className="font-medium text-white">{entry.title}</p>
                {entry.summary && <p className="mt-1 text-sm text-white/55">{entry.summary}</p>}
                <p className="mt-2 text-[10px] text-white/35">
                  {new Date(entry.createdAt).toLocaleString()} · {entry.memoryType}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
