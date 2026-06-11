"use client";

import { useState } from "react";
import { GlobalSearch } from "@/components/sai/global-search";
import { MemoryView } from "@/components/sai/memory-view";
import type {
  CompanyMemory,
  Decision,
  Document,
  MemoryType,
  Project,
  Release,
  WorkflowAgentMemory,
} from "@/lib/sai/types";

const tabs = [
  "Company",
  "Projects",
  "Agents",
  "Customers",
  "Meetings",
  "Research",
  "Decisions",
  "Documents",
  "Releases",
  "Incidents",
  "Processes",
] as const;

type Tab = (typeof tabs)[number];

type Props = {
  initialMemories: CompanyMemory[];
  typeCounts: Record<MemoryType, number>;
  projects: Project[];
  projectMemories: { id: string; title: string; summary: string; memoryType: string; createdAt: string }[];
  agentMemories: WorkflowAgentMemory[];
  documents: Document[];
  decisions: Decision[];
  releases: Release[];
  isAdmin: boolean;
  supabaseConfigured: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function KnowledgeCenterView(props: Props) {
  const [tab, setTab] = useState<Tab>("Company");

  const filteredMemories =
    tab === "Customers"
      ? props.initialMemories.filter((m) => m.type === "customer")
      : tab === "Meetings"
        ? props.initialMemories.filter((m) => m.type === "meeting")
        : tab === "Research"
          ? props.initialMemories.filter((m) => m.type === "research")
          : tab === "Incidents"
            ? props.initialMemories.filter((m) => m.type === "incident")
            : tab === "Processes"
              ? props.initialMemories.filter((m) => m.type === "process")
              : props.initialMemories;

  return (
    <div className="space-y-6">
      <GlobalSearch />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              tab === t
                ? "border-purple-400/30 bg-purple-500/15 text-purple-200"
                : "border-white/10 text-white/45 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Company" && (
        <MemoryView
          initialMemories={props.initialMemories}
          typeCounts={props.typeCounts}
          projects={props.projects}
          isAdmin={props.isAdmin}
          supabaseConfigured={props.supabaseConfigured}
        />
      )}

      {tab === "Projects" && (
        <KnowledgeList
          empty="No project knowledge captured yet."
          items={props.projectMemories.map((m) => ({
            id: m.id,
            title: m.title,
            body: m.summary,
            meta: m.memoryType,
            date: m.createdAt,
          }))}
        />
      )}

      {tab === "Agents" && (
        <KnowledgeList
          empty="No agent memories yet."
          items={props.agentMemories.map((m) => ({
            id: m.id,
            title: `${m.agentName ?? "Agent"}: ${m.title}`,
            body: m.content,
            meta: m.memoryType,
            date: m.createdAt,
          }))}
        />
      )}

      {(tab === "Customers" || tab === "Meetings" || tab === "Research" || tab === "Incidents" || tab === "Processes") && (
        <KnowledgeList
          empty={`No ${tab.toLowerCase()} knowledge yet.`}
          items={filteredMemories.map((m) => ({
            id: m.id,
            title: m.title,
            body: m.content,
            meta: m.type,
            date: m.createdAt,
          }))}
        />
      )}

      {tab === "Decisions" && (
        <KnowledgeList
          empty="No decisions recorded yet."
          items={props.decisions.map((d) => ({
            id: d.id,
            title: d.title,
            body: `${d.decision}\n\nRationale: ${d.rationale}`,
            meta: d.createdBy,
            date: d.createdAt,
          }))}
        />
      )}

      {tab === "Documents" && (
        <KnowledgeList
          empty="No documents generated yet."
          items={props.documents.map((d) => ({
            id: d.id,
            title: d.title,
            body: d.content.slice(0, 300),
            meta: d.type,
            date: d.createdAt,
          }))}
        />
      )}

      {tab === "Releases" && (
        <KnowledgeList
          empty="No releases recorded yet."
          items={props.releases.map((r) => ({
            id: r.id,
            title: `${r.projectName ?? ""} ${r.version}`.trim(),
            body: r.description,
            meta: r.status,
            date: r.releaseDate ?? r.createdAt,
          }))}
        />
      )}
    </div>
  );
}

function KnowledgeList({
  items,
  empty,
}: {
  items: { id: string; title: string; body: string; meta: string; date: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-white/10 px-4 py-8 text-center text-sm text-white/40">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="enterprise-glass rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/40">
              {item.meta}
            </span>
            <span className="text-[10px] text-white/35">{formatDate(item.date)}</span>
          </div>
          <h3 className="mt-2 text-sm font-medium text-white">{item.title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-white/55">{item.body}</p>
        </article>
      ))}
    </div>
  );
}
