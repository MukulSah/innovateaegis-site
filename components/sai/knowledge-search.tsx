"use client";

import { FormEvent, useState } from "react";
import type { KnowledgeSearchResult } from "@/lib/sai/knowledge";

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/sai/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="enterprise-glass rounded-xl border border-white/10 p-5">
      <h2 className="text-sm font-semibold text-white">Global Knowledge Search</h2>
      <p className="mt-1 text-xs text-white/50">
        Search across tasks, documents, meetings, decisions, engineers, and projects.
      </p>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "Authentication" or "Sentra"...'
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-purple-400/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-purple-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {results && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-white/40">
            {results.totalResults} results for &ldquo;{results.query}&rdquo;
          </p>

          {results.projects.length > 0 && (
            <SearchSection title="Projects" items={results.projects.map((p) => `${p.name} — ${p.status} (${p.progress}%)`)} />
          )}
          {results.tasks.length > 0 && (
            <SearchSection title="Tasks" items={results.tasks.map((t) => `[${t.project}] ${t.title} — ${t.stage}`)} />
          )}
          {results.knowledge.length > 0 && (
            <SearchSection title="Knowledge" items={results.knowledge.map((k) => `${k.title} [${k.type}]`)} />
          )}
          {results.decisions.length > 0 && (
            <SearchSection title="Decisions" items={results.decisions.map((d) => d.title)} />
          )}
          {results.meetings.length > 0 && (
            <SearchSection title="Meetings" items={results.meetings.map((m) => `${m.title} [${m.type}]`)} />
          )}
          {results.engineers.length > 0 && (
            <SearchSection title="Engineers" items={results.engineers.map((e) => `${e.name} — ${e.role}, ${e.department}`)} />
          )}
          {results.documents.length > 0 && (
            <SearchSection title="Documents" items={results.documents.map((d) => `${d.title} [${d.type}]`)} />
          )}

          {results.totalResults === 0 && (
            <p className="text-sm text-white/50">No results found in company memory.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-300/70">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/70">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
