"use client";

import { useRouter } from "next/navigation";

type Template = {
  id: string;
  kind: string;
  name: string;
  description: string;
  category: string;
};

type Props = {
  templates: readonly Template[];
  isAdmin: boolean;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
};

const CATEGORIES = [
  { id: "popular", label: "Popular" },
  { id: "code_review", label: "Code Review" },
  { id: "security", label: "Security" },
  { id: "incidents", label: "Incidents & Triage" },
];

export function AutomationTemplateCards({
  templates,
  isAdmin,
  activeCategory,
  onCategoryChange,
}: Props) {
  const router = useRouter();

  const filtered =
    activeCategory === "popular"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  async function addTemplate(templateId: string) {
    const res = await fetch("/api/sai/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    const data = await res.json();
    if (data.automation?.id) {
      router.push(`/sai/automations/${data.automation.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategoryChange(c.id)}
            className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider ${
              activeCategory === c.id
                ? "bg-white/15 text-white"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="text-sm font-medium text-white">{t.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">{t.description}</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-white/35">
              <span>⏱</span>
              <span>{t.kind === "bugbot" ? "GitHub" : "Schedule"}</span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => addTemplate(t.id)}
                className="mt-3 rounded border border-white/20 px-3 py-1 text-[10px] text-white/80 hover:bg-white/5"
              >
                Add
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
