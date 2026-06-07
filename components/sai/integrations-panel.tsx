"use client";

import { FormEvent, useState } from "react";

type GitHubActivity = {
  id: string;
  repo: string;
  type: string;
  title: string;
  author: string | null;
  url: string | null;
};

type Props = {
  github: {
    config: { enabled: boolean; hasToken: boolean; config: { repos?: string[]; org?: string } };
    summary: { total: number; byType: Record<string, number> };
    activity: GitHubActivity[];
  };
  notion: {
    config: { enabled: boolean; hasApiKey: boolean; config: { databaseId?: string } };
    pages: Array<{ id: string; title: string; pageType: string; syncedAt: string }>;
  };
};

export function IntegrationsPanel({ github, notion }: Props) {
  const [ghRepos, setGhRepos] = useState(github.config.config.repos?.join(", ") ?? "");
  const [ghOrg, setGhOrg] = useState(github.config.config.org ?? "");
  const [notionDb, setNotionDb] = useState(notion.config.config.databaseId ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");

  async function configureGitHub(e: FormEvent) {
    e.preventDefault();
    setLoading("github-config");
    try {
      await fetch("/api/sai/integrations/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure",
          repos: ghRepos.split(",").map((r) => r.trim()).filter(Boolean),
          org: ghOrg || undefined,
        }),
      });
      setMessage("GitHub configuration saved");
    } finally {
      setLoading("");
    }
  }

  async function syncGitHub() {
    setLoading("github-sync");
    try {
      const res = await fetch("/api/sai/integrations/github", { method: "POST" });
      const data = await res.json();
      setMessage(data.message ?? "GitHub sync complete");
    } finally {
      setLoading("");
    }
  }

  async function configureNotion(e: FormEvent) {
    e.preventDefault();
    setLoading("notion-config");
    try {
      await fetch("/api/sai/integrations/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "configure", databaseId: notionDb }),
      });
      setMessage("Notion configuration saved");
    } finally {
      setLoading("");
    }
  }

  async function syncNotion() {
    setLoading("notion-sync");
    try {
      const res = await fetch("/api/sai/integrations/notion", { method: "POST" });
      const data = await res.json();
      setMessage(data.message ?? "Notion sync complete");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <section className="enterprise-glass rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">GitHub</h2>
            <p className="text-xs text-white/50">
              Sync issues, pull requests, commits, and releases
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${
            github.config.hasToken ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"
          }`}>
            {github.config.hasToken ? "Token configured" : "Set GITHUB_TOKEN"}
          </span>
        </div>

        <form onSubmit={configureGitHub} className="mt-4 space-y-3">
          <input
            type="text"
            value={ghOrg}
            onChange={(e) => setGhOrg(e.target.value)}
            placeholder="Organization (optional)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <input
            type="text"
            value={ghRepos}
            onChange={(e) => setGhRepos(e.target.value)}
            placeholder="Repos (comma-separated, e.g. org/sentra, org/hygyr)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading === "github-config"}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70 hover:bg-white/5"
            >
              Save Config
            </button>
            <button
              type="button"
              onClick={syncGitHub}
              disabled={loading === "github-sync" || !github.config.hasToken}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {loading === "github-sync" ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </form>

        {github.summary.total > 0 && (
          <div className="mt-6">
            <p className="text-xs text-white/45">{github.summary.total} activities tracked</p>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {github.activity.map((a) => (
                <li key={a.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                  <span className="text-white/70">{a.title}</span>
                  <span className="ml-2 text-white/30">{a.type} · {a.repo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Notion</h2>
            <p className="text-xs text-white/50">Import PRDs, meeting notes, and wiki pages</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${
            notion.config.hasApiKey ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"
          }`}>
            {notion.config.hasApiKey ? "API key configured" : "Set NOTION_API_KEY"}
          </span>
        </div>

        <form onSubmit={configureNotion} className="mt-4 space-y-3">
          <input
            type="text"
            value={notionDb}
            onChange={(e) => setNotionDb(e.target.value)}
            placeholder="Notion database ID (optional)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading === "notion-config"}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70 hover:bg-white/5"
            >
              Save Config
            </button>
            <button
              type="button"
              onClick={syncNotion}
              disabled={loading === "notion-sync" || !notion.config.hasApiKey}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {loading === "notion-sync" ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </form>

        {notion.pages.length > 0 && (
          <ul className="mt-6 max-h-48 space-y-2 overflow-y-auto">
            {notion.pages.map((p) => (
              <li key={p.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
                {p.title}
                <span className="ml-2 text-white/30">{p.pageType}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
