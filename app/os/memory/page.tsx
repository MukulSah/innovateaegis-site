"use client";

import { useMemo, useState } from "react";
import { Card, SectionHeading } from "@/components/sai/ui";
import { memoryRecords } from "@/lib/sai/data";
import type { MemoryType } from "@/lib/sai/types";

const types: { key: MemoryType | "all"; label: string; blurb: string }[] = [
  { key: "all", label: "All", blurb: "Everything the company remembers." },
  { key: "product", label: "Product", blurb: "Why features exist." },
  { key: "engineering", label: "Engineering", blurb: "How systems were built." },
  { key: "customer", label: "Customer", blurb: "Who requested changes." },
  { key: "decision", label: "Decision", blurb: "Why decisions were made." },
  { key: "business", label: "Business", blurb: "Impact on revenue and growth." },
];

const typeColor: Record<MemoryType, string> = {
  product: "text-violet-300 border-violet-400/30",
  engineering: "text-sky-300 border-sky-400/30",
  customer: "text-emerald-300 border-emerald-400/30",
  decision: "text-amber-300 border-amber-400/30",
  business: "text-pink-300 border-pink-400/30",
};

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<MemoryType | "all">("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memoryRecords.filter((m) => {
      const matchesType = active === "all" || m.type === active;
      const matchesQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q)) ||
        m.author.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [query, active]);

  return (
    <div>
      <SectionHeading
        eyebrow="The Company Never Forgets"
        title="Company Memory"
        description="Product, engineering, customer, decision, and business memory — all searchable. Profiles, projects, and agents contribute to this living record."
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memory — e.g. rollback, false reject, audit, revenue…"
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/50 focus:bg-white/[0.06]"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active === t.key
                ? "border-purple-400/40 bg-purple-500/15 text-white"
                : "border-white/10 bg-white/5 text-white/55 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-white/40">
        {results.length} record{results.length === 1 ? "" : "s"} ·{" "}
        {types.find((t) => t.key === active)?.blurb}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {results.map((m) => (
          <Card key={m.id}>
            <div className="flex items-center justify-between">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${typeColor[m.type]}`}
              >
                {m.type}
              </span>
              <span className="text-xs text-white/40">{m.date}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">{m.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">{m.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {m.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/50">
                  #{tag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.1em] text-white/35">
              {m.author}
            </p>
          </Card>
        ))}
        {results.length === 0 && (
          <Card>
            <p className="text-sm text-white/50">No memory records match that search.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
