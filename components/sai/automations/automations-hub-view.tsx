"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AutomationTemplateCards } from "./automation-template-cards";
import type { AgentAutomation } from "@/lib/sai/agent-automations";

type Stats = { total: number; successful: number; failed: number };

type Template = {
  id: string;
  kind: string;
  name: string;
  description: string;
  category: string;
};

type Props = {
  automations: AgentAutomation[];
  stats: Stats;
  templates: readonly Template[];
  isAdmin: boolean;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) return "Today";
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

export function AutomationsHubView({ automations, stats, templates, isAdmin }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const [category, setCategory] = useState("popular");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = automations;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [automations, search]);

  async function createBlank() {
    const res = await fetch("/api/sai/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Automation" }),
    });
    const data = await res.json();
    if (data.automation?.id) router.push(`/sai/automations/${data.automation.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Total Automations</p>
          <p className="mt-1 text-2xl font-bold text-white">{automations.length}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Successful · 7d</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{stats.successful}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Failed · 7d</p>
          <p className="mt-1 text-2xl font-bold text-red-300">{stats.failed}</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Run History</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`rounded-full px-3 py-1 text-xs ${
              tab === "mine" ? "bg-white/15 text-white" : "text-white/45"
            }`}
          >
            Mine ({automations.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("team")}
            className={`rounded-full px-3 py-1 text-xs ${
              tab === "team" ? "bg-white/15 text-white" : "text-white/45"
            }`}
          >
            Team ({automations.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white"
          />
          {isAdmin && (
            <button
              type="button"
              onClick={createBlank}
              className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-black hover:bg-white/90"
            >
              + New Automation
            </button>
          )}
        </div>
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-3">Automation Name</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Tools</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link
                    href={`/sai/automations/${a.id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {a.name}
                  </Link>
                  <p className="mt-0.5 text-[10px] text-white/40">{a.description.slice(0, 80)}</p>
                </td>
                <td className="px-4 py-3 capitalize text-white/60">{a.automationKind}</td>
                <td className="px-4 py-3 text-white/50">
                  {a.repositoryScope?.provider === "github" ? "GitHub" : "—"}
                </td>
                <td className="px-4 py-3 text-white/50">{formatWhen(a.createdAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                      a.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : a.status === "paused"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-white/10 text-white/40"
                    }`}
                  >
                    {a.status === "active" ? "Active" : a.status === "paused" ? "Inactive" : "Draft"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-white/40">No automations yet.</p>
        )}
      </section>

      <AutomationTemplateCards
        templates={templates}
        isAdmin={isAdmin}
        activeCategory={category}
        onCategoryChange={setCategory}
      />
    </div>
  );
}
