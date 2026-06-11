"use client";

import { FormEvent, useState } from "react";
import type { KnowledgeSearchResult } from "@/lib/sai/types";

const categoryLabels: Record<string, string> = {
  memory: "Memory",
  document: "Document",
  decision: "Decision",
  task: "Task",
  release: "Release",
  project: "Project",
  agent_memory: "Agent Note",
  project_memory: "Project Knowledge",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/sai/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(res.ok ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all company knowledge…"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

      {searched && (
        <div className="enterprise-glass max-h-64 overflow-y-auto rounded-xl border border-white/10 p-3">
          {results.length === 0 ? (
            <p className="text-center text-xs text-white/40">No results found.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((result) => (
                <li key={`${result.category}-${result.id}`} className="border-b border-white/5 pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white/85">{result.title}</p>
                    <span className="shrink-0 text-[10px] uppercase text-purple-300/70">
                      {categoryLabels[result.category] ?? result.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">{result.snippet}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
